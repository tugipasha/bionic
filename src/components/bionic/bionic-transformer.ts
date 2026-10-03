/**
 * Bionic Reading Transformer
 * Transforms standard text into bionic reading format by highlighting
 * the initial fixation points of each word to facilitate faster cognitive processing.
 */

export interface BionicOptions {
  fixation: number; // 1 to 5 (or 0.2 to 0.8)
  saccade: number; // 1: every word, 2: every 2nd word, 3: every 3rd word
  opacity: number; // opacity of non-bold letters
  boldWeight: string; // 'bold' | 'black' | 'semibold'
}

export const defaultBionicOptions: BionicOptions = {
  fixation: 3, // ~50%
  saccade: 1, // every word
  opacity: 0.85,
  boldWeight: "font-bold",
};

/**
 * Calculates how many letters should be bolded based on word length and fixation level.
 */
export function calculateFixationLength(wordLength: number, fixationLevel: number = 3): number {
  if (wordLength <= 0) return 0;
  if (wordLength === 1) return 1;
  if (wordLength === 2) return 1;
  if (wordLength === 3) return fixationLevel >= 3 ? 2 : 1;
  if (wordLength <= 5) {
    if (fixationLevel <= 2) return 2;
    if (fixationLevel <= 4) return 3;
    return 4;
  }

  // For longer words:
  const ratio = 0.25 + (fixationLevel / 5) * 0.35; // 0.32 to 0.60
  return Math.min(wordLength - 1, Math.max(1, Math.round(wordLength * ratio)));
}

/**
 * Transforms a single word into bionic format HTML or token structure.
 */
export function transformWord(
  word: string,
  fixationLevel: number = 3,
): { bold: string; rest: string } {
  // Baştaki noktalama + çekirdek kelime + sondaki noktalama (kelime içi noktalama serbest)
  const leading = word.match(/^[^\p{L}\p{N}]*/u)?.[0] ?? "";
  const afterLeading = word.slice(leading.length);
  const trailing = afterLeading.match(/[^\p{L}\p{N}]*$/u)?.[0] ?? "";
  const coreWord = afterLeading.slice(0, afterLeading.length - trailing.length);

  // Saf noktalama/sembol
  if (!coreWord) return { bold: "", rest: word };

  const chars = Array.from(coreWord); // vurgu Unicode karakter (emoji/CJK) sınırında kalsın
  const fixLen = calculateFixationLength(chars.length, fixationLevel);
  const boldPart = leading + chars.slice(0, fixLen).join("");
  const restPart = chars.slice(fixLen).join("") + trailing;

  return { bold: boldPart, rest: restPart };
}

/**
 * Converts a block of plain text to HTML with <b> tags for bionic reading.
 */
export function convertToBionicHtml(text: string, options: Partial<BionicOptions> = {}): string {
  if (!text) return "";
  const opts = { ...defaultBionicOptions, ...options };

  const paragraphs = text.split(/\r?\n/);

  return paragraphs
    .map((paragraph) => {
      if (!paragraph.trim()) return "<p><br/></p>";

      const tokens = paragraph.split(/(\s+)/);
      let wordCount = 0;

      const processedTokens = tokens.map((token) => {
        // If whitespace
        if (/^\s+$/.test(token)) return token;

        wordCount++;
        // Check saccade
        if (opts.saccade > 1 && wordCount % opts.saccade !== 1) {
          return escapeHtml(token);
        }

        const { bold, rest } = transformWord(token, opts.fixation);
        if (!bold) return escapeHtml(rest);
        return `<b>${escapeHtml(bold)}</b>${escapeHtml(rest)}`;
      });

      return `<p>${processedTokens.join("")}</p>`;
    })
    .join("");
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface TextStats {
  words: number;
  chars: number;
  readingTimeNormalMin: number;
  readingTimeBionicMin: number;
  savedSeconds: number;
}

export function calculateTextStats(text: string): TextStats {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      words: 0,
      chars: 0,
      readingTimeNormalMin: 0,
      readingTimeBionicMin: 0,
      savedSeconds: 0,
    };
  }

  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const chars = trimmed.length;

  // Normal reading speed: ~200 WPM
  // Bionic reading speed: ~320 WPM (+60% speed increase)
  const normalSeconds = (words / 200) * 60;
  const bionicSeconds = (words / 320) * 60;
  const savedSeconds = Math.max(0, Math.round(normalSeconds - bionicSeconds));

  return {
    words,
    chars,
    readingTimeNormalMin: +(normalSeconds / 60).toFixed(1),
    readingTimeBionicMin: +(bionicSeconds / 60).toFixed(1),
    savedSeconds,
  };
}

export const SAMPLE_TEXTS = [
  {
    id: "science",
    title: "Biyonik Okuma ve Beyin",
    category: "Bilim & Nöroloji",
    text: `Biyonik Okuma (Bionic Reading), insan beyninin kelimeleri tek tek harfler yerine bütünüyle algılama yeteneğini kullanan devrim niteliğinde bir okuma tekniğidir.

Gözlerimiz bir metni okurken her harfe odaklanmak zorunda kaldığında yorulur. Ancak beynimiz, kelimenin ilk birkaç harfini gördüğünde geri kalanını hafızasındaki kalıplarla neredeyse anında tamamlar.

Biyonik okuma, kelimelerin başlangıç harflerini belirginleştirerek gözlerin metin üzerinde zahmetsizce kaymasını ve odaklanma noktalarına daha hızlı kilitlenmesini sağlar. Bu sayede okuma hızınız %40 ile %70 arasında artarken, metni anlama ve akılda tutma kapasiteniz de en üst seviyeye çıkar.`,
  },
  {
    id: "literature",
    title: "Zaman ve Evren",
    category: "Felsefe & Evren",
    text: `Karanlık gökyüzünde parıldayan yıldızlar, milyarlarca yıl öncesinden bize ulaşan ışık elçileridir. Onlara her baktığımızda geçmişe tanıklık eder, zamanın akışında ne kadar küçük ama bir o kadar da anlamlı bir yer kapladığımızı hissederiz.

Düşüncelerimiz de tıpkı ışık dalgaları gibi zihnimizin derinliklerinde hızla seyahat eder. Okumak, başka bir zihnin evrenine açılan en berrak kapıdır. Kelimeler birleştikçe düşünceler kanatlanır, sınırlar silinir ve insan kendini sonsuz olasılıklar denizinde bulur.`,
  },
  {
    id: "tech",
    title: "Yapay Zeka ve Gelecek",
    category: "Teknoloji",
    text: `Günümüz dünyasında bilgiye ulaşmak saniyeler sürüyor, fakat asıl mesele bu devasa bilgi okyanusunu ne kadar hızlı ve verimli işleyebildiğimizdir. 

Yapay zeka sistemleri metinleri, verileri ve düşünceleri saniyeler içinde sentezlerken; insanın bilişsel hızını artıracak biyonik araçlar, öğrenme sürecini kökten değiştirmektedir. Geleceğin öğrenme modeli, insan zihni ile akıllı arayüzlerin kusursuz uyumu üzerine inşa edilecektir.`,
  },
];
