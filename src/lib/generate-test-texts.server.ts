export interface GenerateTestRequest {
  prompt: string;
  targetWords?: number;
  length?: "Kısa" | "Orta" | "Uzun";
}

export interface GeneratedTestResponse {
  success: boolean;
  title: string;
  category: string;
  wordCount: number;
  estimatedMinutes: number;
  normalText: string;
  bionicText: string;
  error?: string;
}

// Fetch active models from Groq API
async function getAvailableGroqModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data && Array.isArray(data.data)) {
        return data.data.map((m: { id: string }) => m.id);
      }
    }
  } catch (e) {
    console.warn("Failed to fetch Groq models list:", e);
  }
  // Default fallback candidates known to be active on Groq
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

export async function generateReadingTestTexts(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as GenerateTestRequest;
    const userPrompt = body.prompt?.trim() || "Bilişsel algı ve hızlı okuma teknikleri";

    // Word target
    let targetWords = body.targetWords || 220;
    if (body.length === "Kısa") targetWords = 140;
    if (body.length === "Orta") targetWords = 220;
    if (body.length === "Uzun") targetWords = 340;

    const apiKey = process.env.GROQ_API_KEY;

    const systemPrompt = `Sen BionicText platformu için 2 aşamalı bilimsel okuma testi hazırlayan profesyonel bir içerik yazarısın.
Kullanıcının tarif ettiği konuyu ele alan, birbirinin kopyası OLMAYAN, fakat AYNI KONUYU ve TAM OLARAK ${targetWords} KELİME UZUNLUĞUNU (${targetWords} kelime) işleyen 2 farklı paralel Türkçe metin yazacaksın.

KESİN KURALLAR:
1. "normalText" (1. Aşama Metni): Kullanıcının konusunu derinlemesine, akıcı ve doyurucu şekilde açıklayan TAM OLARAK ${targetWords} KELİMELİK zengin bir makale. Metni kısa kesme, hedef kelime sayısını tam olarak doldur.
2. "bionicText" (2. Aşama Metni): Aynı konuyu farklı cümle yapıları, alternatif argümanlar ve taze örneklerle anlatan, yine TAM OLARAK ${targetWords} KELİMELİK paralel bir kardeş makale.
3. Her iki metin de yüksek kaliteli, zengin sözcük dağarcığına sahip ve akıcı Türkçe olmalıdır.
4. "title" alanı konuyu yansıtan net bir başlık olmalıdır.

YANITINI SADECE GEÇERLİ BİR JSON NESNESİ OLARAK DÖNDÜR:
{
  "title": "Metin Başlığı",
  "category": "Özel Metin",
  "normalText": "Tam olarak ${targetWords} kelimelik 1. aşama metni...",
  "bionicText": "Tam olarak ${targetWords} kelimelik 2. aşama kardeş metni..."
}`;

    const activeModels = apiKey ? await getAvailableGroqModels(apiKey) : [];
    console.log("Available Groq models:", activeModels);

    // Filter models suited for text generation (exclude whisper/audio)
    const textModels = activeModels.filter(
      (m) => !m.includes("whisper") && !m.includes("embed") && !m.includes("guard"),
    );

    let generatedData: {
      title: string;
      category: string;
      normalText: string;
      bionicText: string;
    } | null = null;

    for (const model of textModels) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `Konu ve Tarif: ${userPrompt}\nHedef Kelime Sayısı: Her bir metin için tam ${targetWords} kelime.`,
              },
            ],
            temperature: 0.6,
            max_tokens: 3000,
            response_format: { type: "json_object" },
          }),
        });

        if (groqRes.ok) {
          const resData = await groqRes.json();
          const rawContent = resData.choices?.[0]?.message?.content;
          if (rawContent) {
            // Clean up possible markdown wrappers
            const cleaned = rawContent
              .replace(/^```json\s*/i, "")
              .replace(/^```\s*/i, "")
              .replace(/```\s*$/i, "")
              .trim();

            const parsed = JSON.parse(cleaned);
            if (parsed.normalText && parsed.bionicText) {
              generatedData = parsed;
              console.log(`Groq generation succeeded using model: ${model}`);
              break;
            }
          }
        } else {
          const errText = await groqRes.text();
          console.warn(`Groq model ${model} failed (${groqRes.status}):`, errText);
        }
      } catch (err) {
        console.warn(`Groq request with ${model} error:`, err);
      }
    }

    if (!generatedData || !generatedData.normalText || !generatedData.bionicText) {
      // Fallback robust generator if Groq is temporarily unavailable
      const wordsArray = userPrompt.split(/\s+/);
      const mainSubject = wordsArray.slice(0, 4).join(" ");
      generatedData = {
        title: `${mainSubject.charAt(0).toUpperCase() + mainSubject.slice(1)} ve Bilişsel Derinlik`,
        category: "Özel Metin",
        normalText: `${userPrompt} konusu, modern çağın hızla değişen bilgi ekosisteminde zihinsel kavrayışımızın ve analitik düşünce yetimizin en önemli yapı taşlarından birini oluşturur. Bilginin hacmi ve akış hızı katlanarak artarken, insan beyni bu yoğun veri bombardımanını anlamlandırmak için sofistike algı mekanizmaları geliştirmiştir. Odaklanmış ve dikkatli bir okuma pratiği, karmaşık kavramsal ilişkileri daha berrak bir çerçevede çözümlememize imkan tanır. Yapılan bilişsel araştırmalar, bilginin derinlemesine işlenmesinin yalnızca ezberleme değil, bağlamsal ilişki kurma becerisiyle doğrudan ilişkili olduğunu göstermektedir. Bu doğrultuda, zihnimizi analitik yaklaşımlarla beslemek, öğrenme sürecini çok daha verimli ve kalıcı bir noktaya taşır. Sürekli gelişen bu zihinsel disiplin, bireyin bilgiye ulaşma hızını ve kavrama yeteneğini en üst seviyeye ulaştırır.`,
        bionicText: `${userPrompt} üzerine odaklanan modern yaklaşımlar, insan zihninin karmaşık yapıları nasıl modellediğini ve içselleştirdiğini gözler önüne sermektedir. Bilişsel esneklik, karşılaşılan yeni bilgilerin mevcut hafıza şemalarıyla süratle entegre edilmesini mümkün kılar. Günümüz dünyasında etkili okuma stratejileri benimsemek, zihinsel işlem kapasitesini hafifleterek derinlemesine anlama süreçlerine daha geniş bir alan açar. Nöral bağlantıların güçlenmesiyle birlikte, okuyucunun metin içerisindeki ana fikirleri ve alt katmanları süzme kabiliyeti belirgin biçimde artar. Bu yöntem, dikkatin dağılmasını engelleyerek zihnin akış durumuna geçmesini kolaylaştırır ve bilginin kalıcı bir kavrayışa dönüşmesini sağlar. Böylece bireysel öğrenme performansı, hedeflenen bilişsel düzeyde maksimum verimle gerçekleşir.`,
      };
    }

    const actualWords = generatedData.normalText.trim().split(/\s+/).filter(Boolean).length;
    const estimatedMin = Math.max(1, Math.round(actualWords / 200));

    const result: GeneratedTestResponse = {
      success: true,
      title: generatedData.title || userPrompt,
      category: generatedData.category || "Özel Metin",
      wordCount: actualWords,
      estimatedMinutes: estimatedMin,
      normalText: generatedData.normalText,
      bionicText: generatedData.bionicText,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate reading test route error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Metin oluşturulurken beklenmeyen bir hata oluştu.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
