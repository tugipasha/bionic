import { SITE_LANGUAGES, type SupportedLanguage } from "./i18n";

/** Yapay zekâ istemlerinde kullanılan İngilizce dil adları. */
export const ENGLISH_NAMES: Record<string, string> = {
  tr: "Turkish",
  en: "English",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  ar: "Arabic",
  zh: "Simplified Chinese",
  ja: "Japanese",
  ko: "Korean",
  nl: "Dutch",
  pl: "Polish",
  sv: "Swedish",
  no: "Norwegian",
  da: "Danish",
  fi: "Finnish",
  el: "Greek",
  hi: "Hindi",
  id: "Indonesian",
  uk: "Ukrainian",
  ro: "Romanian",
  cs: "Czech",
  hu: "Hungarian",
  vi: "Vietnamese",
  th: "Thai",
  he: "Hebrew",
  fa: "Persian (Farsi)",
  az: "Azerbaijani",
};

/** Dil kodunu, Türkçe adı veya yerel adı ("İngilizce", "English", "en") dil kaydına çevirir. */
export function resolveLanguage(input: string | undefined | null): SupportedLanguage | undefined {
  if (!input) return undefined;
  const v = input.trim().toLowerCase();
  return SITE_LANGUAGES.find(
    (l) =>
      l.code === v ||
      l.iso.toLowerCase() === v ||
      l.name.toLowerCase() === v ||
      l.nativeName.toLowerCase() === v ||
      (ENGLISH_NAMES[l.code] ?? "").toLowerCase() === v,
  );
}

const encoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
function byteLen(s: string): number {
  return encoder ? encoder.encode(s).length : s.length * 3;
}

/** Bir satırı sınırı aşmayacak şekilde cümle/kelime sınırlarından böler. */
function splitLine(line: string, maxBytes: number): string[] {
  if (byteLen(line) <= maxBytes) return [line];
  const sentences = line.split(/(?<=[.!?…。！？؟])\s+/u);
  const out: string[] = [];
  let cur = "";
  const push = () => {
    if (cur) out.push(cur);
    cur = "";
  };
  for (const sentence of sentences) {
    const candidate = cur ? `${cur} ${sentence}` : sentence;
    if (byteLen(candidate) <= maxBytes) {
      cur = candidate;
      continue;
    }
    push();
    if (byteLen(sentence) <= maxBytes) {
      cur = sentence;
      continue;
    }
    // Tek cümle bile uzun: kelime kelime böl, boşluksuz diller için karakter karakter.
    const parts = sentence.includes(" ") ? sentence.split(" ") : Array.from(sentence);
    const joiner = sentence.includes(" ") ? " " : "";
    for (const part of parts) {
      const c = cur ? `${cur}${joiner}${part}` : part;
      if (byteLen(c) <= maxBytes) cur = c;
      else {
        push();
        cur = part;
      }
    }
  }
  push();
  return out;
}

export interface Segment {
  text: string;
  /** false ise (boş satır/ayraç) çevrilmeden olduğu gibi korunur */
  translate: boolean;
}

/** Metni satır yapısını koruyarak çevrilebilir parçalara ayırır. */
export function segmentText(text: string, maxBytes: number): Segment[] {
  const segments: Segment[] = [];
  for (const piece of text.split(/(\r?\n)/)) {
    if (piece === "") continue;
    if (/^\r?\n$/.test(piece) || !piece.trim()) {
      segments.push({ text: piece, translate: false });
      continue;
    }
    const lead = piece.match(/^\s*/)?.[0] ?? "";
    const trail = piece.match(/\s*$/)?.[0] ?? "";
    const core = piece.trim();
    if (lead) segments.push({ text: lead, translate: false });
    const chunks = splitLine(core, maxBytes);
    // Boşluksuz diller (Çince, Japonca, Tayca...) parçalar arasında boşluk almamalı
    const separator = /\s/.test(core) ? " " : "";
    chunks.forEach((chunk, i) => {
      segments.push({ text: chunk, translate: true });
      if (separator && i < chunks.length - 1) segments.push({ text: separator, translate: false });
    });
    if (trail) segments.push({ text: trail, translate: false });
  }
  return segments;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

async function runPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i] as T, i);
    }
  });
  await Promise.all(runners);
  return results;
}

async function myMemoryChunk(
  chunk: string,
  srcIso: string,
  tgtIso: string,
  signal?: AbortSignal,
): Promise<string> {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", chunk);
  url.searchParams.set("langpair", `${srcIso}|${tgtIso}`);
  const res = await fetch(url.toString(), signal ? { signal } : undefined);
  if (!res.ok) throw new Error(`MyMemory ${res.status}`);
  const data = (await res.json()) as {
    responseStatus?: number | string;
    responseDetails?: string;
    responseData?: { translatedText?: string };
    matches?: Array<{ translation?: string; quality?: number | string; segment?: string }>;
  };
  const status = Number(data.responseStatus ?? 200);
  if (status !== 200) throw new Error(data.responseDetails || `MyMemory status ${status}`);

  let translated = data.responseData?.translatedText ?? "";
  if (/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID LANGUAGE PAIR/i.test(translated)) {
    throw new Error(translated);
  }
  if (!translated) {
    const best = [...(data.matches ?? [])].sort(
      (a, b) => Number(b.quality ?? 0) - Number(a.quality ?? 0),
    )[0];
    translated = best?.translation ?? "";
  }
  if (!translated) throw new Error("Boş çeviri yanıtı");
  return decodeEntities(translated);
}

/**
 * MyMemory ile uzun metinleri güvenle çevirir (istek başına ~500 bayt sınırı nedeniyle
 * parçalar, satır yapısını korur).
 */
export async function translateWithMyMemory(
  text: string,
  srcIso: string,
  tgtIso: string,
  signal?: AbortSignal,
): Promise<string> {
  const segments = segmentText(text, 450);
  const todo = segments.filter((s) => s.translate);
  const translated = await runPool(todo, 3, (s) => myMemoryChunk(s.text, srcIso, tgtIso, signal));
  let k = 0;
  return segments.map((s) => (s.translate ? (translated[k++] ?? s.text) : s.text)).join("");
}
