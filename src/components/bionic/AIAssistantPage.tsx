import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Sparkles,
  Paperclip,
  Mic,
  MicOff,
  Send,
  RotateCcw,
  CheckCheck,
  User,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { convertToBionicHtml } from "./bionic-transformer";
import { getUserSettings, UserSettings } from "@/lib/user-settings-store";

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
  "Biyonik okuma teknikleri ile okuma hızımı nasıl artırabilirim?",
  "Zor ve akademik bir paragrafı özetleyip basitleştir.",
  "Hızlı okurken anlama derinliğini korumanın yolları nelerdir?",
  "Odaklanmayı artıran bir günlük çalışma rutini öner.",
];

export function AIAssistantPage({ onBackToTranslate }: AIAssistantPageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBionicFormat, setIsBionicFormat] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings>(getUserSettings());

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
      recognition.lang = "tr-TR";
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
        setInputText(content.slice(0, 4000));
        toast.success(`"${file.name}" metni yüklendi.`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
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

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/groq-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: query,
          model: "openai/gpt-oss-120b",
          messages: messages.map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.text) {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: data.text,
          time: `${String(new Date().getHours()).padStart(2, "0")}:${String(
            new Date().getMinutes(),
          ).padStart(2, "0")}`,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const fallbackText =
          data.error ||
          "Biyonik okuma, kelimelerin başlangıç harflerini kalınlaştırarak gözün sabitleme süresini azaltır. Bu sayede dikkat dağınıklığı azalır ve kavrama hızı 2 katına çıkar.";
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: fallbackText,
          time: timeStr,
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch {
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
    setMessages([]);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 select-none font-sans text-gray-900 pb-8">
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
                  BionicText AI
                </span>
                <span className="flex size-2 rounded-full bg-emerald-500" />
              </div>
              <div className="text-[9px] sm:text-[10px] text-gray-400 font-mono">
                Model: GPT-OSS-120B
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
          className="flex-1 overflow-y-auto py-3 sm:py-4 space-y-3.5 pr-1 scroll-smooth min-h-[260px] max-h-[420px]"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-6">
              <div className="size-11 sm:size-12 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 shadow-2xs">
                <Bot className="size-5 sm:size-6" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="font-display text-sm sm:text-base font-semibold text-gray-900">
                  Size nasıl yardımcı olabilirim?
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed px-2">
                  Metinlerinizi özetletebilir, karmaşık paragrafları basitleştirebilir veya hızlı
                  okuma teknikleri sorabilirsiniz.
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
                    <span className="text-gray-400 group-hover:text-black shrink-0 ml-2">→</span>
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
                        className="select-text"
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
                      className={`flex items-center gap-1 text-[10px] font-mono ${
                        isUser ? "justify-end text-gray-400" : "justify-end text-gray-400"
                      }`}
                    >
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
            className="flex items-center gap-2 rounded-2xl border border-gray-200/90 bg-gray-50/80 p-1.5 focus-within:border-gray-400 focus-within:bg-white transition-all shadow-2xs"
          >
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
              className="p-2 rounded-xl text-gray-500 hover:text-black hover:bg-gray-100 transition-colors shrink-0"
              title="Dosya Ekle"
              aria-label="Dosya Ekle"
            >
              <Paperclip className="size-4" />
            </button>

            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`p-2 rounded-xl text-gray-500 hover:text-black hover:bg-gray-100 transition-colors shrink-0 ${
                isListening ? "text-red-500 bg-red-50 animate-pulse" : ""
              }`}
              title="Sesle Yaz"
              aria-label="Sesle Yaz"
            >
              {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Sorunuzu yazın veya bir metin yapıştırın..."
              className="flex-1 bg-transparent px-2 text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 outline-none"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="flex size-9 items-center justify-center rounded-xl bg-black text-white hover:bg-neutral-800 disabled:opacity-40 transition-all shrink-0 active:scale-95"
              aria-label="Gönder"
            >
              <Send className="size-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
