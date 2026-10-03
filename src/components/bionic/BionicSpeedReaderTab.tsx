import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Zap,
  Gauge,
  Sliders,
  Sparkles,
} from "lucide-react";
import { transformWord, SAMPLE_TEXTS } from "./bionic-transformer";

interface BionicSpeedReaderTabProps {
  initialText?: string;
}

export function BionicSpeedReaderTab({ initialText }: BionicSpeedReaderTabProps) {
  const [text, setText] = useState<string>(initialText || SAMPLE_TEXTS[0]?.text || "");
  const [wpm, setWpm] = useState<number>(350);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const words = React.useMemo(() => {
    return text.trim().split(/\s+/).filter(Boolean);
  }, [text]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (initialText) {
      setText(initialText);
      setCurrentIndex(0);
      setIsPlaying(false);
    }
  }, [initialText]);

  useEffect(() => {
    if (isPlaying && words.length > 0) {
      const intervalMs = Math.round((60 / wpm) * 1000);
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= words.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, wpm, words.length]);

  // Spacebar key shortcut for Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const currentWord = words[currentIndex] || "";
  const { bold, rest } = transformWord(currentWord, 3);
  const progressPercent = words.length > 0 ? ((currentIndex + 1) / words.length) * 100 : 0;
  const remainingSeconds =
    words.length > 0 ? Math.ceil(((words.length - currentIndex) / wpm) * 60) : 0;

  return (
    <div className="flex flex-1 flex-col items-center justify-between pb-4">
      {/* Top Banner */}
      <div className="w-full mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-foreground/15 bg-foreground/10 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Zap className="size-5 text-amber-300" />
          <h2 className="font-display text-base font-medium text-foreground">
            Biyonik RSVP Hızlı Okuma Egzersizi
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-foreground/80">
          <span>🎯 Hedef: Göz hareketlerini sıfırlayıp odak hızını maksimuma çıkarmak</span>
        </div>
      </div>

      {/* Main Flash Display */}
      <div className="relative flex w-full max-w-3xl flex-1 flex-col items-center justify-center rounded-3xl border border-foreground/25 bg-black/40 p-8 shadow-2xl backdrop-blur-xl min-h-[360px]">
        {/* Reticle Guides */}
        <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none opacity-20">
          <div className="h-24 w-px bg-foreground" />
        </div>
        <div className="absolute top-8 text-xs font-mono tracking-widest text-foreground/40 uppercase">
          Odaklanma Noktası
        </div>

        {/* Big Word Display with Bionic Highlight */}
        <div className="relative my-auto flex items-center justify-center py-8">
          {words.length > 0 ? (
            <div className="font-display text-5xl sm:text-7xl font-light tracking-wide text-foreground">
              <span className="font-extrabold text-foreground drop-shadow-md">{bold}</span>
              <span className="text-foreground/80 font-light">{rest}</span>
            </div>
          ) : (
            <p className="text-lg text-foreground/50">Lütfen okunacak bir metin girin.</p>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-md space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/15">
            <div
              className="h-full bg-foreground transition-all duration-75"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-foreground/60 font-mono">
            <span>
              {currentIndex + 1} / {words.length} kelime
            </span>
            <span>Kalan: ~{remainingSeconds} sn</span>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="mt-4 flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 rounded-2xl border border-foreground/20 bg-foreground/10 p-4 backdrop-blur-md">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCurrentIndex(0);
              setIsPlaying(false);
            }}
            className="flex size-10 items-center justify-center rounded-full border border-foreground/20 bg-foreground/10 text-foreground transition-colors hover:bg-foreground/20"
            title="Başa Dön"
          >
            <RotateCcw className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 10))}
            className="flex size-10 items-center justify-center rounded-full border border-foreground/20 bg-foreground/10 text-foreground transition-colors hover:bg-foreground/20"
            title="10 Kelime Geri"
          >
            <SkipBack className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex h-12 px-6 items-center gap-2 rounded-full border border-foreground/30 bg-foreground text-background font-medium transition-transform hover:scale-105"
          >
            {isPlaying ? (
              <>
                <Pause className="size-5 fill-current" />
                Durdur
              </>
            ) : (
              <>
                <Play className="size-5 fill-current" />
                Başlat
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.min(words.length - 1, prev + 10))}
            className="flex size-10 items-center justify-center rounded-full border border-foreground/20 bg-foreground/10 text-foreground transition-colors hover:bg-foreground/20"
            title="10 Kelime İleri"
          >
            <SkipForward className="size-4" />
          </button>
        </div>

        {/* Speed (WPM) Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Gauge className="size-4 text-foreground/70" />
            <span className="font-mono text-sm font-semibold text-foreground">
              {wpm} <span className="text-xs font-normal text-foreground/60">WPM</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            {[250, 350, 450, 600].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => setWpm(speed)}
                className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                  wpm === speed
                    ? "bg-foreground text-background font-semibold"
                    : "border border-foreground/15 bg-foreground/5 text-foreground/80 hover:bg-foreground/15"
                }`}
              >
                {speed}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
