import React, { useState, useRef, useEffect } from "react";
import { getLanguageMeta, useSiteLanguage } from "@/lib/i18n";
import {
  Bot,
  Sparkles,
  Paperclip,
  Mic,
  MicOff,
  Send,
  RotateCcw,
  CheckCheck,
  Zap,
  ArrowRight,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { convertToBionicHtml } from "./bionic-transformer";
import { getUserSettings, type UserSettings } from "@/lib/user-settings-store";
import { logAIInteraction } from "@/lib/supabase-db";

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  time: string;
}

interface AIAssistantPageProps {
  onBackToTranslate?: () => void;
}

interface ISpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult:
    | ((event: {
        results: { [index: number]: { [index: number]: { transcript: string } } };
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

const QUICK_PROMPTS = [
  "Aşağıya yapıştıracağım metni daha sade ve akıcı bir dille yeniden yaz.",
  "Resmi ama sıcak bir dille, toplantı erteleme e-postası taslağı yaz.",
  "Okuma hızımı artırmak için bana 7 günlük kısa bir çalışma planı hazırla.",
  "Biyonik fiksasyon ve sakkad ayarlarını hangi durumda nasıl kullanmalıyım?",
];

/** Gönderilecek en fazla geçmiş mesaj sayısı (sunucu da ayrıca sınırlar). */
const MAX_HISTORY = 12;
/** Dosyadan alınabilecek en fazla karakter. */
const MAX_UPLOAD_CHARS = 12000;

export function AIAssistantPage({ onBackToTranslate }: AIAssistantPageProps) {
  const { siteLang } = useSiteLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBionicFormat, setIsBionicFormat] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>("Gemini AI");
  const [userSettings, setUserSettings] = useState<UserSettings>(getUserSettings());

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<ISpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setUserSettings(getUserSettings());
    const handleSettingsUpdate = (e: CustomEvent<UserSettings>) => {
      if (e.detail) setUserSettings(e.detail);
    };
    window.addEventListener("bionictext_settings_changed", handleSettingsUpdate as EventListener);
    return () => {
      window.removeEventListener(
        "bionictext_settings_changed",
        handleSettingsUpdate as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const toggleSpeechRecognition = () => {
    const win = window as unknown as {
      SpeechRecognition?: new () => ISpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => ISpeechRecognitionInstance;
    };

    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      toast.error("Tarayıcınız sesle yazmayı desteklemiyor.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = getLanguageMeta(siteLang).locale;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript ?? "";
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      toast.error("Mikrofon başlatılamadı.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        setInputText(content.slice(0, MAX_UPLOAD_CHARS));
        if (content.length > MAX_UPLOAD_CHARS) {
          toast.warning(
            `"${file.name}" uzun olduğu için ilk ${MAX_UPLOAD_CHARS.toLocaleString()} karakter alındı.`,
          );
        } else {
          toast.success(`"${file.name}" metni yüklendi.`);
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Giriş alanını içeriğe göre büyüt (en fazla ~6 satır)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [inputText]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
    } catch {
      toast.error("Kopyalanamadı. Metni seçip kopyalayabilirsiniz.");
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const query = (customPrompt || inputText).trim();
    if (!query || isLoading) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: query,
      time: timeStr,
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInputText("");
    setIsLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/groq-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: query,
          lang: siteLang,
          messages: updatedHistory.slice(-MAX_HISTORY).map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.text) {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: data.text,
          time: `${String(new Date().getHours()).padStart(2, "0")}:${String(
            new Date().getMinutes(),
          ).padStart(2, "0")}`,
        };
        setMessages((prev) => [...prev, aiMsg]);
        if (data.model) setCurrentModel(`Gemini AI (${data.model})`);

        logAIInteraction({
          role: "assistant",
          prompt: query,
          response: data.text,
          model: data.model || "gemini-3.5-flash",
        }).catch(() => {});
      } else {
        const fallbackText = data.message || "Yanıt alınamadı. Lütfen birazdan tekrar deneyin.";
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: fallbackText,
          time: timeStr,
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      const errorMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: "Bağlantı sırasında bir sorun oluştu. Lütfen tekrar deneyin.",
        time: timeStr,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    abortRef.current?.abort();
    setIsLoading(false);
    setMessages([]);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 font-sans text-gray-900 pb-8">
      {/* CHAT CONTAINER */}
      <div className="relative rounded-3xl border border-gray-200/90 bg-white/95 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] p-3.5 sm:p-6 backdrop-blur-md min-h-[500px] sm:min-h-[580px] flex flex-col justify-between overflow-hidden">
        {/* Chat Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-gray-900 text-white shadow-2xs">
              <Bot className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-xs sm:text-sm font-semibold text-gray-900">
                  BionicText AI Asistan
                </span>
                <span className="flex size-2 rounded-full bg-emerald-500" />
              </div>
              <div className="text-[11px] sm:text-[10px] text-gray-400 font-mono">
                {currentModel}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBionicFormat(!isBionicFormat)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-all active:scale-95 ${
                isBionicFormat
                  ? "bg-black text-white shadow-2xs"
                  : "border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
              title="Yapay zeka yanıtlarında biyonik vurguları aç/kapat"
            >
              <Zap className="size-3" />
              <span>Biyonik Vurgu: {isBionicFormat ? "Açık" : "Kapalı"}</span>
            </button>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-black py-1 px-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Sohbeti Temizle"
                aria-label="Sohbeti Temizle"
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">Temizle</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto py-3 sm:py-4 space-y-3.5 pr-1 scroll-smooth overscroll-contain min-h-[220px] max-h-[calc(100dvh-25rem)] sm:max-h-[460px]"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-6">
              <div className="size-11 sm:size-12 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 shadow-2xs">
                <Bot className="size-5 sm:size-6" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="font-display text-sm sm:text-base font-semibold text-gray-900">
                  BionicText Asistanına Hoş Geldiniz
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed px-2">
                  Metinlerinizi sadeleştirebilir, biyonik okuma teknikleri hakkında bilgi alabilir
                  veya hızlı okuma testlerinizi geliştirebilirsiniz.
                </p>
              </div>

              {/* Quick Starter Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl pt-2">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(qp);
                      handleSendMessage(qp);
                    }}
                    className="p-2.5 sm:p-3 rounded-2xl border border-gray-200/80 bg-gray-50/50 hover:bg-white hover:border-gray-300 text-left text-xs text-gray-700 hover:text-gray-900 transition-all shadow-2xs group flex items-center justify-between active:scale-98"
                  >
                    <span className="line-clamp-2">{qp}</span>
                    <ArrowRight
                      className="size-3.5 text-gray-400 group-hover:text-black shrink-0 ml-2 rtl:rotate-180"
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 sm:gap-3 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser && (
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 mt-1">
                      <Sparkles className="size-3.5 fill-current" />
                    </span>
                  )}

                  <div
                    className={`max-w-[88%] sm:max-w-[78%] rounded-2xl p-3 sm:p-4 text-xs sm:text-sm leading-relaxed space-y-1.5 shadow-2xs ${
                      isUser
                        ? "bg-gray-100/90 text-gray-900 rounded-tr-xs"
                        : "bg-white border border-gray-200/80 text-gray-800 rounded-tl-xs"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-line select-text">{msg.text}</p>
                    ) : isBionicFormat ? (
                      <div
                        className="select-text whitespace-pre-line"
                        dangerouslySetInnerHTML={{
                          __html: convertToBionicHtml(msg.text, {
                            fixation: userSettings.bionicFixation,
                            saccade: userSettings.saccadeStep,
                          }),
                        }}
                      />
                    ) : (
                      <p className="whitespace-pre-line select-text">{msg.text}</p>
                    )}

                    <div
                      className={`flex items-center gap-1 text-[11px] font-mono ${
                        isUser ? "justify-end text-gray-400" : "justify-end text-gray-400"
                      }`}
                    >
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="mr-auto inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-sans font-medium text-gray-500 hover:bg-gray-100 hover:text-black"
                          aria-label="Yanıtı kopyala"
                        >
                          {copiedId === msg.id ? (
                            <Check className="size-3" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                          {copiedId === msg.id ? "Kopyalandı" : "Kopyala"}
                        </button>
                      )}
                      <span>{msg.time}</span>
                      {isUser && <CheckCheck className="size-3 text-blue-500" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-gray-100 text-gray-700">
                <Sparkles className="size-3.5 animate-spin" />
              </span>
              <div className="rounded-2xl bg-white border border-gray-200 px-4 py-3 text-xs text-gray-500 flex items-center gap-1.5 shadow-2xs">
                <span className="size-1.5 rounded-full bg-gray-400 animate-bounce" />
                <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
                <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-2 font-mono text-[11px]">Düşünüyor...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Composer */}
        <div className="pt-2.5 border-t border-gray-100 shrink-0 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="relative flex items-end rounded-3xl border border-gray-200 bg-gray-50/70 pl-4 pr-1.5 py-1.5 shadow-2xs focus-within:border-black focus-within:bg-white transition-all"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                // Masaüstünde Enter gönderir, Shift+Enter yeni satır. Dokunmatikte Enter yeni satırdır.
                if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
                if (window.matchMedia("(pointer: coarse)").matches) return;
                e.preventDefault();
                handleSendMessage();
              }}
              enterKeyHint="send"
              autoComplete="off"
              maxLength={12000}
              placeholder="Bir metin yazın, yapıştırın veya soru sorun..."
              className="w-full resize-none bg-transparent py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none pr-2 max-h-40 leading-relaxed"
              disabled={isLoading}
            />

            <div className="flex items-center gap-1 shrink-0 pb-0.5">
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
                className="p-2 rounded-full text-gray-500 hover:text-black hover:bg-gray-200/60 transition-colors"
                title="Metin Belgesi Ekle"
                aria-label="Metin Belgesi Ekle"
              >
                <Paperclip className="size-4" />
              </button>

              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`p-2 rounded-full transition-colors ${
                  isListening
                    ? "bg-red-50 text-red-500 animate-pulse"
                    : "text-gray-500 hover:text-black hover:bg-gray-200/60"
                }`}
                title="Sesle Yaz"
                aria-label="Sesle Yaz"
              >
                {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>

              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="flex size-8 sm:size-9 items-center justify-center rounded-full bg-black text-white hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-black transition-all shadow-xs active:scale-95"
                title="Gönder"
                aria-label="Gönder"
              >
                <Send className="size-3.5" />
              </button>
            </div>
          </form>

          <div className="flex items-center justify-between text-[11px] text-gray-400 px-3">
            <span>BionicText AI yanıtları doğal ve biyonik okuma formatında sunar.</span>
            {onBackToTranslate && (
              <button
                type="button"
                onClick={onBackToTranslate}
                className="text-gray-500 hover:text-black underline font-medium"
              >
                Çeviriciye Dön
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
