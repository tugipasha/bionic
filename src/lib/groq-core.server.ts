/**
 * Yapay zekâ için ortak istemci (Google Gemini).
 *
 * NOT: Dosya, fonksiyon ve ortam değişkeni adları (groqChat, GROQ_API_KEY, ...) geriye dönük
 * uyumluluk için bilerek korunmuştur. GROQ_API_KEY içine artık Google Gemini API anahtarı
 * girilir (https://aistudio.google.com/apikey). Diğer dosyalar hiçbir değişiklik gerektirmez.
 *
 * Özellikler: güncel model keşfi (/models), sıralı yedekleme, zaman aşımı, düşünme bloğu /
 * emoji temizliği ve dayanıklı JSON ayrıştırma. OpenAI biçimli mesajlar (metin + image_url)
 * Gemini biçimine burada çevrilir.
 *
 * Gemini 2.5 serisi 16 Ekim 2026'da kapanıyor; bu yüzden Gemini 3.x kullanılır. İsteğe bağlı
 * olarak GEMINI_MODEL ortam değişkeniyle belirli bir model zorlanabilir (ör. gemini-3.5-flash).
 */

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type GroqTask = "chat" | "write" | "json" | "translate" | "vision";

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";

/** Tercih sırası (ilk eşleşen önce denenir). */
const PREFERRED: RegExp[] = [
  /^gemini-3\.5-flash$/,
  /^gemini-3\.5-flash-lite$/,
  /^gemini-3\.1-flash-lite$/,
  /^gemini-3\.\d+-flash$/,
  /^gemini-3\.\d+-flash-lite$/,
];

/** Metin sohbeti için uygun olmayan veya kapanmış / kararsız modeller. */
const EXCLUDED =
  /image|live|tts|audio|embed|omni|robotics|lyria|veo|imagen|computer-use|cyber|native|preview|exp|aqa|learnlm|gemma|pro|^gemini-[12]\./i;

/** Liste alınamazsa kullanılacak sabit yedek (hepsi görsel girdiyi de destekler). */
const FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];

const MODEL_CACHE_MS = 10 * 60 * 1000;
let modelCache: { at: number; ids: string[] } | null = null;

async function listModels(apiKey: string): Promise<string[]> {
  if (modelCache && Date.now() - modelCache.at < MODEL_CACHE_MS) return modelCache.ids;
  try {
    const res = await fetch(`${API_ROOT}/models?pageSize=200`, {
      headers: { "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
      };
      const ids = (data.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => m.name.replace(/^models\//, ""))
        .filter((id) => id.startsWith("gemini-") && !EXCLUDED.test(id));
      if (ids.length) {
        modelCache = { at: Date.now(), ids };
        return ids;
      }
    }
  } catch (e) {
    console.warn("Gemini model listesi alınamadı:", e);
  }
  return [];
}

export async function pickModels(
  apiKey: string,
  _task: GroqTask,
  preferred?: string,
): Promise<string[]> {
  const live = await listModels(apiKey);
  const usable = live.length ? live : FALLBACK_MODELS;

  const ranked: string[] = [];
  for (const re of PREFERRED)
    for (const id of usable) if (re.test(id) && !ranked.includes(id)) ranked.push(id);
  for (const id of usable) if (!ranked.includes(id)) ranked.push(id);

  const forced = process.env["GEMINI_MODEL"]?.trim().replace(/^models\//, "");
  const front = [forced, preferred && usable.includes(preferred) ? preferred : undefined].filter(
    (m): m is string => Boolean(m),
  );
  const unique = [...new Set([...front, ...ranked])];
  // En fazla 3 model dene: sonsuz yedekleme gecikme yaratır.
  return (unique.length ? unique : FALLBACK_MODELS).slice(0, 3);
}

/** OpenAI biçimli mesajları Gemini `systemInstruction` + `contents` yapısına çevirir. */
type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

function toGeminiParts(content: unknown): GeminiPart[] {
  if (typeof content === "string") return [{ text: content }];
  if (!Array.isArray(content)) return [{ text: String(content ?? "") }];
  const parts: GeminiPart[] = [];
  for (const item of content as Array<Record<string, unknown>>) {
    if (item?.["type"] === "text" && typeof item["text"] === "string") {
      parts.push({ text: item["text"] });
    } else if (item?.["type"] === "image_url") {
      const raw = item["image_url"] as { url?: string } | string | undefined;
      const url = typeof raw === "string" ? raw : raw?.url;
      const m = url?.match(/^data:([^;,]+);base64,(.+)$/s);
      if (m?.[1] && m[2]) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
    }
  }
  return parts.length ? parts : [{ text: "" }];
}

function toGeminiPayload(messages: GroqChatOptions["messages"]) {
  const system: string[] = [];
  const contents: Array<{ role: "user" | "model"; parts: GeminiPart[] }> = [];
  for (const m of messages) {
    if (m.role === "system") {
      system.push(typeof m.content === "string" ? m.content : "");
      continue;
    }
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: toGeminiParts(m.content),
    });
  }
  return {
    systemInstruction: system.length ? { parts: [{ text: system.join("\n\n") }] } : undefined,
    contents,
  };
}

/** Gemini'nin sıkı güvenlik filtresi çeviri/yazı işlerinde gereksiz engel çıkarmasın. */
const SAFETY_SETTINGS = [
  "HARM_CATEGORY_HARASSMENT",
  "HARM_CATEGORY_HATE_SPEECH",
  "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  "HARM_CATEGORY_DANGEROUS_CONTENT",
].map((category) => ({ category, threshold: "BLOCK_ONLY_HIGH" }));

const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]|\u{FE0F}|\u{200D}|\u{20E3}/gu;

/** Yapay zekâ çıktısından düşünme bloklarını ve emojileri temizler. */
export function stripThinking(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^[\s\S]*?<\/think>/i, "")
    .trim();
}

