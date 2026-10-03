export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function getAvailableGroqModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data && Array.isArray(data.data)) {
        return data.data
          .map((m: { id: string }) => m.id)
          .filter(
            (id: string) =>
              !id.includes("whisper") && !id.includes("embed") && !id.includes("guard"),
          );
      }
    }
  } catch (e) {
    console.warn("Failed to fetch Groq models:", e);
  }
  return [
    "llama3-70b-8192",
    "llama3-8b-8192",
    "llama-3.2-11b-vision-preview",
    "llama-3.2-3b-preview",
    "llama-3.2-1b-preview",
    "qwen-2.5-32b",
    "deepseek-r1-distill-llama-70b",
    "openai/gpt-oss-120b",
  ];
}

export async function callGroqAssistant(request: Request): Promise<Response> {
  try {
    const apiKey =
      process.env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "GROQ_API_KEY_MISSING",
          message:
            "Groq API anahtarı henüz tanımlanmamış. Lütfen ortam değişkenlerine (environment variables) veya .env dosyasına GROQ_API_KEY ekleyin.",
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
    };

    let messages: GroqMessage[] = [];

    if (body.messages && Array.isArray(body.messages) && body.messages.length > 0) {
      messages = body.messages;
    } else if (body.prompt) {
      messages = [
        {
          role: "system",
          content:
            "Sen BionicText platformunun uzman AI Okuma ve Metin Asistanısın. Kullanıcılara biyonik okuma teknikleri, hızlı okuma, metin özetleme, karmaşık paragrafları basitleştirme ve okuma verimliliği konularında net, akıcı, zengin ve anlaşılır Türkçe yanıtlar verirsin. Yanıtlarını gereksiz uzatmadan doğrudan ve kaliteli bir dille sunarsın.",
        },
        {
          role: "user",
          content: body.prompt,
        },
      ];
    } else {
      return new Response(
        JSON.stringify({ error: "Geçersiz istek: prompt veya messages alanı gereklidir." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const availableModels = await getAvailableGroqModels(apiKey);
    const modelsToTry = body.model
      ? [body.model, ...availableModels.filter((m) => m !== body.model)]
      : availableModels;

    let responseContent: string | null = null;
    let successfulModel: string = modelsToTry[0] || "llama3-70b-8192";
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
            messages: messages,
            temperature: 0.7,
            max_tokens: 1500,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          responseContent = data.choices?.[0]?.message?.content || "";
          successfulModel = model;
          break;
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
