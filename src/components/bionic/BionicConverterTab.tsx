import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Trash2,
  Upload,
  BookOpen,
  Sliders,
  Type,
  AlignLeft,
  Share2,
  Zap,
  BookmarkPlus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  convertToBionicHtml,
  calculateTextStats,
  SAMPLE_TEXTS,
  defaultBionicOptions,
  type BionicOptions,
} from "./bionic-transformer";

interface BionicConverterTabProps {
  onSaveToLibrary?: (title: string, text: string) => void;
  onOpenSpeedReader?: (text: string) => void;
}

export function BionicConverterTab({
  onSaveToLibrary,
  onOpenSpeedReader,
}: BionicConverterTabProps) {
  const [sourceText, setSourceText] = useState<string>(SAMPLE_TEXTS[0]?.text || "");
  const [fixation, setFixation] = useState<number>(3);
  const [saccade, setSaccade] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(17); // px
  const [lineHeight, setLineHeight] = useState<number>(1.75);
  const [fontFamily, setFontFamily] = useState<string>("Outfit, sans-serif");
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [readingProgress, setReadingProgress] = useState<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved text from local storage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bionic_current_draft");
      if (saved) {
        setSourceText(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save draft to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem("bionic_current_draft", sourceText);
    } catch {
      // ignore
    }
  }, [sourceText]);

  const stats = calculateTextStats(sourceText);
  const bionicHtml = convertToBionicHtml(sourceText, {
    fixation,
    saccade,
  });

  const handleCopy = async (format: "html" | "text" = "html") => {
    if (!sourceText.trim()) {
      toast.error("Kopyalanacak metin bulunamadı.");
      return;
    }

    try {
      if (format === "html") {
        const blobHtml = new Blob([bionicHtml], { type: "text/html" });
        const blobText = new Blob([sourceText], { type: "text/plain" });
        const data = [new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText })];
        await navigator.clipboard.write(data);
      } else {
        await navigator.clipboard.writeText(sourceText);
      }
      setCopied(true);
      toast.success("Biyonik metin panoya kopyalandı!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      await navigator.clipboard.writeText(sourceText);
      setCopied(true);
      toast.success("Metin kopyalandı!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = (format: "html" | "txt" | "md") => {
    if (!sourceText.trim()) {
      toast.error("İndirilecek metin bulunamadı.");
      return;
    }

    let content = "";
    let mimeType = "text/plain";
    let extension = "txt";

    if (format === "html") {
      content = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>BionicText Çevirisi</title>
  <style>
    body { font-family: 'Outfit', sans-serif; line-height: 1.8; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #111; }
    b { font-weight: 700; color: #000; }
  </style>
</head>
<body>
  ${bionicHtml}
</body>
</html>`;
      mimeType = "text/html";
      extension = "html";
    } else if (format === "md") {
      content = sourceText;
      mimeType = "text/markdown";
      extension = "md";
    } else {
      content = sourceText;
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bionic-text-${Date.now()}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Dosya (${extension.toUpperCase()}) olarak indirildi.`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya boyutu 5 MB'dan küçük olmalıdır.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") {
        setSourceText(result);
        toast.success(`"${file.name}" başarıyla yüklendi.`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSpeak = () => {
    if (!("speechSynthesis" in window)) {
      toast.error("Tarayıcınız sesli okumayı desteklemiyor.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!sourceText.trim()) {
      toast.error("Okunacak metin yok.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sourceText);
    utterance.lang = "tr-TR";
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    toast.info("Sesli okuma başlatıldı.");
  };

  const handleSave = () => {
    if (!sourceText.trim()) {
      toast.error("Kaydedilecek metin bulunamadı.");
      return;
    }
    const lines = sourceText.trim().split("\n");
    const autoTitle = (lines[0] || "Yeni Biyonik Belge").slice(0, 40);

    if (onSaveToLibrary) {
      onSaveToLibrary(autoTitle, sourceText);
      toast.success("Belge kütüphanenize kaydedildi!");
    } else {
      try {
        const currentList = JSON.parse(localStorage.getItem("bionic_library") || "[]");
        currentList.unshift({
          id: Date.now().toString(),
          title: autoTitle,
          text: sourceText,
          createdAt: new Date().toISOString(),
          words: stats.words,
        });
        localStorage.setItem("bionic_library", JSON.stringify(currentList));
        toast.success("Belge kütüphanenize kaydedildi!");
      } catch {
        toast.error("Kaydedilemedi.");
      }
    }
  };

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Top Banner Stats / Quick Tools */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-foreground/15 bg-foreground/10 px-4 py-3 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 bg-foreground/10 px-3 py-1 text-xs font-medium text-foreground">
            <Zap className="size-3.5 text-amber-300" />
            Okuma Hızı: <strong>+%60 Daha Hızlı</strong>
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1 text-xs text-foreground/80">
            📊 {stats.words.toLocaleString()} kelime · {stats.chars.toLocaleString()} karakter
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1 text-xs text-foreground/80">
            ⏱️ Biyonik Süre: <strong>{stats.readingTimeBionicMin} dk</strong> (Normal:{" "}
            {stats.readingTimeNormalMin} dk)
          </span>

          {stats.savedSeconds > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
              ⚡ Kazanç: ~{stats.savedSeconds} sn
            </span>
          )}
        </div>

        {/* Quick Sample Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground/60 hidden md:inline">Örnek Yükle:</span>
          <div className="flex items-center gap-1">
            {SAMPLE_TEXTS.map((sample) => (
              <button
                key={sample.id}
                onClick={() => {
                  setSourceText(sample.text);
                  toast.info(`"${sample.title}" örneği yüklendi.`);
                }}
                className="rounded-lg border border-foreground/15 bg-foreground/5 px-2.5 py-1 text-xs font-light text-foreground/80 transition-colors hover:bg-foreground/15 hover:text-foreground"
              >
                {sample.category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Dual-Pane Workspace */}
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-2 gap-4 pb-4 min-h-[480px]">
        {/* Left Pane: Source Input */}
        <div className="flex flex-col rounded-3xl border border-foreground/20 bg-foreground/10 p-5 backdrop-blur-md shadow-2xl transition-all">
          <div className="mb-3 flex items-center justify-between border-b border-foreground/15 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-foreground/15 text-xs font-semibold">
                1
              </span>
              <h2 className="font-display text-lg font-normal tracking-wide text-foreground">
                Kaynak Metin
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.text"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Dosya Yükle (.txt, .md)"
                className="flex items-center gap-1.5 rounded-xl border border-foreground/20 bg-foreground/5 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/15"
              >
                <Upload className="size-3.5" />
                <span className="hidden sm:inline">Dosya Yükle</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSourceText("");
                  toast.info("Metin temizlendi.");
                }}
                title="Metni Temizle"
                disabled={!sourceText}
                className="flex size-8 items-center justify-center rounded-xl border border-foreground/15 bg-foreground/5 text-foreground/70 transition-colors hover:bg-destructive/20 hover:text-destructive hover:border-destructive/40 disabled:opacity-30"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="relative flex flex-1 flex-col">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Dönüştürmek istediğiniz Türkçe veya yabancı dildeki herhangi bir metni buraya yapıştırın veya yazmaya başlayın..."
              className="w-full flex-1 resize-none rounded-2xl border border-foreground/10 bg-black/20 p-4 font-sans text-base leading-relaxed text-foreground placeholder:text-foreground/40 backdrop-blur-sm outline-none transition-all focus:border-foreground/40 focus:ring-2 focus:ring-foreground/15"
              style={{ minHeight: "320px" }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-foreground/60">
            <span>Metin anında biyonik forma dönüştürülmektedir.</span>
            <span>{sourceText.length} karakter</span>
          </div>
        </div>

        {/* Right Pane: Bionic Reader Output */}
        <div
          className={`flex flex-col rounded-3xl border border-foreground/25 bg-foreground/15 p-5 backdrop-blur-md shadow-2xl transition-all ${
            isZenMode
              ? "fixed inset-4 z-50 overflow-y-auto bg-background/95 p-8 border-foreground/40"
              : ""
          }`}
        >
          {/* Header & Controls Toolbar */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-foreground/15 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-background text-xs font-bold">
                2
              </span>
              <h2 className="font-display text-lg font-medium tracking-wide text-foreground">
                Biyonik Önizleme
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Fixation Level Selector */}
              <div className="flex items-center rounded-xl border border-foreground/20 bg-foreground/10 p-0.5">
                <button
                  type="button"
                  onClick={() => setFixation(2)}
                  className={`rounded-lg px-2 py-1 text-xs transition-all ${
                    fixation === 2
                      ? "bg-foreground text-background font-medium shadow-sm"
                      : "text-foreground/70 hover:text-foreground"
                  }`}
                  title="Hafif Vurgu (%35)"
                >
                  Hafif
                </button>
                <button
                  type="button"
                  onClick={() => setFixation(3)}
                  className={`rounded-lg px-2 py-1 text-xs transition-all ${
                    fixation === 3
                      ? "bg-foreground text-background font-medium shadow-sm"
                      : "text-foreground/70 hover:text-foreground"
                  }`}
                  title="Dengeli Standart Vurgu (%50)"
                >
                  Standart
                </button>
                <button
                  type="button"
                  onClick={() => setFixation(4)}
                  className={`rounded-lg px-2 py-1 text-xs transition-all ${
                    fixation === 4
                      ? "bg-foreground text-background font-medium shadow-sm"
                      : "text-foreground/70 hover:text-foreground"
                  }`}
                  title="Yoğun Vurgu (%65)"
                >
                  Yoğun
                </button>
              </div>

              {/* Font Size Buttons */}
              <div className="flex items-center rounded-xl border border-foreground/20 bg-foreground/10 p-0.5">
                <button
                  type="button"
                  onClick={() => setFontSize((prev) => Math.max(13, prev - 1))}
                  className="px-2 py-1 text-xs text-foreground/70 hover:text-foreground"
                  title="Yazı Boyutunu Küçült"
                >
                  A-
                </button>
                <span className="px-1 text-xs font-mono text-foreground/80">{fontSize}</span>
                <button
                  type="button"
                  onClick={() => setFontSize((prev) => Math.min(28, prev + 1))}
                  className="px-2 py-1 text-xs text-foreground/70 hover:text-foreground"
                  title="Yazı Boyutunu Büyüt"
                >
                  A+
                </button>
              </div>

              {/* Settings Toggle */}
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className={`flex size-8 items-center justify-center rounded-xl border border-foreground/20 text-foreground transition-colors ${
                  showSettings
                    ? "bg-foreground text-background"
                    : "bg-foreground/10 hover:bg-foreground/20"
                }`}
                title="Gelişmiş Görünüm Ayarları"
              >
                <Sliders className="size-3.5" />
              </button>

              {/* Speech Toggle */}
              <button
                type="button"
                onClick={handleSpeak}
                className={`flex size-8 items-center justify-center rounded-xl border border-foreground/20 text-foreground transition-colors ${
                  isSpeaking
                    ? "bg-amber-400 text-black animate-pulse"
                    : "bg-foreground/10 hover:bg-foreground/20"
                }`}
                title={isSpeaking ? "Sesli Okumayı Durdur" : "Sesli Oku"}
              >
                {isSpeaking ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
              </button>

              {/* Copy Button */}
              <button
                type="button"
                onClick={() => handleCopy("html")}
                className="flex items-center gap-1.5 rounded-xl border border-foreground/20 bg-foreground/10 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/20"
                title="Biyonik Biçimli Olarak Kopyala"
              >
                {copied ? (
                  <Check className="size-3.5 text-emerald-400" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                <span className="hidden sm:inline">{copied ? "Kopyalandı" : "Kopyala"}</span>
              </button>

              {/* Save / Bookmark */}
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-xl border border-foreground/20 bg-foreground/10 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/20"
                title="Kütüphaneme Kaydet"
              >
                <BookmarkPlus className="size-3.5" />
                <span className="hidden md:inline">Kaydet</span>
              </button>

              {/* Fullscreen / Zen Mode */}
              <button
                type="button"
                onClick={() => setIsZenMode(!isZenMode)}
                className="flex size-8 items-center justify-center rounded-xl border border-foreground/20 bg-foreground/10 text-foreground transition-colors hover:bg-foreground/20"
                title={isZenMode ? "Tam Ekrandan Çık" : "Odaklanmış Tam Ekran Okuma"}
              >
                {isZenMode ? (
                  <Minimize2 className="size-3.5" />
                ) : (
                  <Maximize2 className="size-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Advanced Settings Drawer (Inline) */}
          {showSettings && (
            <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-foreground/20 bg-black/40 p-3 text-xs text-foreground backdrop-blur-md">
              <div>
                <label className="mb-1 block font-light text-foreground/70">Atlama (Sakkad):</label>
                <select
                  value={saccade}
                  onChange={(e) => setSaccade(Number(e.target.value))}
                  className="w-full rounded-lg border border-foreground/20 bg-black/60 px-2 py-1.5 text-foreground outline-none"
                >
                  <option value={1}>Her Kelimeyi Vurgula (Standart)</option>
                  <option value={2}>Her 2 Kelimede Bir Vurgula</option>
                  <option value={3}>Her 3 Kelimede Bir Vurgula</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-light text-foreground/70">Satır Aralığı:</label>
                <select
                  value={lineHeight}
                  onChange={(e) => setLineHeight(Number(e.target.value))}
                  className="w-full rounded-lg border border-foreground/20 bg-black/60 px-2 py-1.5 text-foreground outline-none"
                >
                  <option value={1.5}>Kompakt (1.5x)</option>
                  <option value={1.75}>Normal Ferah (1.75x)</option>
                  <option value={2.1}>Geniş ve Rahat (2.1x)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-light text-foreground/70">Yazı Tipi:</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full rounded-lg border border-foreground/20 bg-black/60 px-2 py-1.5 text-foreground outline-none"
                >
                  <option value="'Outfit', sans-serif">Outfit (Modern Geometrik)</option>
                  <option value="system-ui, sans-serif">Sistem Sans</option>
                  <option value="Georgia, serif">Serif (Kitap Stili)</option>
                  <option value="'Courier New', monospace">Monospace</option>
                </select>
              </div>
            </div>
          )}

          {/* Rendered Bionic Text Display */}
          <div
            ref={previewRef}
            className="bionic-reader-canvas relative flex-1 overflow-y-auto rounded-2xl border border-foreground/15 bg-black/30 p-6 text-foreground shadow-inner backdrop-blur-md select-text"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
              fontFamily: fontFamily,
              minHeight: "320px",
            }}
          >
            {sourceText.trim() ? (
              <div
                className="space-y-4 tracking-normal transition-all"
                dangerouslySetInnerHTML={{ __html: bionicHtml }}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-foreground/40 py-12">
                <Sparkles className="mb-2 size-8 opacity-40 animate-pulse" />
                <p className="text-base font-light">
                  Soldaki alana metin girdiğinizde biyonik okuma burada belirecektir.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Export Bar */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-foreground/15 pt-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-foreground/70">İndir:</span>
              <button
                type="button"
                onClick={() => handleDownload("html")}
                className="rounded-lg border border-foreground/15 bg-foreground/5 px-2.5 py-1 text-xs font-light text-foreground/80 hover:bg-foreground/15"
              >
                .HTML
              </button>
              <button
                type="button"
                onClick={() => handleDownload("txt")}
                className="rounded-lg border border-foreground/15 bg-foreground/5 px-2.5 py-1 text-xs font-light text-foreground/80 hover:bg-foreground/15"
              >
                .TXT
              </button>
              <button
                type="button"
                onClick={() => handleDownload("md")}
                className="rounded-lg border border-foreground/15 bg-foreground/5 px-2.5 py-1 text-xs font-light text-foreground/80 hover:bg-foreground/15"
              >
                .MD
              </button>
            </div>

            {onOpenSpeedReader && sourceText.trim() && (
              <button
                type="button"
                onClick={() => onOpenSpeedReader(sourceText)}
                className="flex items-center gap-1.5 rounded-full border border-foreground/30 bg-foreground/20 px-4 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-foreground hover:text-background"
              >
                <Play className="size-3 fill-current" />
                Hızlı Okuma (RSVP) Başlat
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