export function stripEmoji(text: string): string {
  return text
    .replace(EMOJI_RE, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n");
}

/** Sohbet/yazı çıktısı için: markdown işaretlerini kaldırır, paragraf ve satır yapısını korur. */
export function toPlainText(text: string): string {
  return stripEmoji(stripThinking(text))
    .replace(/```[a-z]*\n?([\s\S]*?)```/gi, "$1")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, "$1$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[*•]\s+/gm, "- ")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Metindeki ilk dengeli JSON nesnesini bulup ayrıştırır (kod çiti / ön yazı toleranslı). */
export function extractJson<T = unknown>(raw: string): T | null {
  const text = stripThinking(raw)
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "");
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1)) as T;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export interface GroqChatOptions {
  apiKey: string;
  messages: Array<GroqMessage | { role: "user"; content: unknown }>;
  task: GroqTask;
  temperature?: number;
  /** Üretilecek en fazla token (düşünme tokenları dahil değildir; pay otomatik eklenir). */
  maxTokens?: number;
  json?: boolean;
  /** Gemini düşünme seviyesi (düşük = daha hızlı). Varsayılan: "low". */
  reasoningEffort?: "low" | "medium" | "high";
  preferredModel?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface GroqChatResult {
  text: string;
  model: string;
}

export class GroqError extends Error {
  readonly status: number | undefined;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export async function groqChat(opts: GroqChatOptions): Promise<GroqChatResult> {
  const models = await pickModels(opts.apiKey, opts.task, opts.preferredModel);
  const { systemInstruction, contents } = toGeminiPayload(opts.messages);
  let lastError = "Bilinmeyen hata";
  let lastStatus: number | undefined;

  for (const model of models) {
    // 1. deneme: tüm ayarlar; 2. deneme: modele özgü ek alanlar olmadan (400 durumunda)
    for (const lean of [false, true]) {
      try {
        const generationConfig: Record<string, unknown> = {
          temperature: opts.temperature ?? 0.6,
          // Gemini'de düşünme tokenları da bu sınıra dahildir; pay bırakılır.
          maxOutputTokens: (opts.maxTokens ?? 1200) + 1500,
        };
        const body: Record<string, unknown> = { contents, generationConfig };
        if (systemInstruction) body["systemInstruction"] = systemInstruction;
        if (!lean) {
          generationConfig["thinkingConfig"] = { thinkingLevel: opts.reasoningEffort ?? "low" };
          if (opts.json) generationConfig["responseMimeType"] = "application/json";
          body["safetySettings"] = SAFETY_SETTINGS;
        }

        const timeout = AbortSignal.timeout(opts.timeoutMs ?? 40_000);
        const res = await fetch(`${API_ROOT}/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": opts.apiKey },
          body: JSON.stringify(body),
          signal: opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout,
        });

        if (res.ok) {
          const data = (await res.json()) as {
            candidates?: Array<{
              content?: { parts?: Array<{ text?: string; thought?: boolean }> };
              finishReason?: string;
            }>;
            promptFeedback?: { blockReason?: string };
          };
          const parts = data.candidates?.[0]?.content?.parts ?? [];
          const text = stripThinking(
            parts
              .filter((p) => !p.thought)
              .map((p) => p.text ?? "")
              .join(""),
          );
          if (text) return { text, model };
          const why = data.promptFeedback?.blockReason ?? data.candidates?.[0]?.finishReason ?? "?";
          lastError = `${model}: boş yanıt (${why})`;
          break; // boş yanıtta aynı modeli tekrar deneme
        }

        lastStatus = res.status;
        const detail = (await res.text()).slice(0, 300);
        lastError = `${model}: HTTP ${res.status} ${detail}`;
        // 400 ise ek alanlar sorun olabilir: sade istekle bir kez daha dene.
        if (res.status === 400 && !lean) continue;
        break; // 404 (kapanmış model), 429 (kota) vb.: sıradaki modele geç
      } catch (e) {
        lastError = `${model}: ${e instanceof Error ? e.message : String(e)}`;
        if (opts.signal?.aborted) throw new GroqError("İstek iptal edildi.");
        break;
      }
    }
  }
  throw new GroqError(lastError, lastStatus);
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** İstek metni için basit sunucu tarafı boyut sınırları. */
export const LIMITS = {
  chatMessageChars: 12_000,
  chatTurns: 12,
  chatTotalChars: 24_000,
} as const;
