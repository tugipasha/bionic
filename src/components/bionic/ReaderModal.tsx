import React, { useState, useEffect } from "react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sliders,
  Type,
  BookOpen,
  Zap,
} from "lucide-react";
import { convertToBionicHtml, calculateTextStats, escapeHtml } from "./bionic-transformer";
import { getUserSettings } from "@/lib/user-settings-store";
import { getLanguageMeta, useSiteLanguage } from "@/lib/i18n";

interface ReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  isBionic: boolean;
  /** Metnin dili (sesli okuma için); verilmezse site dili kullanılır */
  lang?: string;
}

export function ReaderModal({
  isOpen,
  onClose,
  text,
  isBionic: initialBionic,
  lang,
}: ReaderModalProps) {
  const { siteLang, t } = useSiteLanguage();
  const initialSettings = getUserSettings();
  const [bionicEnabled, setBionicEnabled] = useState(initialBionic);
  const [fontSize, setFontSize] = useState(
    initialSettings.fontSize === "sm"
      ? 16
      : initialSettings.fontSize === "base"
        ? 18
        : initialSettings.fontSize === "lg"
          ? 20
          : 24,
  );
  const [lineHeight, setLineHeight] = useState(
    initialSettings.lineHeight === "normal"
      ? 1.5
      : initialSettings.lineHeight === "relaxed"
        ? 1.8
        : 2.1,
  );
  const [fixation, setFixation] = useState(initialSettings.bionicFixation || 3);
  const [isSpeedMode, setIsSpeedMode] = useState(false);
  const [wpm, setWpm] = useState(initialSettings.defaultWpm || 350);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    setBionicEnabled(initialBionic);
    const s = getUserSettings();
    setFixation(s.bionicFixation || 3);
    setWpm(s.defaultWpm || 350);
  }, [initialBionic, isOpen]);

  const words = React.useMemo(() => {
    return text.trim().split(/\s+/).filter(Boolean);
  }, [text]);

  const stats = calculateTextStats(text);

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      if (isSpeaking) {
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
      }
    }
  }, [isOpen]);

  // Speed Reader loop
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying && isSpeedMode && words.length > 0) {
      const intervalMs = Math.round((60 / wpm) * 1000);
      timer = setInterval(() => {
        setWordIndex((prev) => {
          if (prev >= words.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, isSpeedMode, wpm, words.length]);

  if (!isOpen) return null;

  const currentWord = words[wordIndex] || "";
  const bionicHtml = bionicEnabled
    ? convertToBionicHtml(text, { fixation })
    : text.replace(/\n/g, "<br/>");

  const handleSpeak = () => {
    if (!("speechSynthesis" in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLanguageMeta(lang ?? siteLang).locale;
    utterance.rate = getUserSettings().ttsSpeed || 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-md transition-all animate-in fade-in duration-200">
      <div className="relative flex h-full max-h-[96vh] sm:max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-gray-200/80 bg-white/95 p-4 sm:p-8 shadow-2xl backdrop-blur-xl text-gray-900 overflow-hidden">
        {/* MODAL HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 sm:pb-4 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex size-7 sm:size-8 items-center justify-center rounded-xl bg-gray-100 text-gray-800">
              <BookOpen className="size-4" />
            </span>
            <div>
              <h2 className="font-display text-sm sm:text-base font-semibold text-gray-900">
                {t("reader.title")}
              </h2>
              <p className="text-[10px] sm:text-xs text-gray-400">
                {t("reader.stats", { words: stats.words, min: stats.readingTimeBionicMin })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Speed Reader Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsSpeedMode(!isSpeedMode);
                setIsPlaying(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                isSpeedMode
                  ? "bg-black text-white shadow-2xs"
                  : "border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Zap className="size-3.5" />
              <span>{isSpeedMode ? t("reader.rsvpActive") : t("reader.rsvp")}</span>
            </button>

            {/* Bionic Toggle */}
            <button
              type="button"
              onClick={() => setBionicEnabled(!bionicEnabled)}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                bionicEnabled
                  ? "bg-gray-100 text-gray-900 border border-gray-300"
                  : "border border-gray-200 text-gray-400"
              }`}
            >
              <span>{bionicEnabled ? t("reader.bionicOn") : t("reader.bionicOff")}</span>
            </button>

            {/* TTS Audio */}
            <button
              type="button"
              onClick={handleSpeak}
              className={`p-2 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors ${
                isSpeaking ? "text-black bg-gray-100" : ""
              }`}
              title="Sesli Oku"
              aria-label="Sesli Oku"
            >
              {isSpeaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-black hover:bg-gray-50 transition-colors"
              title="Kapat"
              aria-label="Kapat"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto py-4 sm:py-6 pr-1 select-text">
          {isSpeedMode ? (
            /* RSVP SPEED READER VIEW */
            <div className="flex flex-col items-center justify-center h-full min-h-[240px] space-y-6">
              <div className="w-full max-w-lg p-6 sm:p-10 rounded-3xl border border-gray-200 bg-gray-50 flex items-center justify-center min-h-[160px] text-center shadow-inner">
                {currentWord ? (
                  <div
                    className="font-display font-medium text-3xl sm:text-5xl text-gray-900 tracking-tight"
                    dangerouslySetInnerHTML={{
                      __html: bionicEnabled
                        ? convertToBionicHtml(currentWord, { fixation })
                        : escapeHtml(currentWord),
                    }}
                  />
                ) : (
                  <span className="text-gray-400 text-sm italic">{t("reader.noText")}</span>
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setWordIndex(0);
                    setIsPlaying(false);
                  }}
                  className="p-2.5 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600 active:scale-95"
                  title={t("reader.restart")}
                  aria-label={t("reader.restart")}
                >
                  <RotateCcw className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center gap-2 rounded-full bg-black text-white px-7 py-3 text-xs sm:text-sm font-semibold hover:bg-neutral-800 shadow-md active:scale-95 transition-all"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="size-4 fill-current" />
                      <span>Durdur</span>
                    </>
                  ) : (
                    <>
                      <Play className="size-4 fill-current" />
                      <span>{t("reader.start")}</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs font-mono">
                  <span>{wpm} WPM</span>
                  <input
                    type="range"
                    min="150"
                    max="800"
                    step="25"
                    value={wpm}
                    onChange={(e) => setWpm(Number(e.target.value))}
                    className="w-20 accent-black cursor-pointer"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* FULL TEXT READING VIEW */
            <div
              className="max-w-3xl mx-auto leading-relaxed text-gray-800 font-sans"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
              }}
              dangerouslySetInnerHTML={{ __html: bionicHtml }}
            />
          )}
        </div>

        {/* MODAL FOOTER CONTROLS */}
        {!isSpeedMode && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3 sm:pt-4 text-xs shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-[11px] font-medium hidden sm:inline">
                {t("reader.fontSize")}
              </span>
              <div className="flex items-center gap-1">
                {[16, 18, 20, 24].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setFontSize(sz)}
                    className={`size-7 sm:size-8 rounded-xl border text-center font-mono text-xs transition-all active:scale-95 ${
                      fontSize === sz
                        ? "border-black bg-black text-white font-bold shadow-2xs"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-[11px] font-medium hidden sm:inline">
                {t("reader.lineHeight")}
              </span>
              <div className="flex items-center gap-1">
                {[
                  { label: "1.5x", val: 1.5 },
                  { label: "1.8x", val: 1.8 },
                  { label: "2.1x", val: 2.1 },
                ].map((lh) => (
                  <button
                    key={lh.label}
                    type="button"
                    onClick={() => setLineHeight(lh.val)}
                    className={`px-2.5 py-1 sm:py-1.5 rounded-xl border text-xs transition-all active:scale-95 ${
                      lineHeight === lh.val
                        ? "border-black bg-black text-white font-semibold shadow-2xs"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {lh.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
