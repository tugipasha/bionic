import React, { useState, useRef } from "react";
import {
  Upload,
  Sparkles,
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";

interface ViewportRecommendation {
  viewport: string;
  aspectRatio: string;
  imageScale: number;
  focusX: number;
  focusY: number;
  titleSizeVw: number;
  titleTopPercent: number;
  shadowOpacity: number;
  shadowBlurRem: number;
  note: string;
}

interface AnalysisResult {
  summary: string;
  visualFocus: string;
  contrastNote: string;
  recommendations: ViewportRecommendation[];
}

export function BionicImageAnalysisTab() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeViewport, setActiveViewport] = useState<string>("16:9");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Lütfen geçerli bir JPG, PNG veya WebP görseli seçin.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("Görsel 10 MB'dan küçük olmalıdır.");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleAnalyze = async () => {
    if (!file || !previewUrl) {
      toast.error("Lütfen önce bir görsel yükleyin.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get image dimensions
      const img = new Image();
      img.src = previewUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const response = await fetch("/api/analyze-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataUrl: previewUrl,
          width: img.naturalWidth || 1920,
          height: img.naturalHeight || 1080,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Görsel analizi tamamlanamadı.");
      }

      setResult(data);
      toast.success("AI Analizi tamamlandı!");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Analiz sırasında bir hata oluştu.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const currentRec =
    result?.recommendations.find(
      (r) => r.aspectRatio === activeViewport || r.viewport.includes(activeViewport),
    ) || result?.recommendations[0];

  return (
    <div className="flex flex-1 flex-col overflow-hidden pb-4">
      {/* Top Banner */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-foreground/15 bg-foreground/10 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-amber-300" />
          <h2 className="font-display text-base font-medium text-foreground">
            Yapay Zeka Destekli Arka Plan & Tipografi Analizi
          </h2>
        </div>
        <span className="text-xs text-foreground/70">
          Yeni bir arka plan görseli yükleyip masaüstü, tablet ve mobil için ideal okuma yerleşimini
          hesaplayın.
        </span>
      </div>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-2 gap-4 min-h-[460px]">
        {/* Left: Image Upload & Preview */}
        <div className="flex flex-col rounded-3xl border border-foreground/20 bg-foreground/10 p-5 backdrop-blur-md shadow-2xl">
          <div className="mb-3 flex items-center justify-between border-b border-foreground/15 pb-3">
            <h3 className="font-display text-base font-medium text-foreground">Görsel Yükleme</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-xl border border-foreground/20 bg-foreground/10 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-foreground/20"
            >
              <Upload className="size-3.5" />
              {previewUrl ? "Görseli Değiştir" : "Görsel Seç"}
            </button>
          </div>

          <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl border border-foreground/15 bg-black/30 p-4">
            {previewUrl ? (
              <div className="relative h-full w-full flex items-center justify-center overflow-hidden rounded-xl">
                <img
                  src={previewUrl}
                  alt="Önizleme"
                  className="max-h-[300px] w-auto object-contain rounded-lg shadow-lg"
                />
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center p-8 text-center text-foreground/60 hover:text-foreground"
              >
                <Upload className="mb-3 size-12 opacity-50" />
                <p className="text-sm font-medium">Görselinizi sürükleyin veya seçin</p>
                <p className="mt-1 text-xs text-foreground/40">PNG, JPG veya WebP (Maks. 10MB)</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-foreground/60">
              {file
                ? `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`
                : "Görsel seçilmedi"}
            </span>

            <button
              type="button"
              disabled={!file || loading}
              onClick={handleAnalyze}
              className="flex items-center gap-2 rounded-full border border-foreground/30 bg-foreground text-background px-6 py-2 text-xs font-medium transition-all hover:bg-foreground/90 disabled:opacity-40"
            >
              {loading ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  Analiz Ediliyor...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  Yapay Zeka ile Analiz Et
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: AI Recommendations */}
        <div className="flex flex-col rounded-3xl border border-foreground/25 bg-foreground/15 p-5 backdrop-blur-md shadow-2xl overflow-y-auto">
          <div className="mb-3 flex items-center justify-between border-b border-foreground/15 pb-3">
            <h3 className="font-display text-base font-medium text-foreground">
              AI Yerleşim ve Tipografi Raporu
            </h3>

            {/* Viewport Switcher */}
            {result && (
              <div className="flex items-center rounded-xl border border-foreground/20 bg-foreground/10 p-0.5">
                <button
                  type="button"
                  onClick={() => setActiveViewport("16:9")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs transition-colors ${
                    activeViewport === "16:9"
                      ? "bg-foreground text-background font-semibold"
                      : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  <Monitor className="size-3" />
                  16:9 Masaüstü
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewport("4:3")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs transition-colors ${
                    activeViewport === "4:3"
                      ? "bg-foreground text-background font-semibold"
                      : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  <Tablet className="size-3" />
                  4:3 Tablet
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewport("9:16")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs transition-colors ${
                    activeViewport === "9:16"
                      ? "bg-foreground text-background font-semibold"
                      : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  <Smartphone className="size-3" />
                  9:16 Mobil
                </button>
              </div>
            )}
          </div>

          {loading && (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-foreground/70">
              <RefreshCw className="mb-3 size-10 animate-spin opacity-60 text-amber-300" />
              <p className="text-sm font-medium">
                Görselin kompozisyonu ve kontrastı inceleniyor...
              </p>
              <p className="mt-1 text-xs text-foreground/50">
                Tipografi güvenli alanları hesaplanıyor.
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center text-foreground">
              <AlertCircle className="mb-2 size-8 text-destructive" />
              <p className="text-sm font-medium text-destructive">{error}</p>
              <p className="mt-1 text-xs text-foreground/60">
                Lütfen farklı bir görsel seçip tekrar deneyin.
              </p>
            </div>
          )}

          {!result && !loading && !error && (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-foreground/40">
              <Eye className="mb-3 size-10 opacity-30" />
              <p className="text-sm">
                Görsel yükledikten sonra "Yapay Zeka ile Analiz Et" butonuna tıklayın.
              </p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-foreground/15 bg-black/20 p-4">
                <h4 className="font-display text-sm font-semibold text-foreground">Özet</h4>
                <p className="mt-1 text-xs text-foreground/80 leading-relaxed">{result.summary}</p>
                <div className="mt-2 text-xs text-foreground/70">
                  <strong>Görsel Odak:</strong> {result.visualFocus}
                </div>
                <div className="mt-1 text-xs text-foreground/70">
                  <strong>Kontrast:</strong> {result.contrastNote}
                </div>
              </div>

              {currentRec && (
                <div className="rounded-2xl border border-foreground/20 bg-foreground/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-medium text-foreground">
                      {currentRec.viewport} ({currentRec.aspectRatio}) Önerileri
                    </span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-300">
                      Önerilen
                    </span>
                  </div>

                  <p className="text-xs text-foreground/80 italic">{currentRec.note}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl border border-foreground/10 bg-black/30 p-2.5">
                      <div className="text-foreground/60">Görsel Ölçeği</div>
                      <div className="mt-0.5 font-mono font-semibold text-foreground">
                        {currentRec.imageScale}x
                      </div>
                    </div>
                    <div className="rounded-xl border border-foreground/10 bg-black/30 p-2.5">
                      <div className="text-foreground/60">Odak Noktası</div>
                      <div className="mt-0.5 font-mono font-semibold text-foreground">
                        %{currentRec.focusX} / %{currentRec.focusY}
                      </div>
                    </div>
                    <div className="rounded-xl border border-foreground/10 bg-black/30 p-2.5">
                      <div className="text-foreground/60">Başlık Boyutu</div>
                      <div className="mt-0.5 font-mono font-semibold text-foreground">
                        {currentRec.titleSizeVw}vw
                      </div>
                    </div>
                    <div className="rounded-xl border border-foreground/10 bg-black/30 p-2.5">
                      <div className="text-foreground/60">Başlık Konumu</div>
                      <div className="mt-0.5 font-mono font-semibold text-foreground">
                        Yukarıdan %{currentRec.titleTopPercent}
                      </div>
                    </div>
                    <div className="rounded-xl border border-foreground/10 bg-black/30 p-2.5">
                      <div className="text-foreground/60">Gölge Opaklığı</div>
                      <div className="mt-0.5 font-mono font-semibold text-foreground">
                        {currentRec.shadowOpacity}
                      </div>
                    </div>
                    <div className="rounded-xl border border-foreground/10 bg-black/30 p-2.5">
                      <div className="text-foreground/60">Gölge Bulanıklığı</div>
                      <div className="mt-0.5 font-mono font-semibold text-foreground">
                        {currentRec.shadowBlurRem}rem
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
