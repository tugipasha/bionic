import { createFileRoute } from "@tanstack/react-router";

import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";

import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
} from "@/lib/ai-run-id.server";

const LABEL_TO_ISO = {
  Türkçe: "tr",
  İngilizce: "en",
  Almanca: "de",
  Fransızca: "fr",
  İspanyolca: "es",
  Arapça: "ar",
  Rusça: "ru",
} as const;

const LABEL_TO_FULL = {
  Türkçe: "Türkçe",
  İngilizce: "İngilizce",
  Almanca: "Almanca",
  Fransızca: "Fransızca",
  İspanyolca: "İspanyolca",
  Arapça: "Arapça",
  Rusça: "Rusça",
} as const;

const requestSchema = z.object({
  text: z.string().min(1).max(8000),
  source_label: z.string(),
  target_label: z.string(),
});

function safeError(status: number, fallback: string) {
  if (status === 402) return "AI kullanım kredisi yetersiz. Lütfen daha sonra tekrar deneyin.";
  if (status === 429) return "Çeviri servisi şu anda yoğun. Lütfen biraz sonra tekrar deneyin.";
  if (status === 401) return "Çeviri servisi yapılandırılamadı.";
  return fallback;
}

async function translateWithLLM(
  text: string,
  sourceLabel: string,
  targetLabel: string,
  runIdFetch: ReturnType<typeof createLovableAiGatewayRunIdFetch>,
  provider: ReturnType<typeof createOpenAI>,
  signal: AbortSignal,
): Promise<{ translation: string }> {
  const sourceFull = (LABEL_TO_FULL as Record<string, string>)[sourceLabel] ?? sourceLabel;
  const targetFull = (LABEL_TO_FULL as Record<string, string>)[targetLabel] ?? targetLabel;

  const systemPrompt = `Sen dünyaca ünlü, hedef dilin tüm nüanslarına ve kültürüne hakim, metin çevirmenisin. Kuralların:

1. ASLA KELİME KELİME ÇEVİRME — bağlamı, tonu ve niyeti koru.
2. Hedef dilin dilbilgisi, yazım ve noktalama kurallarına %100 uy.
3. Deyimler, söz kalıpları ve kültürel göndermeleri hedef dile DOĞAL TEKABÜLÜYLE çevir; yoksa anlamını bozmadan serbestçe uyarla.
4. Kaynak metindeki resmîlik, samimiyet, espri ya da vurguyu koru.
5. TEK SEÇENEK: SADECE çeviriyi döndür. Etiketten, açıklamadan, dipnottan KAÇIN. Başına "Çeviri:" vb. bir şey YAZMA.
6. Marka, özel ad, teknik terim ve kısaltmaları doğru koru; standart yerelleştirmeleri kullan.
7. Sayı, tarih, saat ve para birimlerini hedef dilin standart biçimine dönüştür.
8. Cümleleri, birden fazla cümleyi veya paragrafı doğal akışta birleştir; kelime sırasını hedef dile göre yeniden kur.
9. Kaynakta bir hata veya anlaşılmaz bir kısım varsa, çeviride bunu en doğal şekilde düzelt ve gizle; yorum yapma.
10. SADECE SONUCU VER — başka hiçbir şey.

Kaynak dil: ${sourceFull}
Hedef dil: ${targetFull}

Aşağıdaki metni, yukarıdaki kurallara uyarak MÜKEMMEL ve DOĞAL bir şekilde çevir SADECE çeviriyi yaz, başka hiçbir şey ekleme:
"""${text}"""`;

  const result = await streamText({
    model: provider.responses("openai/gpt-6-astra"),
    abortSignal: signal,
    providerOptions: {
      openai: {
        reasoningEffort: "low",
        store: false,
      },
    },
    messages: [
      {
        role: "user",
        content: systemPrompt,
      },
    ],
  });

  const parts: string[] = [];
  for await (const part of result.fullStream) {
    if (part.type === "text-delta" && typeof (part as any).text === "string") {
      parts.push((part as any).text);
    }
  }
  const raw = parts.join("") || (await result.text);
  return {
    translation: typeof raw === "string" ? raw.trim() : "",
  };
}

