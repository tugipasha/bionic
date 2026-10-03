import React, { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  ArrowLeftRight,
  Mic,
  MicOff,
  Upload,
  Copy,
  Check,
  Volume2,
  VolumeX,
  BookOpen,
  Zap,
  BarChart3,
  ChevronDown,
  User,
  LogOut,
  Settings,
  ShieldCheck,
  Home,
  FileText,
  Sun,
  Moon,
  Menu,
  X,
  Trash2,
  Sliders,
  Activity,
  Globe,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { convertToBionicHtml } from "./bionic-transformer";
import { ReaderModal } from "./ReaderModal";
import { ReadingTestPage } from "./ReadingTestPage";
import { AIAssistantPage } from "./AIAssistantPage";
import { ReadingRacePage } from "./ReadingRacePage";
import { ProfilePage } from "./ProfilePage";
import { SettingsPage } from "./SettingsPage";
import { logReadingActivity } from "@/lib/supabase-db";
import { getUserSettings, applySettingsToDOM, type UserSettings } from "@/lib/user-settings-store";
import { SiteLanguageSwitcher } from "./SiteLanguageSwitcher";
import { translateWithMyMemory, resolveLanguage } from "@/lib/translate-core";
import {
  SITE_LANGUAGES,
  t,
  getLanguageMeta,
  useSiteLanguage,
  type SupportedLanguage,
} from "@/lib/i18n";

type ActiveTab = "translate" | "test" | "race" | "assistant" | "profile" | "settings";

export const LANGUAGES = SITE_LANGUAGES;

const DEFAULT_SOURCE_TEXT =
  "Technology has fundamentally changed how people access information. We now learn faster, understand better, and prepare stronger for the future.";

const DEFAULT_TRANSLATED_TEXT =
  "Teknoloji, insanların bilgiye erişim şeklini kökten değiştirdi. Artık daha hızlı öğreniyor, daha iyi anlıyor ve geleceğe daha güçlü hazırlanıyoruz.";

interface ISpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: { results: Array<Array<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface WindowWithSpeech extends Window {
  SpeechRecognition?: { new (): ISpeechRecognition };
  webkitSpeechRecognition?: { new (): ISpeechRecognition };
}

interface ExactBionicAppProps {
  userEmail?: string;
  isLoggedIn?: boolean;
  onSignOut?: () => void;
  onGoToLogin?: () => void;
}

export function ExactBionicApp({
  userEmail = "",
  isLoggedIn,
  onSignOut,
  onGoToLogin,
}: ExactBionicAppProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("translate");
  const [sourceLang, setSourceLang] = useState<string>("en");
  const [targetLang, setTargetLang] = useState<string>("tr");
  const [sourceText, setSourceText] = useState<string>(DEFAULT_SOURCE_TEXT);
  const [translatedText, setTranslatedText] = useState<string>(DEFAULT_TRANSLATED_TEXT);
  const [isBionic, setIsBionic] = useState<boolean>(true);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isReaderModalOpen, setIsReaderModalOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Dropdown states
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState<boolean>(false);
  const [targetDropdownOpen, setTargetDropdownOpen] = useState<boolean>(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);
  const [sourceSearch, setSourceSearch] = useState<string>("");
  const [targetSearch, setTargetSearch] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);
  const targetDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const translateRequestId = useRef(0);
  const { siteLang, setSiteLang: changeSiteLang } = useSiteLanguage();

  const [userSettings, setUserSettings] = useState<UserSettings>(getUserSettings());

  // Site dili ilk yüklemede (kayıtlı/tarayıcı dili) belirlendiğinde çeviri hedefini ona getir
  const langInitialised = useRef(false);
  useEffect(() => {
    if (langInitialised.current) return;
    langInitialised.current = true;
    if (siteLang !== "tr" && siteLang !== targetLang) {
      const newSource = siteLang === "en" ? "tr" : "en";
      setTargetLang(siteLang);
      setSourceLang(newSource);
      setSourceText("");
      setTranslatedText("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteLang]);

  // Apply User settings on load & listen to real-time changes
  useEffect(() => {
    const s = getUserSettings();
    setUserSettings(s);
    applySettingsToDOM(s);

    const handleSettingsUpdate = (e: CustomEvent<UserSettings>) => {
      if (e.detail) {
        setUserSettings(e.detail);
        applySettingsToDOM(e.detail);
      }
    };

    window.addEventListener("bionictext_settings_changed", handleSettingsUpdate as EventListener);
    return () => {
      window.removeEventListener(
        "bionictext_settings_changed",
        handleSettingsUpdate as EventListener,
      );
    };
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(e.target as Node)) {
        setSourceDropdownOpen(false);
      }
      if (targetDropdownRef.current && !targetDropdownRef.current.contains(e.target as Node)) {
        setTargetDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Translation Function
  const MAX_SOURCE_CHARS = 5000;
  const handleTranslate = async (
    textToTranslate?: string,
    overrideSource?: string,
    overrideTarget?: string,
  ) => {
    const text = typeof textToTranslate === "string" ? textToTranslate : sourceText;
    const fromLang = overrideSource || sourceLang;
    const toLang = overrideTarget || targetLang;

    if (!text.trim()) {
      setTranslatedText("");
      return;
    }

    if (fromLang === toLang) {
      setTranslatedText(text);
      return;
    }

    if (
      text.trim().toLowerCase() === DEFAULT_SOURCE_TEXT.toLowerCase() &&
      fromLang === "en" &&
      toLang === "tr"
    ) {
      setTranslatedText(DEFAULT_TRANSLATED_TEXT);
      return;
    }

    const requestId = ++translateRequestId.current;
    setIsTranslating(true);
    let result: string | null = null;
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source_lang: fromLang, target_lang: toLang }),
      });
      if (res.ok) {
        const data = (await res.json()) as { translation?: string };
        if (data.translation) result = data.translation;
      }
    } catch {
      /* sunucu rotası yoksa istemci yedeğine geç */
    }

    if (result === null) {
      try {
        const src = resolveLanguage(fromLang);
        const tgt = resolveLanguage(toLang);
        if (src && tgt) result = await translateWithMyMemory(text, src.iso, tgt.iso);
      } catch {
        result = null;
      }
    }

    // Daha yeni bir çeviri isteği başladıysa bu sonucu yoksay
    if (requestId !== translateRequestId.current) return;
    setIsTranslating(false);

    if (result === null) {
      toast.error(t("toast.translateFailed", siteLang));
      return;
    }

    setTranslatedText(result);
    logReadingActivity({
      sourceLang: fromLang,
      targetLang: toLang,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      isBionic,
      textSnippet: result,
    }).catch(() => {});
  };

  // Site dili değişince çeviri hedef dilini de ona getir
  const handleSiteLanguageSelect = (code: string) => {
    changeSiteLang(code);
    const meta = getLanguageMeta(code);
    let newSource = sourceLang;
    if (newSource === code) newSource = code === "en" ? "tr" : "en";
    setSourceLang(newSource);
    setTargetLang(code);
    if (sourceText.trim()) handleTranslate(sourceText, newSource, code);
    toast.success(t("toast.langChanged", code, { lang: `${meta.flag} ${meta.nativeName}` }));
  };

  // Language Swap
  const handleSwapLanguages = () => {
    const prevSource = sourceLang;
    const prevTarget = targetLang;
    setSourceLang(prevTarget);
    setTargetLang(prevSource);

    const prevSourceText = sourceText;
    const prevTranslatedText = translatedText;
    setSourceText(prevTranslatedText);
    setTranslatedText(prevSourceText);

    if (prevTranslatedText.trim()) {
      handleTranslate(prevTranslatedText, prevTarget, prevSource);
    }
  };

  // Speech Recognition (Dictation)
  const toggleSpeechRecognition = () => {
    const win = typeof window !== "undefined" ? (window as unknown as WindowWithSpeech) : undefined;
    const SpeechRecognition = win?.SpeechRecognition || win?.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error(t("toast.micUnsupported", siteLang));
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = getLanguageMeta(sourceLang).locale;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info(t("toast.listening", siteLang));
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript ?? "";
        const updated = sourceText ? `${sourceText} ${transcript}` : transcript;
        setSourceText(updated);
        handleTranslate(updated);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      toast.error(t("toast.micFailed", siteLang));
    }
  };

  // File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const clipped = content.slice(0, MAX_SOURCE_CHARS);
        setSourceText(clipped);
        handleTranslate(clipped);
        toast.success(t("toast.fileLoaded", siteLang, { name: file.name }));
        if (content.length > MAX_SOURCE_CHARS) {
          toast.info(t("toast.tooLong", siteLang, { n: MAX_SOURCE_CHARS }));
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Copy
  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard?.writeText(translatedText).catch(() => {});
    setCopied(true);
    toast.success(t("btn.copied", siteLang));
    setTimeout(() => setCopied(false), 2000);
  };

  // Clear text
  const handleClearText = () => {
    setSourceText("");
    setTranslatedText("");
  };

  // Text to Speech
  const handleSpeak = () => {
    if (!translatedText) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error(t("toast.ttsUnsupported", siteLang));
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(translatedText);
    utterance.lang = getLanguageMeta(targetLang).locale;
    utterance.rate = userSettings.ttsSpeed || 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const currentSource = getLanguageMeta(sourceLang);
  const currentTarget = getLanguageMeta(targetLang);

  const username = (userEmail ? userEmail.split("@")[0] : "") || "user";
  const userInitial = username.charAt(0).toUpperCase();

  const isDashboardLayout = activeTab === "profile" || activeTab === "settings";

  if (isDashboardLayout) {
    return (
      <div className="min-h-screen w-full bg-[#f4f5f7] text-gray-900 flex flex-col md:flex-row font-sans selection:bg-black selection:text-white">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden md:flex w-64 bg-transparent p-6 lg:p-8 flex-col justify-between shrink-0 border-r border-gray-200/70 sticky top-0 h-screen">
          <div className="space-y-8">
            <div
              onClick={() => setActiveTab("translate")}
              className="font-display text-2xl font-light tracking-tight text-gray-900 cursor-pointer select-none"
            >
              BionicText
            </div>

            <nav className="space-y-1.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("translate")}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-gray-600 hover:text-gray-900 hover:bg-white/60 transition-all text-start"
              >
                <Home className="size-4 text-gray-400" />
                <span>{t("nav.home", siteLang)}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all text-start font-semibold ${
                  activeTab === "profile"
                    ? "bg-white text-gray-900 shadow-xs border border-gray-200/70"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
                }`}
              >
                <User className="size-4 text-gray-900" />
                <span>{t("nav.profile", siteLang)}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("test")}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-gray-600 hover:text-gray-900 hover:bg-white/60 transition-all text-start"
              >
                <FileText className="size-4 text-gray-400" />
                <span>{t("nav.test", siteLang)}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("assistant")}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-gray-600 hover:text-gray-900 hover:bg-white/60 transition-all text-start"
              >
                <Zap className="size-4 text-gray-400" />
                <span>{t("nav.assistant", siteLang)}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all text-start font-semibold ${
                  activeTab === "settings"
                    ? "bg-white text-gray-900 shadow-xs border border-gray-200/70"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
                }`}
              >
                <Settings className="size-4 text-gray-500" />
                <span>{t("nav.settings", siteLang)}</span>
              </button>
            </nav>
          </div>

          <div className="pt-8 space-y-2 text-[11px] text-gray-400">
            <div className="h-px w-6 bg-gray-300" />
            <p className="leading-relaxed font-medium text-gray-500">{t("tagline", siteLang)}</p>
            <div className="flex items-center gap-1 text-gray-500 font-medium pt-1">
              <span className="size-1.5 rotate-45 border border-gray-400 inline-block" />
              <span>BionicText</span>
            </div>
          </div>
        </aside>

        {/* MOBILE TOPBAR IN DASHBOARD */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white/95 backdrop-blur-md border-b border-gray-200/80 sticky top-0 z-40">
          <div
            onClick={() => setActiveTab("translate")}
            className="font-display text-xl font-light tracking-tight text-gray-900 cursor-pointer"
          >
            BionicText
          </div>

          <div className="flex items-center gap-2">
            <SiteLanguageSwitcher siteLang={siteLang} onSelect={handleSiteLanguageSelect} />
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`p-2 rounded-full border transition-colors ${
                activeTab === "settings"
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-white text-gray-700"
              }`}
              title={t("nav.settings", siteLang)}
              aria-label={t("nav.settings", siteLang)}
            >
              <Settings className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-full border border-gray-200 bg-white text-gray-800"
              aria-label={t("nav.menu", siteLang)}
            >
              {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {/* MOBILE DRAWER OVERLAY */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
            <div className="bg-white rounded-t-3xl p-6 space-y-4 max-h-[80vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="font-display text-lg font-medium text-gray-900">
                  {t("nav.menu", siteLang)}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-black"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                <button
                  onClick={() => {
                    setActiveTab("translate");
                    setMobileMenuOpen(false);
                  }}
                  className="p-3 rounded-2xl border border-gray-200 flex flex-col items-start gap-2 text-gray-800 hover:bg-gray-50"
                >
                  <Home className="size-4 text-gray-500" />
                  <span>{t("nav.translate", siteLang)}</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab("profile");
                    setMobileMenuOpen(false);
                  }}
                  className="p-3 rounded-2xl border border-gray-900 bg-gray-50 flex flex-col items-start gap-2 text-gray-900 font-semibold"
                >
                  <User className="size-4 text-black" />
                  <span>{t("nav.profile", siteLang)}</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab("test");
                    setMobileMenuOpen(false);
                  }}
                  className="p-3 rounded-2xl border border-gray-200 flex flex-col items-start gap-2 text-gray-800 hover:bg-gray-50"
                >
                  <FileText className="size-4 text-gray-500" />
                  <span>{t("nav.test", siteLang)}</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab("assistant");
                    setMobileMenuOpen(false);
                  }}
                  className="p-3 rounded-2xl border border-gray-200 flex flex-col items-start gap-2 text-gray-800 hover:bg-gray-50"
                >
                  <Zap className="size-4 text-gray-500" />
                  <span>{t("nav.assistant", siteLang)}</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab("settings");
                    setMobileMenuOpen(false);
                  }}
                  className="p-3 rounded-2xl border border-gray-200 flex flex-col items-start gap-2 text-gray-800 hover:bg-gray-50"
                >
                  <Settings className="size-4 text-gray-500" />
                  <span>{t("nav.settings", siteLang)}</span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onSignOut) onSignOut();
                  }}
                  className="p-3 rounded-2xl border border-red-200 bg-red-50/50 flex flex-col items-start gap-2 text-red-600"
                >
                  <LogOut className="size-4 text-red-500" />
                  <span>{t("btn.logout", siteLang)}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN DASHBOARD CONTENT */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto min-w-0">
          <header className="hidden md:flex px-6 lg:px-10 py-5 items-center justify-end gap-3.5 border-b border-gray-200/50">
            <SiteLanguageSwitcher siteLang={siteLang} onSelect={handleSiteLanguageSelect} />
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-black shadow-2xs transition-colors"
              title={t("theme.toggle", siteLang)}
            >
              {isDarkMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </button>

            <div ref={profileDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 rounded-full border border-gray-200 bg-white py-1.5 pl-2 pr-3.5 text-xs font-medium text-gray-800 shadow-2xs hover:border-gray-300 transition-all"
              >
                <div className="flex size-6 items-center justify-center rounded-full bg-[#121620] text-white text-[11px] font-bold">
                  {userInitial}
                </div>
                <span className="max-w-[130px] truncate">{username}</span>
                <ChevronDown className="size-3 text-gray-400" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute end-0 top-full mt-2 z-50 w-60 rounded-3xl border border-gray-200 bg-white p-3 shadow-2xl space-y-2 animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-[#121620] text-white text-xs font-bold">
                      {userInitial}
                    </div>
                    <div className="overflow-hidden text-xs">
                      <div className="font-semibold text-gray-900 truncate">{userEmail}</div>
                      <div className="text-[10px] text-gray-500 font-medium">
                        {t("user.account", siteLang)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("profile");
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-800 hover:bg-gray-100 transition-colors text-start"
                    >
                      <div className="flex items-center gap-2">
                        <User className="size-3.5 text-gray-500" />
                        <span>{t("nav.profileShort", siteLang)}</span>
                      </div>
                      <ArrowRight className="size-3 text-gray-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("settings");
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-800 hover:bg-gray-100 transition-colors text-start"
                    >
                      <div className="flex items-center gap-2">
                        <Settings className="size-3.5 text-gray-500" />
                        <span>{t("nav.settings", siteLang)}</span>
                      </div>
                      <ArrowRight className="size-3 text-gray-400" />
                    </button>
                  </div>

                  <div className="h-px bg-gray-100 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      if (onSignOut) onSignOut();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <LogOut className="size-3.5" />
                      <span>{t("btn.logout", siteLang)}</span>
                    </div>
                    <ArrowRight className="size-3 text-red-400" />
                  </button>
                </div>
              )}
            </div>
          </header>

          <main className="p-4 sm:p-6 lg:p-10 flex-1 pb-24 md:pb-10 max-w-7xl w-full mx-auto">
            {activeTab === "profile" && (
              <ProfilePage
                userEmail={userEmail}
                onNavigate={(tab) => {
                  if (tab === "home") setActiveTab("translate");
                  else if (tab === "tests") setActiveTab("test");
                  else if (tab === "assistant") setActiveTab("assistant");
                  else if (tab === "settings") setActiveTab("settings");
                  else if (tab === "profile") setActiveTab("profile");
                }}
              />
            )}
            {activeTab === "settings" && <SettingsPage />}
          </main>
        </div>

        {/* MOBILE BOTTOM NAVIGATION BAR FOR DASHBOARD */}
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-gray-200/80 px-2 py-2 z-40 flex items-center justify-around shadow-lg safe-area-bottom">
          <button
            onClick={() => setActiveTab("translate")}
            className="flex flex-col items-center gap-1 p-2 text-[10px] text-gray-500 hover:text-black font-medium"
          >
            <Home className="size-4" />
            <span>{t("nav.translate", siteLang)}</span>
          </button>
          <button
            onClick={() => setActiveTab("test")}
            className="flex flex-col items-center gap-1 p-2 text-[10px] text-gray-500 hover:text-black font-medium"
          >
            <FileText className="size-4" />
            <span>{t("nav.testShort", siteLang)}</span>
          </button>
          <button
            onClick={() => setActiveTab("assistant")}
            className="flex flex-col items-center gap-1 p-2 text-[10px] text-gray-500 hover:text-black font-medium"
          >
            <Zap className="size-4" />
            <span>AI</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center gap-1 p-2 text-[10px] font-semibold ${
              activeTab === "profile" ? "text-black" : "text-gray-500"
            }`}
          >
            <User className="size-4" />
            <span>{t("nav.profileShort", siteLang)}</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center gap-1 p-2 text-[10px] font-semibold ${
              activeTab === "settings" ? "text-black" : "text-gray-500"
            }`}
          >
            <Settings className="size-4" />
            <span>{t("nav.settings", siteLang)}</span>
          </button>
        </div>
      </div>
    );
  }

  // STANDARD RESPONSIVE WORKSPACE VIEW (Translate / Test / Exercises / Race / Assistant)
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#e5e5e7] text-gray-900 flex flex-col justify-between selection:bg-black selection:text-white">
      {/* BACKGROUND MOUNTAIN WITH HALO */}
      <img
        src="/bionic-mountain-background.png"
        alt="BionicText Mountain Background"
        className="fixed inset-0 h-full w-full object-cover object-center pointer-events-none opacity-80 mix-blend-multiply"
      />
      <div className="fixed inset-0 bg-radial from-transparent via-black/5 to-black/20 pointer-events-none" />

      {/* TOP NAVBAR */}
      <header className="relative z-30 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-3.5 sm:py-5 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => setActiveTab("translate")}
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <span className="font-display text-xl sm:text-2xl lg:text-3xl font-light tracking-tight text-gray-900">
            BionicText
          </span>
        </div>

        {/* Center Pill Navigation (Desktop & Tablet) */}
        <nav className="hidden lg:flex items-center gap-1 rounded-full border border-gray-300/80 bg-white/80 p-1.5 shadow-xs backdrop-blur-md">
          <button
            onClick={() => setActiveTab("translate")}
            className={`px-4 py-1.5 text-xs sm:text-sm transition-all rounded-full font-medium ${
              activeTab === "translate"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200/80 font-semibold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("nav.translate", siteLang)}
          </button>

          <button
            onClick={() => setActiveTab("test")}
            className={`px-4 py-1.5 text-xs sm:text-sm transition-all rounded-full font-medium ${
              activeTab === "test"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200/80 font-semibold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("nav.test", siteLang)}
          </button>

          <button
            onClick={() => setActiveTab("race")}
            className={`px-4 py-1.5 text-xs sm:text-sm transition-all rounded-full font-medium ${
              activeTab === "race"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200/80 font-semibold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("nav.race", siteLang)}
          </button>

          <button
            onClick={() => setActiveTab("assistant")}
            className={`px-4 py-1.5 text-xs sm:text-sm transition-all rounded-full font-medium ${
              activeTab === "assistant"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200/80 font-semibold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t("nav.assistant", siteLang)}
          </button>
        </nav>

        {/* Right User Profile & Language Switcher Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          <SiteLanguageSwitcher siteLang={siteLang} onSelect={handleSiteLanguageSelect} />

          {isLoggedIn ? (
            <div ref={profileDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 rounded-full border border-gray-300/90 bg-white/90 py-1.5 pl-1.5 pr-2.5 sm:pr-3.5 text-xs sm:text-sm font-medium text-gray-800 shadow-xs backdrop-blur-md transition-all hover:bg-white active:scale-98"
              >
                <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-tr from-neutral-900 via-neutral-700 to-neutral-500 text-white text-xs font-bold shadow-2xs">
                  {userInitial}
                </div>
                <span className="hidden sm:inline max-w-[120px] truncate text-gray-900 font-semibold">
                  {username}
                </span>
                <ChevronDown
                  className={`size-3.5 text-gray-500 transition-transform duration-200 ${
                    profileDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {profileDropdownOpen && (
                <div className="absolute end-0 top-full mt-2 z-50 w-60 rounded-3xl border border-gray-200 bg-white/95 p-3 shadow-2xl backdrop-blur-xl space-y-2 animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-black text-white text-sm font-bold shrink-0 shadow-xs">
                      {userInitial}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-semibold text-gray-900 truncate">
                        {userEmail}
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium">
                        {t("user.account", siteLang)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setActiveTab("profile");
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium text-gray-800 hover:bg-gray-100 transition-colors text-start group"
                    >
                      <div className="flex items-center gap-2.5">
                        <User className="size-4 text-gray-500 group-hover:text-black" />
                        <span>{t("nav.profile", siteLang)}</span>
                      </div>
                      <ArrowRight className="size-3 text-gray-400 group-hover:text-black" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setActiveTab("settings");
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium text-gray-800 hover:bg-gray-100 transition-colors text-start group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Settings className="size-4 text-gray-500 group-hover:text-black" />
                        <span>{t("nav.settings", siteLang)}</span>
                      </div>
                      <ArrowRight className="size-3 text-gray-400 group-hover:text-black" />
                    </button>
                  </div>

                  <div className="h-px bg-gray-100 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      if (onSignOut) onSignOut();
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <LogOut className="size-4" />
                      <span>{t("btn.logout", siteLang)}</span>
                    </div>
                    <ArrowRight className="size-3 text-red-400" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onGoToLogin}
              className="flex items-center gap-2 rounded-full border border-gray-300/80 bg-white/80 py-1.5 pl-3.5 pr-1.5 text-xs sm:text-sm font-medium text-gray-800 shadow-xs backdrop-blur-sm transition-colors hover:bg-white"
            >
              <span>{t("btn.login", siteLang)}</span>
              <span className="flex size-6 sm:size-7 items-center justify-center rounded-full bg-black text-white">
                <ArrowRight className="size-3 sm:size-3.5" />
              </span>
            </button>
          )}
        </div>
      </header>

      {/* MAIN BODY */}
      <main className="w-full max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 z-10 flex-1 flex flex-col justify-center pb-24 lg:pb-6">
        {activeTab !== "translate" ? (
          <div className="py-1 sm:py-2">
            {activeTab === "test" && (
              <ReadingTestPage
                onBackToTranslate={() => setActiveTab("translate")}
                onGoToProfile={() => setActiveTab("profile")}
              />
            )}
            {activeTab === "race" && (
              <ReadingRacePage
                onBackToTranslate={() => setActiveTab("translate")}
                userEmail={userEmail}
              />
            )}
            {activeTab === "assistant" && (
              <AIAssistantPage onBackToTranslate={() => setActiveTab("translate")} />
            )}
          </div>
        ) : (
          /* Çeviri Screen */
          <div className="space-y-4 sm:space-y-6">
            {/* CENTRAL TRANSLATION & BIONIC CARD */}
            <div className="relative rounded-3xl border border-gray-200/90 bg-white/95 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] p-4 sm:p-6 lg:p-7 backdrop-blur-md">
              {/* Language Selector Bar */}
              <div className="flex items-center justify-between sm:justify-center gap-2 sm:gap-6 pb-3 sm:pb-4 border-b border-gray-100 text-xs sm:text-sm font-medium text-gray-800">
                {/* Source Language Dropdown */}
                <div ref={sourceDropdownRef} className="relative flex-1 sm:flex-initial">
                  <button
                    type="button"
                    onClick={() => {
                      setSourceDropdownOpen(!sourceDropdownOpen);
                      setTargetDropdownOpen(false);
                    }}
                    className="w-full sm:w-auto flex items-center justify-between gap-1.5 sm:gap-2 px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-full border border-gray-200 bg-gray-50/90 hover:bg-white hover:border-gray-300 text-xs sm:text-sm font-medium text-gray-900 transition-all shadow-2xs active:scale-98"
                  >
                    <span className="text-base sm:text-sm">{currentSource.flag}</span>
                    <span className="font-semibold truncate max-w-[85px] sm:max-w-none">
                      {currentSource.nativeName}
                    </span>
                    <ChevronDown
                      className={`size-3 text-gray-400 shrink-0 transition-transform duration-150 ${
                        sourceDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {sourceDropdownOpen && (
                    <div className="absolute start-0 top-full mt-2 z-50 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl space-y-1 max-h-72 flex flex-col animate-in fade-in-50 duration-150">
                      <div className="relative pb-1">
                        <Search className="absolute left-2.5 top-2.5 size-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={sourceSearch}
                          onChange={(e) => setSourceSearch(e.target.value)}
                          placeholder={t("select.search", siteLang)}
                          className="w-full pl-8 pr-3 py-1 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-900 focus:outline-none focus:border-black"
                        />
                      </div>
                      <div className="overflow-y-auto max-h-56 space-y-0.5 divide-y divide-gray-50">
                        {LANGUAGES.filter(
                          (l) =>
                            l.name.toLowerCase().includes(sourceSearch.toLowerCase()) ||
                            l.nativeName.toLowerCase().includes(sourceSearch.toLowerCase()) ||
                            l.code.toLowerCase().includes(sourceSearch.toLowerCase()),
                        ).map((lang) => (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => {
                              setSourceLang(lang.code);
                              setSourceDropdownOpen(false);
                              setSourceSearch("");
                              handleTranslate(undefined, lang.code, targetLang);
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors ${
                              sourceLang === lang.code
                                ? "font-semibold text-black bg-gray-100"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{lang.flag}</span>
                              <span className="truncate">{lang.nativeName}</span>
                            </div>
                            {sourceLang === lang.code && <Check className="size-3.5 text-black" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Swap button */}
                <button
                  type="button"
                  onClick={handleSwapLanguages}
                  className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:text-black hover:bg-gray-50 shadow-2xs transition-all active:scale-90"
                  title={t("btn.swap", siteLang)}
                  aria-label={t("btn.swap", siteLang)}
                >
                  <ArrowLeftRight className="size-3.5" />
                </button>

                {/* Target Language Dropdown */}
                <div ref={targetDropdownRef} className="relative flex-1 sm:flex-initial">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetDropdownOpen(!targetDropdownOpen);
                      setSourceDropdownOpen(false);
                    }}
                    className="w-full sm:w-auto flex items-center justify-between gap-1.5 sm:gap-2 px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-full border border-gray-200 bg-gray-50/90 hover:bg-white hover:border-gray-300 text-xs sm:text-sm font-medium text-gray-900 transition-all shadow-2xs active:scale-98"
                  >
                    <span className="text-base sm:text-sm">{currentTarget.flag}</span>
                    <span className="font-semibold truncate max-w-[85px] sm:max-w-none">
                      {currentTarget.nativeName}
                    </span>
                    <ChevronDown
                      className={`size-3 text-gray-400 shrink-0 transition-transform duration-150 ${
                        targetDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {targetDropdownOpen && (
                    <div className="absolute end-0 top-full mt-2 z-50 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl space-y-1 max-h-72 flex flex-col animate-in fade-in-50 duration-150">
                      <div className="relative pb-1">
                        <Search className="absolute left-2.5 top-2.5 size-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={targetSearch}
                          onChange={(e) => setTargetSearch(e.target.value)}
                          placeholder={t("select.search", siteLang)}
                          className="w-full pl-8 pr-3 py-1 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-900 focus:outline-none focus:border-black"
                        />
                      </div>
                      <div className="overflow-y-auto max-h-56 space-y-0.5 divide-y divide-gray-50">
                        {LANGUAGES.filter(
                          (l) =>
                            l.name.toLowerCase().includes(targetSearch.toLowerCase()) ||
                            l.nativeName.toLowerCase().includes(targetSearch.toLowerCase()) ||
                            l.code.toLowerCase().includes(targetSearch.toLowerCase()),
                        ).map((lang) => (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => {
                              setTargetLang(lang.code);
                              setTargetDropdownOpen(false);
                              setTargetSearch("");
                              handleTranslate(undefined, sourceLang, lang.code);
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-colors ${
                              targetLang === lang.code
                                ? "font-semibold text-black bg-gray-100"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{lang.flag}</span>
                              <span className="truncate">{lang.nativeName}</span>
                            </div>
                            {targetLang === lang.code && <Check className="size-3.5 text-black" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2-Column Split / Mobile Stack: Left Input | Right Output */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 pt-3 sm:pt-4 min-h-[300px]">
                {/* LEFT: Source Input */}
                <div className="flex flex-col justify-between lg:border-r lg:border-gray-100 lg:pr-6 h-full space-y-3">
                  <div className="min-h-[140px] sm:min-h-[190px] h-full overflow-y-auto pr-1">
                    <textarea
                      value={sourceText}
                      onChange={(e) => {
                        setSourceText(e.target.value);
                        if (!e.target.value.trim()) setTranslatedText("");
                      }}
                      placeholder={t("placeholder.source", siteLang)}
                      className="w-full h-full min-h-[140px] resize-none bg-transparent font-sans text-sm sm:text-base leading-relaxed text-gray-800 placeholder:text-gray-400 outline-none"
                      maxLength={5000}
                    />
                  </div>

                  {/* Left Column Bottom Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-gray-100 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-gray-400">
                        {sourceText.length} / 5000
                      </span>
                      {sourceText.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearText}
                          className="p-1 rounded-md text-gray-400 hover:text-red-500 transition-colors"
                          title={t("btn.clear", siteLang)}
                          aria-label={t("btn.clear", siteLang)}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.md,.text"
                        onChange={handleFileUpload}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={toggleSpeechRecognition}
                        className={`p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors shadow-2xs active:scale-95 ${
                          isListening ? "text-red-500 border-red-300 animate-pulse bg-red-50" : ""
                        }`}
                        title={t("btn.voice", siteLang)}
                        aria-label={t("btn.voice", siteLang)}
                      >
                        {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors shadow-2xs active:scale-95"
                        title={t("btn.upload", siteLang)}
                        aria-label={t("btn.upload", siteLang)}
                      >
                        <Upload className="size-4" />
                      </button>

                      <button
                        type="button"
                        disabled={isTranslating}
                        onClick={() => handleTranslate()}
                        className="flex items-center gap-1.5 rounded-full bg-[#1c1c1e] hover:bg-black text-white px-4 sm:px-5 py-2 text-xs font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                      >
                        <span>
                          {isTranslating
                            ? t("btn.translating", siteLang)
                            : t("btn.translate", siteLang)}
                        </span>
                        <ArrowRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Bionic Output */}
                <div className="flex flex-col justify-between lg:pl-2 h-full space-y-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2.5 shrink-0">
                        <span className="text-xs sm:text-sm font-medium text-gray-500">
                          {translatedText
                            ? t("label.targetResult", siteLang)
                            : t("placeholder.target", siteLang)}
                        </span>

                        <div className="flex items-center gap-1.5 text-gray-500">
                          <button
                            onClick={handleCopy}
                            className="p-1.5 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
                            title={copied ? t("btn.copied", siteLang) : t("btn.copy", siteLang)}
                            aria-label={t("btn.copy", siteLang)}
                          >
                            {copied ? (
                              <Check className="size-4 text-emerald-600" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </button>
                          <button
                            onClick={handleSpeak}
                            className={`p-1.5 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors ${
                              isSpeaking ? "text-black bg-gray-100" : ""
                            }`}
                            title={
                              isSpeaking ? t("btn.stopListen", siteLang) : t("btn.listen", siteLang)
                            }
                            aria-label={t("btn.listen", siteLang)}
                          >
                            {isSpeaking ? (
                              <VolumeX className="size-4" />
                            ) : (
                              <Volume2 className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Biyonik Okuma Control Box */}
                      <div className="rounded-2xl border border-gray-200/80 bg-gray-50/80 p-3 flex flex-wrap items-center justify-between gap-2.5 mb-3 shrink-0">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-semibold text-gray-900">
                            {t("bionic.mode", siteLang)}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isBionic}
                            onClick={() => setIsBionic(!isBionic)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                              isBionic ? "bg-[#1c1c1e]" : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                                isBionic ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsReaderModalOpen(true)}
                          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs px-2.5 py-1.5 font-semibold shadow-2xs transition-colors active:scale-95"
                        >
                          <BookOpen className="size-3.5 text-gray-600" />
                          <span>{t("btn.fullscreen", siteLang)}</span>
                          <ArrowRight className="size-3" />
                        </button>
                      </div>

                      {/* Rendered Text Scrollbox */}
                      <div className="min-h-[120px] sm:min-h-[145px] max-h-[220px] overflow-y-auto pr-1 text-sm sm:text-base leading-relaxed text-gray-900 font-sans tracking-normal select-text">
                        {translatedText ? (
                          isBionic ? (
                            <div
                              dangerouslySetInnerHTML={{
                                __html: convertToBionicHtml(translatedText, {
                                  fixation: userSettings.bionicFixation,
                                  saccade: userSettings.saccadeStep,
                                }),
                              }}
                            />
                          ) : (
                            <p>{translatedText}</p>
                          )
                        ) : (
                          <p className="text-gray-400 italic text-xs sm:text-sm">
                            {t("label.noTextYet", siteLang)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM 3 FEATURE HIGHLIGHTS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 pt-2 pb-2 text-center text-gray-800">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 backdrop-blur-xs border border-gray-200/60 shadow-2xs">
                <span className="flex size-9 items-center justify-center rounded-xl bg-gray-100 text-gray-800 shrink-0">
                  <Zap className="size-4" />
                </span>
                <div className="text-start">
                  <div className="text-xs font-semibold text-gray-900">
                    {t("feature.fastTitle", siteLang)}
                  </div>
                  <div className="text-[11px] text-gray-500">{t("feature.fastDesc", siteLang)}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 backdrop-blur-xs border border-gray-200/60 shadow-2xs">
                <span className="flex size-9 items-center justify-center rounded-xl bg-gray-100 text-gray-800 shrink-0">
                  <Globe className="size-4" />
                </span>
                <div className="text-start">
                  <div className="text-xs font-semibold text-gray-900">
                    {t("feature.multiTitle", siteLang)}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {t("feature.multiDesc", siteLang)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/70 backdrop-blur-xs border border-gray-200/60 shadow-2xs">
                <span className="flex size-9 items-center justify-center rounded-xl bg-gray-100 text-gray-800 shrink-0">
                  <Sparkles className="size-4" />
                </span>
                <div className="text-start">
                  <div className="text-xs font-semibold text-gray-900">
                    {t("feature.aiTitle", siteLang)}
                  </div>
                  <div className="text-[11px] text-gray-500">{t("feature.aiDesc", siteLang)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* DESKTOP FOOTER */}
      <footer className="hidden lg:flex relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-10 py-5 border-t border-gray-300/40 items-center justify-between text-xs text-gray-500 gap-4">
        <div className="flex items-center gap-3">
          <span>BionicText</span>
          <span>•</span>
          <span>{t("footer.desc", siteLang)}</span>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab("test")}
            className="hover:text-gray-900 transition-colors"
          >
            {t("nav.test", siteLang)}
          </button>
          <button
            onClick={() => setActiveTab("race")}
            className="hover:text-gray-900 transition-colors"
          >
            {t("nav.race", siteLang)}
          </button>
          <button
            onClick={() => setActiveTab("assistant")}
            className="hover:text-gray-900 transition-colors"
          >
            {t("nav.assistant", siteLang)}
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className="hover:text-gray-900 transition-colors font-medium text-gray-900"
          >
            {t("nav.profile", siteLang)}
          </button>
        </div>
      </footer>

      {/* MOBILE BOTTOM NAVIGATION (App-like 1-thumb switcher) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl border-t border-gray-200/90 px-1 py-1.5 z-40 flex items-center justify-around shadow-2xl safe-area-bottom">
        <button
          type="button"
          onClick={() => setActiveTab("translate")}
          className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition-all ${
            activeTab === "translate"
              ? "text-black font-semibold bg-gray-100/80"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Home className="size-4" />
          <span className="text-[10px]">{t("nav.translate", siteLang)}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("test")}
          className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition-all ${
            activeTab === "test"
              ? "text-black font-semibold bg-gray-100/80"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <FileText className="size-4" />
          <span className="text-[10px]">{t("nav.testShort", siteLang)}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("race")}
          className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition-all ${
            activeTab === "race"
              ? "text-black font-semibold bg-gray-100/80"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Zap className="size-4" />
          <span className="text-[10px]">{t("nav.race", siteLang)}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("assistant")}
          className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition-all ${
            activeTab === "assistant"
              ? "text-black font-semibold bg-gray-100/80"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Zap className="size-4" />
          <span className="text-[10px]">AI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition-all ${"text-gray-500 hover:text-gray-900"}`}
        >
          <User className="size-4" />
          <span className="text-[10px]">{t("nav.profileShort", siteLang)}</span>
        </button>
      </nav>

      {/* FULLSCREEN READER MODAL */}
      <ReaderModal
        isOpen={isReaderModalOpen}
        onClose={() => setIsReaderModalOpen(false)}
        text={translatedText || sourceText}
        isBionic={isBionic}
        lang={translatedText ? targetLang : sourceLang}
      />
    </div>
  );
}
