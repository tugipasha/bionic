/**
 * Groq için ortak istemci: güncel model keşfi, sıralı yedekleme, zaman aşımı,
 * düşünme bloğu / emoji temizliği ve dayanıklı JSON ayrıştırma.
 *
 * Groq modelleri düzenli olarak emekliye ayırır (ör. llama-3.3-70b-versatile ve
 * llama-3.1-8b-instant 16.08.2026'da kapandı). Bu yüzden model listesi sabit
 * kodlanmak yerine /models uç noktasından okunur, sabit liste yalnızca yedektir.
 */

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type GroqTask = "chat" | "write" | "json" | "translate" | "vision";

/** Tercih sırası (ilk eşleşen önce denenir). Yeni modeller listenin sonuna eklenir. */
const PREFERRED: RegExp[] = [
  /^openai\/gpt-oss-120b$/,
  /^qwen\/qwen3\.6/,
  /^openai\/gpt-oss-20b$/,
  /^llama-3\.3-70b/,
  /^llama-3\.1-8b/,
];

/** Sohbet için uygun olmayan modeller. */
const EXCLUDED = /whisper|tts|orpheus|playai|guard|safeguard|embed|compound|distil-whisper|rerank/i;

/** Görsel girdi destekleyenler. */
const VISION = /qwen3\.6|scout|maverick|vision|llava|pixtral/i;

const FALLBACK_TEXT_MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.6-27b", "openai/gpt-oss-20b"];
const FALLBACK_VISION_MODELS = ["qwen/qwen3.6-27b"];

const MODEL_CACHE_MS = 10 * 60 * 1000;
let modelCache: { at: number; ids: string[] } | null = null;

async function listModels(apiKey: string): Promise<string[]> {
  if (modelCache && Date.now() - modelCache.at < MODEL_CACHE_MS) return modelCache.ids;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = (await res.json()) as { data?: Array<{ id: string; active?: boolean }> };
      const ids = (data.data ?? [])
        .filter((m) => m.active !== false)
        .map((m) => m.id)
        .filter((id) => !EXCLUDED.test(id));
      if (ids.length) {
        modelCache = { at: Date.now(), ids };
        return ids;
      }
    }
  } catch (e) {
    console.warn("Groq model listesi alınamadı:", e);
  }
  return [];
}

export async function pickModels(
  apiKey: string,
  task: GroqTask,
  preferred?: string,
): Promise<string[]> {
  const live = await listModels(apiKey);
  const wantVision = task === "vision";
  const pool = live.length ? live : wantVision ? FALLBACK_VISION_MODELS : FALLBACK_TEXT_MODELS;
  const usable = pool.filter((id) => (wantVision ? VISION.test(id) : true));

  const ranked: string[] = [];
  for (const re of PREFERRED)
    for (const id of usable) if (re.test(id) && !ranked.includes(id)) ranked.push(id);
  for (const id of usable) if (!ranked.includes(id)) ranked.push(id);

  const list = preferred && usable.includes(preferred) ? [preferred, ...ranked] : ranked;
  const unique = [...new Set(list)];
  // En fazla 3 model dene: sonsuz yedekleme gecikme yaratır.
  return (
    unique.length ? unique : wantVision ? FALLBACK_VISION_MODELS : FALLBACK_TEXT_MODELS
  ).slice(0, 3);
}

/** Model ailesine göre hız/kalite ayarları. Bilinmeyen alanlar 400 verirse bir sonraki denemede çıkarılır. */
function familyParams(model: string, task: GroqTask): Record<string, unknown> {
  if (/gpt-oss/i.test(model)) {
    return {
      reasoning_effort: task === "write" || task === "json" ? "medium" : "low",
      include_reasoning: false,
    };
  }
  if (/qwen3/i.test(model)) return { reasoning_effort: "none" };
  return {};
}

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
  let lastError = "Bilinmeyen hata";
  let lastStatus: number | undefined;

  for (const model of models) {
    // 1. deneme: tüm ayarlar; 2. deneme: modele özgü ek alanlar olmadan (400 durumunda)
    for (const lean of [false, true]) {
      try {
        const body: Record<string, unknown> = {
          model,
          messages: opts.messages,
          temperature: opts.temperature ?? 0.6,
          // gpt-oss gibi modellerde düşünme tokenları da bu sınıra dahildir.
          max_completion_tokens:
            (opts.maxTokens ?? 1200) + (/gpt-oss|qwen3/i.test(model) ? 1500 : 0),
        };
        if (!lean) Object.assign(body, familyParams(model, opts.task));
        if (opts.json && !lean) body["response_format"] = { type: "json_object" };

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.apiKey}` },
          body: JSON.stringify(body),
          signal: opts.signal
            ? AbortSignal.any([opts.signal, AbortSignal.timeout(opts.timeoutMs ?? 40_000)])
            : AbortSignal.timeout(opts.timeoutMs ?? 40_000),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const text = stripThinking(data.choices?.[0]?.message?.content ?? "");
          if (text) return { text, model };
          lastError = `${model}: boş yanıt`;
          break; // boş yanıtta aynı modeli tekrar deneme
        }

        lastStatus = res.status;
        const detail = (await res.text()).slice(0, 300);
        lastError = `${model}: HTTP ${res.status} ${detail}`;
        // 400 ise ek alanlar sorun olabilir: sade istekle bir kez daha dene.
        if (res.status === 400 && !lean) continue;
        break;
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
