import { ENGLISH_NAMES, resolveLanguage } from "./translate-core";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const DEFAULT_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "deepseek-r1-distill-llama-70b",
  "qwen-2.5-32b",
  "llama-3.2-11b-vision-preview",
  "openai/gpt-oss-120b",
];

const BIONICTEXT_SYSTEM_PROMPT = `Sen BionicText platformunun pratik, samimi ve uzman yapay zeka asistanısın.

BIONICTEXT HAKKINDA BİLGİLER:
BionicText, kelimelerin ilk harflerini fiksasyon noktası olarak kalınlaştırıp okuma hızını 2 ila 3 katına çıkaran ve odaklanmayı güçlendiren bir hızlı okuma platformudur. Sitede 8 dilde biyonik çevirici, 2 aşamalı okuma testi, kişisel kütüphane, tam ekran ve RSVP hızlı akış okuyucu, göz egzersizleri, okuma yarışı ve fiksasyon/font ayarları yer alır.

ZORUNLU CEVAP KURALLARI:
1. ÇOK KISA VE ÖZ YAZ: Cevapların kesinlikle maksimum 2 ila 4 cümle olmalıdır. Asla lafı uzatma, gereksiz giriş-çıkış kalıpları ve uzun listeler yapma.
2. DOĞAL VE DOĞRUDAN DİYALOG: Kullanıcı selam verdiğinde, hal hatır sorduğunda veya soru sorduğunda doğrudan ve samimi bir asistan gibi anında karşılık ver. (Örn: "Selam! İyiyim, teşekkür ederim. BionicText'te bugün hangi metin üzerinde çalışmak istersin?")
3. ASLA YILDIZ (**) VEYA MARKDOWN KULLANMA: Metin içinde '**', '*', '###', '__' gibi markdown işaretleri kesinlikle kullanma. Tamamen temiz, akıcı düz yazı (plain text) ile yaz.`;

function sanitizePlainResponse(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/_{2,}(.*?)_{2,}/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1")
    .trim();
}

async function getAvailableGroqModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data && Array.isArray(data.data)) {
        const remoteIds = data.data
          .map((m: { id: string }) => m.id)
          .filter(
            (id: string) =>
              !id.includes("whisper") && !id.includes("embed") && !id.includes("guard"),
          );
        if (remoteIds.length > 0) return remoteIds;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch Groq models:", e);
  }
  return DEFAULT_MODELS;
}

export async function callGroqAssistant(request: Request): Promise<Response> {
  try {
    const apiKey = process.env["GROQ_API_KEY"];
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "GROQ_API_KEY_MISSING",
          message:
            "Groq API anahtarı henüz eklenmemiş. Lütfen .env dosyanıza GROQ_API_KEY tanımlayın.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const body = (await request.json()) as {
      messages?: GroqMessage[];
      prompt?: string;
      model?: string;
      lang?: string;
    };

    let userMessages: GroqMessage[] = [];

    if (body.messages && Array.isArray(body.messages) && body.messages.length > 0) {
      userMessages = body.messages.filter((m) => m.role !== "system");
      if (body.prompt && userMessages[userMessages.length - 1]?.content !== body.prompt) {
        userMessages.push({ role: "user", content: body.prompt });
      }
    } else if (body.prompt) {
      userMessages = [{ role: "user", content: body.prompt }];
    } else {
      return new Response(
        JSON.stringify({ error: "Geçersiz istek: prompt veya messages alanı gereklidir." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const lang = resolveLanguage(body.lang);
    const langRule = lang
      ? `\n4. YANIT DİLİ: Kullanıcı farklı bir dilde yazmadıkça her zaman ${ENGLISH_NAMES[lang.code] ?? lang.name} dilinde cevap ver.`
      : "";
    const fullMessages: GroqMessage[] = [
      { role: "system", content: BIONICTEXT_SYSTEM_PROMPT + langRule },
      ...userMessages.slice(-6), // Last 6 turns for exact, tight conversation context
    ];

    const availableModels = await getAvailableGroqModels(apiKey);
    const modelsToTry = body.model
      ? [body.model, ...availableModels.filter((m) => m !== body.model)]
      : availableModels;

    let responseContent: string | null = null;
    let successfulModel: string = modelsToTry[0] || "llama-3.3-70b-versatile";
    let lastError: string = "";

    for (const model of modelsToTry) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: fullMessages,
            temperature: 0.6,
            max_tokens: 300,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data.choices?.[0]?.message?.content || "";
          if (rawText) {
            responseContent = sanitizePlainResponse(rawText);
            successfulModel = model;
            break;
          }
        } else {
          lastError = await response.text();
        }
      } catch (e) {
        lastError = String(e);
      }
    }

    if (responseContent !== null) {
      return new Response(
        JSON.stringify({
          text: responseContent,
          model: successfulModel,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        error: "GROQ_REQUEST_FAILED",
        details: lastError,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("Groq assistant server exception:", error);
    const msg = error instanceof Error ? error.message : "Sunucu hatası oluştu.";
    return new Response(
      JSON.stringify({
        error: "INTERNAL_ERROR",
        message: msg,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