async function translateWithMyMemory(
  text: string,
  sourceLabel: string,
  targetLabel: string,
  signal: AbortSignal,
): Promise<{ translation: string }> {
  const src = (LABEL_TO_ISO as Record<string, string>)[sourceLabel] ?? "en";
  const tgt = (LABEL_TO_ISO as Record<string, string>)[targetLabel] ?? "tr";

  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `${src}|${tgt}`);

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`Çeviri servisi hatası: ${res.status}`);
  const data = (await res.json()) as {
    responseData?: { translatedText?: string };
    matches?: Array<{
      translation?: string;
      quality?: number | string;
      "created-by"?: string;
    }>;
  };

  const preferred = ["Public_Corpora", "MateCat", "MyMemory", "ModernMT"];
  const score = (m: NonNullable<typeof data.matches>[number]) => {
    const q = typeof m.quality === "string" ? parseFloat(m.quality) : Number(m.quality || 0);
    const by = m["created-by"] ?? "";
    const pref = preferred.findIndex((p) => by === p);
    return q + (pref >= 0 ? 50 - pref * 10 : 0);
  };
  const matchesSorted = [...(data.matches ?? [])].sort((a, b) => score(b) - score(a));
  const translation =
    matchesSorted[0]?.translation || data?.responseData?.translatedText || "";
  if (!translation || translation.length < 2) throw new Error("Çeviri cevabı boş.");
  return { translation: translation.trim() };
}

export const Route = createFileRoute("/api/translate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let input: z.infer<typeof requestSchema>;
        try {
          input = requestSchema.parse(await request.json());
        } catch {
          return Response.json(
            { error: "Geçersiz istek. Lütfen metin, kaynak ve hedef dil bilgilerini doğru gönderin." },
            { status: 400 },
          );
        }

        const normalizedSource = input.source_label.trim();
        const normalizedTarget = input.target_label.trim();

        if (normalizedSource === normalizedTarget) {
          return Response.json({ translation: input.text });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        let llmSuccess = false;
        let llmError: unknown = null;

        if (apiKey) {
          try {
            const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
            const provider = createOpenAI({
              baseURL: "https://ai.gateway.lovable.dev/v1",
              apiKey,
              headers: {
                "Lovable-API-Key": apiKey,
                "X-Lovable-AIG-SDK": "vercel-ai-sdk",
              },
              fetch: runIdFetch.fetch,
            });

            const result = await translateWithLLM(
              input.text,
              normalizedSource,
              normalizedTarget,
              runIdFetch,
              provider,
              request.signal,
            );
            if (result.translation) {
              llmSuccess = true;
              return Response.json(
                {
                  translation: result.translation,
                  engine: "llm",
                },
                runIdFetch.getRunId()
                  ? { headers: { "X-Lovable-AIG-Run-ID": runIdFetch.getRunId()! } }
                  : {},
              );
            }
          } catch (e) {
            llmError = e;
            // Fallback to MyMemory below
          }
        }

        try {
          const result = await translateWithMyMemory(
            input.text,
            normalizedSource,
            normalizedTarget,
            request.signal,
          );
          return Response.json({
            translation: result.translation,
            engine: llmError ? "mymemory-fallback" : "mymemory",
          });
        } catch (e) {
          const status =
            typeof llmError === "object" && llmError !== null && "statusCode" in llmError
              ? Number((llmError as { statusCode: unknown }).statusCode)
              : 500;
          const message =
            typeof e === "object" && e !== null && "message" in e
              ? String((e as { message: unknown }).message)
              : "Çeviri tamamlanamadı.";
          return Response.json(
            { error: safeError(status, message) },
            { status: status >= 400 && status < 600 ? status : 500 },
          );
        }
      },
    },
  },
});
