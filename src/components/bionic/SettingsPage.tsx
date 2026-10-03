import React, { useState, useEffect } from "react";
import {
  Settings,
  Type,
  Eye,
  Sliders,
  Palette,
  Check,
  RotateCcw,
  Sparkles,
  Volume2,
  Zap,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  getUserSettings,
  saveUserSettings,
  UserSettings,
  DEFAULT_SETTINGS,
} from "@/lib/user-settings-store";
import { convertToBionicHtml } from "./bionic-transformer";

export function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(getUserSettings());

    const handleSettingsChange = (e: CustomEvent<UserSettings>) => {
      if (e.detail) setSettings(e.detail);
    };

    window.addEventListener("bionictext_settings_changed", handleSettingsChange as EventListener);
    return () => {
      window.removeEventListener(
        "bionictext_settings_changed",
        handleSettingsChange as EventListener,
      );
    };
  }, []);

  const handleUpdate = (partial: Partial<UserSettings>) => {
    const updated = saveUserSettings(partial);
    setSettings(updated);
    toast.success("Ayarlar anında uygulandı.");
  };

  const handleReset = () => {
    const reset = saveUserSettings(DEFAULT_SETTINGS);
    setSettings(reset);
    toast.success("Tüm ayarlar varsayılana sıfırlandı.");
  };

  const samplePreviewText =
    "BionicText teknolojisi, kelimelerin başlangıç harflerini fiksasyon noktalarıyla vurgulayarak beynin kelimeyi tanıma hızını artırır ve göz yorgunluğunu azaltır. Daha hızlı, daha anlamlı bir okuma deneyimi sunar.";

  return (
    <div className="w-full space-y-4 sm:space-y-6 select-none font-sans text-gray-900 pb-12">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200/80 pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-gray-900 font-display">
            <Settings className="size-5 text-gray-700" />
            <h1>Sistem ve Görünüm Ayarları</h1>
          </div>
          <p className="text-[11px] sm:text-xs text-gray-500">
            Tüm sitede geçerli okuma deneyiminizi, fontları, biyonik vurgu oranlarını ve arayüzü
            özelleştirin.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 hover:text-black shadow-2xs transition-colors active:scale-95"
        >
          <RotateCcw className="size-3.5" />
          <span>Varsayılana Sıfırla</span>
        </button>
      </div>

      {/* 2. LIVE PREVIEW CARD */}
      <div className="rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-gray-700">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-gray-500" />
            <span>Canlı Okuma Önizlemesi</span>
          </div>
          <span className="text-[11px] sm:text-[11px] font-mono text-gray-400">
            Font: {settings.fontFamily} • Boyut: {settings.fontSize} • Vurgu: %
            {settings.bionicFixation * 20} • Kalınlık: {settings.bionicWeight}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 border border-gray-100 text-gray-800 leading-relaxed">
          <div
            className={`select-text ${
              settings.fontSize === "sm"
                ? "text-xs sm:text-sm"
                : settings.fontSize === "base"
                  ? "text-sm sm:text-base"
                  : settings.fontSize === "lg"
                    ? "text-base sm:text-lg"
                    : "text-lg sm:text-xl"
            }`}
            style={{
              lineHeight:
                settings.lineHeight === "normal"
                  ? 1.5
                  : settings.lineHeight === "relaxed"
                    ? 1.75
                    : 2.1,
            }}
            dangerouslySetInnerHTML={{
              __html: convertToBionicHtml(samplePreviewText, {
                fixation: settings.bionicFixation,
                saccade: settings.saccadeStep,
              }),
            }}
          />
        </div>
      </div>

      {/* 3. SETTINGS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* SETTING CARD 1: FONT SEÇİMİ */}
        <div className="rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-900 border-b border-gray-100 pb-3">
            <Type className="size-4 text-gray-700" />
            <h3>Yazı Tipi & Font Ailesi</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
            {[
              { id: "sans" as const, name: "Inter (Modern Sans)", desc: "Sade ve net" },
              { id: "outfit" as const, name: "Outfit (Geometrik)", desc: "Dengeli başlıklar" },
              {
                id: "lexend" as const,
                name: "Lexend (Odaklanma)",
                desc: "Kolay okuma & disleksi dostu",
              },
              { id: "serif" as const, name: "Playfair (Kitap/Serif)", desc: "Edebi ve şık" },
              { id: "mono" as const, name: "JetBrains (Monospace)", desc: "Kod & teknik metinler" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => handleUpdate({ fontFamily: f.id })}
                className={`p-3 rounded-2xl border text-left text-xs transition-all flex items-center justify-between active:scale-98 ${
                  settings.fontFamily === f.id
                    ? "border-black bg-gray-50 text-black font-semibold shadow-2xs"
                    : "border-gray-200/80 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                <div>
                  <div className="font-semibold text-gray-900">{f.name}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{f.desc}</div>
                </div>
                {settings.fontFamily === f.id && (
                  <Check className="size-3.5 text-black shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* SETTING CARD 2: METİN BOYUTU VE ARALIKLARI */}
        <div className="rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-900 border-b border-gray-100 pb-3">
            <Sliders className="size-4 text-gray-700" />
            <h3>Metin Boyutu & Satır Aralığı</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Genel Metin Boyutu</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "sm" as const, label: "Küçük (14px)" },
                  { id: "base" as const, label: "Standart (16px)" },
                  { id: "lg" as const, label: "Büyük (18px)" },
                  { id: "xl" as const, label: "Ekstra (20px)" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleUpdate({ fontSize: s.id })}
                    className={`py-2.5 px-2 rounded-xl border text-center text-xs transition-all active:scale-95 ${
                      settings.fontSize === s.id
                        ? "border-black bg-gray-50 text-black font-semibold shadow-2xs"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Satır Aralığı (Line Height)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "normal" as const, label: "Normal (1.5x)" },
                  { id: "relaxed" as const, label: "Rahat (1.75x)" },
                  { id: "loose" as const, label: "Geniş (2.1x)" },
                ].map((lh) => (
                  <button
                    key={lh.id}
                    type="button"
                    onClick={() => handleUpdate({ lineHeight: lh.id })}
                    className={`py-2.5 px-2 rounded-xl border text-center text-xs transition-all active:scale-95 ${
                      settings.lineHeight === lh.id
                        ? "border-black bg-gray-50 text-black font-semibold shadow-2xs"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {lh.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SETTING CARD 3: BİYONİK FİKSASYON VE VURGU ORANI */}
        <div className="rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-900 border-b border-gray-100 pb-3">
            <Sparkles className="size-4 text-gray-700" />
            <h3>Biyonik Vurgu Oranı (Fiksasyon)</h3>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Kelimelerin kaç harfinin kalınlaştırılarak vurgulanacağını belirler.
            </p>

            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {[
                { val: 1, label: "%20" },
                { val: 2, label: "%40" },
                { val: 3, label: "%60 (Önerilen)" },
                { val: 4, label: "%75" },
                { val: 5, label: "%90" },
              ].map((f) => (
                <button
                  key={f.val}
                  type="button"
                  onClick={() => handleUpdate({ bionicFixation: f.val })}
                  className={`py-2.5 px-1 rounded-xl border text-center text-xs transition-all active:scale-95 ${
                    settings.bionicFixation === f.val
                      ? "border-black bg-gray-900 text-white font-semibold shadow-2xs"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SETTING CARD 4: VURGU KALINLIĞI VE KONTRAST */}
        <div className="rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-900 border-b border-gray-100 pb-3">
            <Palette className="size-4 text-gray-700" />
            <h3>Vurgu Kalınlığı & Renk Kontrastı</h3>
          </div>

          <div className="space-y-4">
            {/* Bold Weight */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Vurgu Harf Kalınlığı</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "semibold" as const, label: "Yarı Kalın (600)" },
                  { id: "bold" as const, label: "Kalın (700)" },
                  { id: "extrabold" as const, label: "Ekstra (800)" },
                  { id: "black" as const, label: "Siyah (900)" },
                ].map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleUpdate({ bionicWeight: w.id })}
                    className={`py-2.5 px-2 rounded-xl border text-center text-xs transition-all active:scale-95 ${
                      settings.bionicWeight === w.id
                        ? "border-black bg-gray-50 text-black font-semibold shadow-2xs"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Vurgu Rengi</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "black" as const, label: "Derin Siyah", colorBg: "bg-black" },
                  { id: "charcoal" as const, label: "Koyu Kömür", colorBg: "bg-slate-800" },
                  { id: "indigo" as const, label: "Gece İndigo", colorBg: "bg-indigo-950" },
                  { id: "emerald" as const, label: "Zümrüt Yeşili", colorBg: "bg-emerald-950" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleUpdate({ bionicColor: c.id })}
                    className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1.5 text-xs transition-all active:scale-95 ${
                      settings.bionicColor === c.id
                        ? "border-black bg-gray-50 text-black font-semibold shadow-2xs"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className={`size-2.5 rounded-full ${c.colorBg}`} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SETTING CARD 5: SAKKAD ADIMI & RSVP HIZI */}
        <div className="rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-900 border-b border-gray-100 pb-3">
            <Layers className="size-4 text-gray-700" />
            <h3>Sakkad Atlama Adımı</h3>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Gözün her kelimeyi mi yoksa belirli aralıklarla mı vurgulayacağını belirler.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 1, label: "Her Kelime (Standart)" },
                { val: 2, label: "2 Kelimede Bir" },
                { val: 3, label: "3 Kelimede Bir" },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => handleUpdate({ saccadeStep: s.val })}
                  className={`py-2.5 px-2 rounded-xl border text-center text-xs transition-all active:scale-95 ${
                    settings.saccadeStep === s.val
                      ? "border-black bg-gray-900 text-white font-semibold shadow-2xs"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SETTING CARD 6: HIZLI AKIŞ & SESLENDİRME */}
        <div className="rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-900 border-b border-gray-100 pb-3">
            <Volume2 className="size-4 text-gray-700" />
            <h3>Hızlı Okuma (RSVP) & Seslendirme</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
                Varsayılan RSVP Hızı (Kelime/Dk)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[250, 350, 450, 600].map((wpm) => (
                  <button
                    key={wpm}
                    type="button"
                    onClick={() => handleUpdate({ defaultWpm: wpm })}
                    className={`py-2 px-2 rounded-xl border text-center text-xs font-mono transition-all active:scale-95 ${
                      settings.defaultWpm === wpm
                        ? "border-black bg-gray-50 text-black font-semibold shadow-2xs"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {wpm} WPM
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Sesli Okuma (TTS) Hızı</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { speed: 0.8, label: "0.8x" },
                  { speed: 1.0, label: "1.0x" },
                  { speed: 1.25, label: "1.25x" },
                  { speed: 1.5, label: "1.5x" },
                ].map((s) => (
                  <button
                    key={s.speed}
                    type="button"
                    onClick={() => handleUpdate({ ttsSpeed: s.speed })}
                    className={`py-2 px-2 rounded-xl border text-center text-xs font-mono transition-all active:scale-95 ${
                      settings.ttsSpeed === s.speed
                        ? "border-black bg-gray-50 text-black font-semibold shadow-2xs"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
