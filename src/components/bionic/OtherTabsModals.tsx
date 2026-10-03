import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Gauge,
  Eye,
  Trophy,
  Play,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  Zap,
  Activity,
} from "lucide-react";
import { convertToBionicHtml } from "./bionic-transformer";
import { saveTestResult } from "@/lib/reading-stats-store";
import { toast } from "sonner";

interface TabProps {
  onBackToTranslate: () => void;
}

export function ReadingTestView({ onBackToTranslate }: TabProps) {
  const [stage, setStage] = useState<"ready" | "reading" | "question" | "result">("ready");
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const testText = `Beynimiz kelimeleri tek tek harfler olarak değil, kalıplar ve şekiller halinde işler. Biyonik okuma, kelimelerin başlangıç harflerini kalınlaştırarak gözlerin satırlar arasında daha hızlı ve odaklı atlamasını sağlar. Yapılan araştırmalar, düzenli biyonik okuma antrenmanlarının anlama oranını düşürmeden okuma hızını ortalama %50 artırdığını göstermektedir.`;
  const wordsCount = testText.split(/\s+/).length;

  const startTest = () => {
    setStartTime(Date.now());
    setStage("reading");
  };

  const finishReading = () => {
    setEndTime(Date.now());
    setStage("question");
  };

  const submitAnswer = (idx: number) => {
    setSelectedAnswer(idx);
    setStage("result");
    const accuracyScore = idx === 1 ? 100 : 75;
    const bionicSpeed = wpm;
    const normalEstSpeed = Math.round(wpm * 0.85);

    saveTestResult({
      title: "Biyonik Anlama Testi",
      normalWpm: normalEstSpeed,
      bionicWpm: bionicSpeed,
      accuracy: accuracyScore,
      durationSeconds: Math.round(durationSec),
    });
    toast.success("Test sonucu kaydedildi! Profil sekmesinden gelişiminizi görebilirsiniz.");
  };

  const durationSec = Math.max(1, (endTime - startTime) / 1000);
  const wpm = Math.round((wordsCount / durationSec) * 60);

  return (
    <div className="w-full max-w-3xl mx-auto rounded-3xl border border-gray-200/80 bg-white/95 p-4 sm:p-8 shadow-xl backdrop-blur-xl text-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 sm:pb-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <Gauge className="size-5 text-gray-700" />
          <h2 className="font-display text-base sm:text-lg font-medium">
            Biyonik Okuma Hızı & Anlama Testi
          </h2>
        </div>
        <button
          onClick={onBackToTranslate}
          className="text-xs text-gray-500 hover:text-black font-medium"
        >
          ← Çeviriye Dön
        </button>
      </div>

      {stage === "ready" && (
        <div className="text-center py-6 sm:py-8 space-y-4">
          <div className="size-12 sm:size-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-800">
            <Zap className="size-6 sm:size-7" />
          </div>
          <h3 className="text-lg sm:text-xl font-medium">Dakikadaki Kelime Hızınızı Ölçün</h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
            "Başla" butonuna bastığınızda biyonik formatta bir metin belirecektir. Metni doğal
            hızınızda okuyup "Okumayı Bitirdim" butonuna basın.
          </p>
          <button
            onClick={startTest}
            className="rounded-full bg-black text-white px-8 py-3 text-xs sm:text-sm font-semibold hover:bg-neutral-800 transition-all active:scale-95 shadow-md"
          >
            Testi Başlat
          </button>
        </div>
      )}

      {stage === "reading" && (
        <div className="space-y-4 sm:space-y-6">
          <div
            className="p-4 sm:p-6 rounded-2xl bg-gray-50 text-base sm:text-lg leading-relaxed font-sans select-text max-h-[300px] overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: convertToBionicHtml(testText, { fixation: 3 }) }}
          />
          <div className="text-center">
            <button
              onClick={finishReading}
              className="w-full sm:w-auto rounded-full bg-black text-white px-8 py-3 text-xs sm:text-sm font-semibold hover:bg-neutral-800 transition-all active:scale-95 shadow-md"
            >
              Okumayı Bitirdim →
            </button>
          </div>
        </div>
      )}

      {stage === "question" && (
        <div className="space-y-4 py-2 sm:py-4">
          <h3 className="text-sm sm:text-base font-semibold">Anlama Sorusu:</h3>
          <p className="text-xs sm:text-sm text-gray-700">
            Metne göre biyonik okuma antrenmanları okuma hızını ortalama ne kadar artırmaktadır?
          </p>
          <div className="space-y-2 pt-1">
            {["%20 artırır", "%50 artırır", "%80 artırır", "Okuma hızını değiştirmez"].map(
              (option, idx) => (
                <button
                  key={idx}
                  onClick={() => submitAnswer(idx)}
                  className="w-full text-left p-3 sm:p-3.5 rounded-xl border border-gray-200 hover:border-black hover:bg-gray-50 text-xs sm:text-sm transition-all active:scale-98"
                >
                  {option}
                </button>
              ),
            )}
          </div>
        </div>
      )}

      {stage === "result" && (
        <div className="text-center py-4 sm:py-6 space-y-4">
          <div className="size-14 sm:size-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="size-7 sm:size-8" />
          </div>
          <h3 className="text-xl sm:text-2xl font-medium">Harika Bir Sonuç!</h3>
          <div className="flex justify-center gap-3 sm:gap-6 py-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 sm:px-6 py-2.5 sm:py-3">
              <div className="text-xl sm:text-2xl font-bold text-black font-mono">{wpm}</div>
              <div className="text-[10px] sm:text-xs text-gray-500">WPM (Kelime/Dk)</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 sm:px-6 py-2.5 sm:py-3">
              <div className="text-xl sm:text-2xl font-bold text-emerald-600 font-mono">
                {selectedAnswer === 1 ? "%100" : "%50"}
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500">Anlama Skoru</div>
            </div>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setStage("ready")}
              className="rounded-full border border-gray-300 px-5 py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Tekrar Dene
            </button>
            <button
              onClick={onBackToTranslate}
              className="rounded-full bg-black px-6 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-neutral-800 transition-colors"
            >
              Çeviriye Dön
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function EyeExerciseView({ onBackToTranslate }: TabProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [dotPos, setDotPos] = useState<number>(0);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setDotPos((prev) => (prev + 1) % 100);
      }, 30);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying]);

  return (
    <div className="w-full max-w-3xl mx-auto rounded-3xl border border-gray-200/80 bg-white/95 p-4 sm:p-8 shadow-xl backdrop-blur-xl text-gray-900 pb-8">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 sm:pb-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <Eye className="size-5 text-gray-700" />
          <h2 className="font-display text-base sm:text-lg font-medium">
            Göz Kasları & Sakkad Egzersizleri
          </h2>
        </div>
        <button
          onClick={onBackToTranslate}
          className="text-xs text-gray-500 hover:text-black font-medium"
        >
          ← Çeviriye Dön
        </button>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <p className="text-xs sm:text-sm text-gray-600">
          Gözlerinizin satırlar arasında daha hızlı ve yorulmadan atlamasını sağlayan bilimsel göz
          takip egzersizleri.
        </p>

        {/* Dynamic Exercise Arena */}
        <div className="relative h-44 sm:h-52 w-full rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
          {isPlaying ? (
            <div
              className="absolute size-5 sm:size-6 rounded-full bg-black shadow-lg transition-transform duration-75"
              style={{
                left: `${10 + (Math.sin(dotPos * 0.1) * 0.5 + 0.5) * 80}%`,
                top: `${20 + (Math.cos(dotPos * 0.1) * 0.5 + 0.5) * 60}%`,
              }}
            />
          ) : (
            <span className="text-xs sm:text-sm text-gray-400">
              Egzersizi başlatmak için aşağıdaki butona basın
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <span className="text-[11px] sm:text-xs text-gray-500 text-center sm:text-left">
            Kafanızı sabit tutup sadece gözlerinizle siyah noktayı takip edin.
          </span>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-full sm:w-auto rounded-full bg-black text-white px-6 py-2.5 text-xs sm:text-sm font-semibold hover:bg-neutral-800 transition-all active:scale-95 shadow-md"
          >
            {isPlaying ? "Durdur" : "Egzersizi Başlat"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReadingRaceView({ onBackToTranslate }: TabProps) {
  return (
    <div className="w-full max-w-3xl mx-auto rounded-3xl border border-gray-200/80 bg-white/95 p-4 sm:p-8 shadow-xl backdrop-blur-xl text-gray-900 pb-8">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 sm:pb-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-amber-500" />
          <h2 className="font-display text-base sm:text-lg font-medium">
            Biyonik Okuma Liderlik Tablosu
          </h2>
        </div>
        <button
          onClick={onBackToTranslate}
          className="text-xs text-gray-500 hover:text-black font-medium"
        >
          ← Çeviriye Dön
        </button>
      </div>

      <div className="space-y-2.5 sm:space-y-3">
        {[
          { rank: 1, name: "Ahmet K.", speed: "680 WPM", score: "%98 Anlama", badge: "🏆" },
          { rank: 2, name: "Zeynep T.", speed: "620 WPM", score: "%95 Anlama", badge: "🥈" },
          { rank: 3, name: "Caner Y.", speed: "590 WPM", score: "%92 Anlama", badge: "🥉" },
          { rank: 4, name: "Sen (Mevcut)", speed: "450 WPM", score: "%90 Anlama", badge: "⚡" },
        ].map((u) => (
          <div
            key={u.rank}
            className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border ${
              u.rank === 4 ? "border-black bg-gray-50 font-medium" : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="text-base sm:text-lg">{u.badge}</span>
              <span className="text-xs sm:text-sm font-semibold">{u.name}</span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono">
              <span className="font-bold text-gray-900">{u.speed}</span>
              <span className="text-emerald-600">{u.score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
