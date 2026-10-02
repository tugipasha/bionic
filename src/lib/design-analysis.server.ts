import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
} from "./ai-run-id.server";

const requestSchema = z.object({
  dataUrl: z
    .string()
    .max(12_000_000)
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/),
  width: z.number().int().positive().max(12_000),
  height: z.number().int().positive().max(12_000),
});

const viewportSchema = z.object({
  viewport: z.string(),
  aspectRatio: z.string(),
  imageScale: z.number(),
  focusX: z.number(),
  focusY: z.number(),
  titleSizeVw: z.number(),
  titleTopPercent: z.number(),
  shadowOpacity: z.number(),
  shadowBlurRem: z.number(),
  note: z.string(),
});

const analysisSchema = z.object({
  summary: z.string(),
  visualFocus: z.string(),
  contrastNote: z.string(),
  recommendations: z.array(viewportSchema),
});

function safeError(status: number, fallback: string) {
  if (status === 402) return "AI kullanım kredisi yetersiz. Çalışma alanı faturalandırma ayarlarını kontrol edin.";
  if (status === 429) return "Analiz servisi şu anda yoğun. Lütfen biraz sonra tekrar deneyin.";
  if (status === 401) return "AI analizi yapılandırılamadı.";
  return fallback;
}

export async function analyzeDesignRequest(request: Request) {
  let input: z.infer<typeof requestSchema>;
  try {
    input = requestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Geçerli bir JPG, PNG veya WebP görseli yükleyin." }, { status: 400 });
  }

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return Response.json({ error: "AI analizi yapılandırılamadı." }, { status: 500 });
  }

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

  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      output: Output.object({ schema: analysisSchema }),
      abortSignal: request.signal,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Bu ${input.width}×${input.height} görseli tam ekran bir ana sayfa arka planı olarak analiz et. Görseldeki ana odağı, güvenli metin alanlarını ve okunabilirliği belirle. Tam olarak üç öneri ver: 16:9 masaüstü, 4:3 tablet ve 9:16 mobil. imageScale değerini 1-2.2, focusX/focusY değerlerini 0-100, titleSizeVw değerini 5-18, titleTopPercent değerini 25-70, shadowOpacity değerini 0-0.7 ve shadowBlurRem değerini 0.5-4 aralığında tut. Kısa ve uygulanabilir Türkçe açıklamalar yaz.`,
            },
            { type: "image", image: new URL(input.dataUrl) },
          ],
        },
      ],
    });

    const output = await result.output;
    const runId = runIdFetch.getRunId();
    return Response.json(
      output,
      runId ? { headers: { "X-Lovable-AIG-Run-ID": runId } } : {},
    );
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return Response.json({ error: "Görsel için tutarlı öneriler üretilemedi. Başka bir görsel deneyin." }, { status: 422 });
    }
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : "Analiz tamamlanamadı.";
    return Response.json({ error: safeError(status, message) }, { status });
  }
}
