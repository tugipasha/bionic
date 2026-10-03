import React, { useState, useRef, useEffect } from "react";
import { useSiteLanguage } from "@/lib/i18n";
import {
  Zap,
  Clock,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Square,
  CheckCheck,
  ArrowUpRight,
  Cpu,
  Brain,
  Rocket,
  Compass,
  History,
  BookOpen,
  Play,
  X,
  Layers,
  ChevronRight,
  Wifi,
  ArrowRight,
} from "lucide-react";
import { convertToBionicHtml } from "./bionic-transformer";
import { saveTestResult } from "@/lib/reading-stats-store";
import { getUserSettings, UserSettings } from "@/lib/user-settings-store";
import { toast } from "sonner";

export interface TestArticle {
  id: string;
  title: string;
  category: string;
  text: string;
  bionicText?: string;
  estimatedMinutes?: number;
}

export interface TestCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  countText: string;
  articles: TestArticle[];
}

export const TEST_CATEGORIES: TestCategory[] = [
  {
    id: "tech",
    name: "Teknoloji",
    icon: Cpu,
    countText: "3 metin",
    articles: [
      {
        id: "tech-1",
        title: "Yapay Zeka ve Geleceğin Bilişsel Sınırları",
        category: "Teknoloji",
        estimatedMinutes: 2,
        text: "Yapay zeka modelleri günümüzde yalnızca matematiksel hesaplamaları değil, karmaşık dil örüntülerini ve kavramsal ilişkileri anlama kapasitesine ulaştı. Doğal dil işleme mimarileri, insan beyninin nöronal bağlantılarına benzer çok katmanlı yapay sinir ağları kullanarak bilgiyi bağlamsal olarak analiz eder. Bu teknolojik dönüşüm, insanların bilgiye erişim ve kavrama hızını kökten değiştirerek daha hızlı öğrenme modellerini zorunlu kılıyor.",
        bionicText:
          "Gelişen yapay zeka sistemleri, veri madenciliği ve dil anlambilimi üzerinden insan kavrayışına benzer derin öğrenme ağları inşa ediyor. Karmaşık bilgi kümelerini saniyeler içinde sentezleyen bu algoritmalar, zihinsel işlem hızımızı ve analitik düşünme biçimlerimizi yeniden yapılandırıyor. Bilişsel sınırların esnediği bu yeni çağda, odaklanmış bilgi işleme teknikleri öğrenme verimliliğinin temel anahtarı haline geliyor.",
      },
      {
        id: "tech-2",
        title: "Kuantum Hesaplama ve Süper Pozisyon",
        category: "Teknoloji",
        estimatedMinutes: 2,
        text: "Klasik bilgisayarlar bilgiyi sıfırlar ve birler halinde işlerken, kuantum bilgisayarlar süperpozisyon ve dolanıklık ilkelerinden yararlanır. Bu durum, aynı anda milyonlarca olasılığın eş zamanlı olarak hesaplanmasını mümkün kılar. Kriptografi, ilaç keşfi ve yapay zeka optimizasyonlarında kuantum üstünlüğü sağlandığında, geleneksel algoritmaların yüzlerce yılda çözebileceği karmaşık problemler dakikalar içinde çözüme kavuşturulabilecektir.",
        bionicText:
          "Kuantum mekaniğinin getirdiği süperpozisyon prensibi, bitlerin aynı anda hem sıfır hem bir değerini alabilmesine imkan tanır. Eşzamanlı hesaplama gücü sayesinde kuantum işlemciler, karmaşık simülasyonları ve şifreleme protokollerini benzeri görülmemiş bir süratle tamamlar. Bu bilimsel sıçrama, geleceğin hesaplama altyapısını baştan aşağı değiştirerek yeni nesil optimizasyon çözümleri sunmaktadır.",
      },
      {
        id: "tech-3",
        title: "Biyometrik Arayüzler ve Zihin-Makine Etkileşimi",
        category: "Teknoloji",
        estimatedMinutes: 2,
        text: "Giyilebilir biyosensörler ve invaziv olmayan beyin-bilgisayar arayüzleri, düşünce hızında kontrol sistemlerinin kapılarını aralıyor. Göz hareketlerini milisaniyelik hassasiyetle takip eden optik izleyiciler, dikkat dağınıklığını ölçerek metin akışını ve font dinamiklerini anlık olarak optimize edebilir. Bu sayede bireysel bilişsel yük dengelenir ve okuma deneyimi kişiselleştirilmiş en üst verime ulaştırılır.",
        bionicText:
          "Nöral sensörler ve gelişmiş biyometrik tarayıcılar, göz izleme verileriyle insan dikkatinin anlık haritasını çıkarmayı başarıyor. Görsel fiksasyon noktalarını algılayan akıllı arayüzler, metinlerin okunabilirlik oranını dinamik olarak ayarlayarak zihinsel yorgunluğu en aza indirir. Bu etkileşim, insan ile dijital bilgi akışı arasındaki köprüyü kusursuzlaştırır.",
      },
    ],
  },
  {
    id: "science",
    name: "Bilim & Zihin",
    icon: Brain,
    countText: "3 metin",
    articles: [
      {
        id: "science-1",
        title: "Nöroplastisite ve Bilişsel Hızlı Okuma Dinamikleri",
        category: "Bilim & Zihin",
        estimatedMinutes: 2,
        text: "İnsan beyni yaşam boyu yeni nöral bağlantılar kurma yeteneğine sahiptir. Biyonik okuma yaklaşımı, kelimelerin kilit başlangıç harflerini vurgulayarak gözün sabitleme süresini azaltır. Beyin, tamamlanmamış görsel ipuçlarını hafızadaki leksikal sözlükle eşleştirerek kelimenin tamamını anında kavrar. Bu mekanizma, iç seslendirme bariyerini kırarak zihnin görsel işlem hızını belirgin biçimde artırır.",
        bionicText:
          "Beynin esnek yapısı olan nöroplastisite, odaklı okuma egzersizleriyle görsel kavrama hızını kayda değer biçimde geliştirir. Gözün fiksasyon duraklamalarını azaltan görsel vurgular, zihnin kelimeleri bütüncül olarak tanımasını tetikler. İç seslendirmeden bağımsız olarak çalışan bu bilişsel süreç, okuma hızında ve odaklanma derinliğinde çarpıcı bir sıçrama sağlar.",
      },
      {
        id: "science-2",
        title: "Derin Odaklanma ve Akış Durumu Nörolojisi",
        category: "Bilim & Zihin",
        estimatedMinutes: 2,
        text: "Psikolojide akış durumu, kişinin yaptığı işe kendini tamamen kaptırdığı ve zaman algısının kaybolduğu optimal deneyim seviyesidir. Bu aşamada prefrontal korteksteki özeleştiri mekanizması geçici olarak yavaşlar, dopamin ve norepinefrin seviyeleri yükselir. Dikkat dağıtıcı unsurlardan arındırılmış temiz bir okuma ortamı, zihnin akış eşiğine ulaşmasını kolaylaştırarak anlama derinliğini maksimize eder.",
        bionicText:
          "Optimal zihinsel odaklanma olarak tanımlanan akış hali, dikkatin tek bir noktada yoğunlaşmasıyla gerçekleşir. Beyindeki nörotransmitter salınımı artarken dış uyarıcıların dikkat dağıtıcı etkisi tamamen sıfırlanır. Sadeleştirilmiş metin arayüzleri, okuyucunun akış eşiğine hızla geçmesine zemin hazırlayarak bilişsel performansı en üst seviyeye ulaştırır.",
      },
      {
        id: "science-3",
        title: "Görsel Algı ve Sakkadik Göz Hareketleri",
        category: "Bilim & Zihin",
        estimatedMinutes: 2,
        text: "Gözlerimiz bir metni okurken kesintisiz kaymaz; sakkad adı verilen hızlı sıçramalar ve fiksasyon adı verilen duraklamalar yapar. Okuma süresinin yaklaşık yüzde seksen beşi bu duraklamalarda harcanır. Biyonik odak noktaları, gözün metin üzerindeki sıçrama mesafesini uzatıp duraklama süresini yarı yarıya indirerek okuma verimliliğinde kuantum sıçraması yaratır.",
        bionicText:
          "Okuma eylemi sırasında göz kasları milisaniyelik sakkadik sıçramalar gerçekleştirir. Bilişsel duraklama süresini kısaltmak için tasarlanan fiksasyon kılavuzları, gözün satırlar arasındaki akışını hızlandırır. Zihin bu sayede görsel ipuçlarını çok daha seri bir şekilde birleştirerek okuma eforunu önemli ölçüde hafifletir.",
      },
    ],
  },
  {
    id: "space",
    name: "Uzay & Evren",
    icon: Rocket,
    countText: "2 metin",
    articles: [
      {
        id: "space-1",
        title: "Derin Uzay Teleskopları ve Kozmik Zaman Yolculuğu",
        category: "Uzay & Evren",
        estimatedMinutes: 2,
        text: "Kızılötesi uzay gözlemevleri, evrenin ilk yıldızlarının ve galaksilerinin doğum anına ışık tutuyor. Milyarlarca ışık yılı uzaktan gelen zayıf fotonlar, evrenin genişlemesi nedeniyle kızıla kayarak tespit edilir. Bu gözlemler, karanlık maddenin dağılımını ve kozmik yapının evrimini anlamamızı sağlayarak insanlığın evrendeki yerini yeniden tanımlıyor.",
        bionicText:
          "Kozmik uzaklıklardan gelen kadim ışık dalgaları, uzay teleskoplarının hassas optik dedektörleri tarafından yakalanıyor. Evrenin ilk evrelerindeki galaksi oluşumlarını aydınlatan bu veriler, maddenin zaman içindeki evrimsel yolculuğunu gözler önüne seriyor ve kozmolojik sırlarımızı adım adım çözüyor.",
      },
      {
        id: "space-2",
        title: "Ötegezegenler ve Yaşamın Biyolojik İmzaları",
        category: "Uzay & Evren",
        estimatedMinutes: 2,
        text: "Yaşanabilir bölgede bulunan kayalık ötegezegenlerin atmosfer analizi, su buharı, metan ve karbondioksit gibi biyolojik imzaların aranmasını mümkün kılmaktadır. Yıldızının önünden geçen gezegenin atmosferinden süzülen ışık spektrumu, kimyasal bileşim hakkında hassas ipuçları sunar.",
        bionicText:
          "Güneş sistemimizin ötesindeki yabancı gezegenlerin atmosferik yapısı, spektroskopi teknikleriyle titizlikle incelenmektedir. Yaşam belirtisi taşıyabilecek organik gazların tespit edilmesi, evrende yalnız olup olmadığımız sorusuna bilimsel yanıtlar aramamızı sağlamaktadır.",
      },
    ],
  },
  {
    id: "philosophy",
    name: "Felsefe & Zihin",
    icon: Compass,
    countText: "2 metin",
    articles: [
      {
        id: "philo-1",
        title: "Stoacı Felsefe ve Zihinsel Dayanıklılık",
        category: "Felsefe & Zihin",
        estimatedMinutes: 2,
        text: "Epiktetos ve Marcus Aurelius gibi Stoacı düşünürler, kontrol edebileceğimiz unsurlar ile kontrolümüz dışındaki faktörler arasındaki ayrımı vurgulamıştır. Dış olaylar değil, bu olaylara verdiğimiz yargılar huzurumuzu belirler. Zihnimizi gereksiz gürültüden arındırmak, berrak ve etkili bir odaklanmanın en temel ön koşuludur.",
        bionicText:
          "Antik Stoacılık öğretisi, bireyin içsel dinginliğini dış etkenlerden bağımsız kılmayı hedefler. Kontrol alanımızın sınırlarını netleştirdiğimizde, enerjimizi yapıcı eylemlere ve derin zihinsel netliğe yöneltebiliriz. Bu berraklık, düşünce ve anlama süreçlerimize de güç katar.",
      },
      {
        id: "philo-2",
        title: "Zaman Algısı ve Yaşamın Anlamı",
        category: "Felsefe & Zihin",
        estimatedMinutes: 2,
        text: "Zaman akıp giden lineer bir şerit değil, an be an deneyimlediğimiz derin bir bilinç alanıdır. Hızlı ve etkili okuma, yalnızca zamandan tasarruf etmek için değil, kısa ömrümüzde daha fazla düşünceye, hikayeye ve bilgiye dokunabilmek için güçlü bir köprüdür.",
        bionicText:
          "Bilinçli varoluşumuzun en değerli kaynağı olan zaman, edindiğimiz deneyimlerin derinliğiyle ölçülür. Etkili okuma alışkanlıkları, sınırlı zaman dilimlerinde daha zengin fikirlere ulaşmamıza kapı aralayarak hayatın anlam haritasını genişletir.",
      },
    ],
  },
  {
    id: "history",
    name: "Tarih & Keşif",
    icon: History,
    countText: "2 metin",
    articles: [
      {
        id: "hist-1",
        title: "Matbaanın İcadı ve Bilgi Devrimi",
        category: "Tarih & Keşif",
        estimatedMinutes: 2,
        text: "Johannes Gutenberg'in hareketli harflerle baskı tekniğini geliştirmesi, bilginin elit bir azınlığın tekelinden çıkıp kitlelere yayılmasını sağladı. Kitapların çoğalması bilimsel aydınlanmayı tetikledi ve modern eğitim sistemlerinin temelini attı.",
        bionicText:
          "Basım teknolojisindeki devrim, insanlık tarihinin en büyük aydınlanma hareketini başlattı. Yazılı eserlerin hızla çoğaltılabilmesi, bilimsel fikirlerin sınırları aşmasını sağlayarak modern düşüncenin temellerini sağlamlaştırdı.",
      },
      {
        id: "hist-2",
        title: "İskenderiye Kütüphanesi ve Kadim Bilgelik",
        category: "Tarih & Keşif",
        estimatedMinutes: 2,
        text: "Antik dünyanın en büyük bilgi merkezi olan İskenderiye Kütüphanesi, Akdeniz havzasındaki tüm yazılı metinleri bir araya getirmeyi hedeflemişti. Papirüs tomarlarından oluşan bu devasa miras, insanlığın bilgi biriktirme tutkusunun en parlak simgesidir.",
        bionicText:
          "Antik çağın evrensel bilgi hazinesi olan İskenderiye, bilimin ve edebiyatın en zengin kaynaklarını bir araya getirmişti. Papirüs rulolarında saklanan bu derin miras, insanlığın merak duygusunu ve öğrenme tutkusunu ebediyen simgelemektedir.",
      },
    ],
  },
  {
    id: "productivity",
    name: "Üretkenlik",
    icon: Layers,
    countText: "2 metin",
    articles: [
      {
        id: "prod-1",
        title: "Bilişsel Yük Teorisi ve Hızlı Bilgi İşleme",
        category: "Üretkenlik",
        estimatedMinutes: 2,
        text: "Çalışma belleğimiz aynı anda sınırlı miktarda bilgiyi tutabilir. Okuma sırasında biçimlendirme netliği sağlandığında, beynin çözümleme için harcadığı efor azalır ve anlama ile ilişkilendirmeye daha fazla bilişsel kapasite ayrılır.",
        bionicText:
          "İnsan zihni kısıtlı çalışma belleği kapasitesini optimize etmek için yapılandırılmış görsel girdilere ihtiyaç duyar. Görsel netlik arttıkça algılama süresi kısalır ve derin kavrayış için gerekli olan zihinsel enerji serbest kalır.",
      },
      {
        id: "prod-2",
        title: "Alışkanlıkların Gücü ve Sürekli Gelişim",
        category: "Üretkenlik",
        estimatedMinutes: 2,
        text: "Her gün düzenli olarak yapılan on beş dakikalık odaklı okuma pratiği, bir yılda onlarca kitaba ve yüzlerce yeni kavrama eşdeğerdir. Küçük ve tutarlı eylemler, bileşik getiri yasasıyla devasa bilişsel sıçramalara dönüşür.",
        bionicText:
          "Günlük rutinlerdeki küçük ve kararlı okuma adımları, zamanla büyük bir entelektüel birikime dönüşür. Düzenli pratik yapmak zihinsel disiplini güçlendirirken yeni bilgilerin hızla içselleştirilmesini sağlar.",
      },
    ],
  },
];

type TestState =
  | "selection"
  | "custom_generator_modal"
  | "ai_generating_screen"
  | "reading_normal"
  | "reading_bionic_ready"
  | "reading_bionic"
  | "results";

interface ReadingTestPageProps {
  onBackToTranslate?: () => void;
  onGoToProfile?: () => void;
}

export function ReadingTestPage({ onBackToTranslate, onGoToProfile }: ReadingTestPageProps) {
  const { siteLang } = useSiteLanguage();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("tech");
  const [selectedArticleId, setSelectedArticleId] = useState<string>("tech-1");
  const [customArticle, setCustomArticle] = useState<TestArticle | null>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
  const [isArticlesDropdownOpen, setIsArticlesDropdownOpen] = useState<boolean>(false);
  const [testState, setTestState] = useState<TestState>("selection");
  const [userSettings, setUserSettings] = useState<UserSettings>(getUserSettings());

  // Topic generator states
  const [generatorPrompt, setGeneratorPrompt] = useState<string>("");
  const [targetWordCount, setTargetWordCount] = useState<number>(220);
  const [generatorEstimatedWords, setGeneratorEstimatedWords] = useState<number>(220);
  const [generatorEstimatedMinutes, setGeneratorEstimatedMinutes] = useState<number>(2);

  // Timers & Duration tracking
  const [normalElapsedMs, setNormalElapsedMs] = useState<number>(0);
  const [bionicElapsedMs, setBionicElapsedMs] = useState<number>(0);

  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const currentCategory =
    TEST_CATEGORIES.find((c) => c.id === selectedCategoryId) ??
    (TEST_CATEGORIES[0] as TestCategory);

  const defaultArticle = TEST_CATEGORIES[0]?.articles[0] as TestArticle;
  const currentArticle =
    customArticle ??
    currentCategory?.articles.find((a) => a.id === selectedArticleId) ??
    currentCategory?.articles[0] ??
    defaultArticle;

  const realNormalWordsCount = currentArticle.text.trim().split(/\s+/).filter(Boolean).length;
  const bionicArticleText = currentArticle.bionicText || currentArticle.text;
  const realBionicWordsCount = bionicArticleText.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // START TEXT GENERATION VIA REAL GROQ API
  const handleStartTextGeneration = async () => {
    const promptToSend = generatorPrompt.trim();
    if (!promptToSend) {
      toast.error("Lütfen metin konusunu tarif edin.");
      return;
    }

    const wordsToRequest = targetWordCount || 220;
    const estMinutes = Math.max(1, Math.round(wordsToRequest / 200));

    setGeneratorEstimatedWords(wordsToRequest);
    setGeneratorEstimatedMinutes(estMinutes);
    setTestState("ai_generating_screen");

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/generate-reading-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          prompt: promptToSend,
          lang: siteLang,
          targetWords: wordsToRequest,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.normalText && data.bionicText) {
        const generatedArticle: TestArticle = {
          id: `custom-${Date.now()}`,
          title: data.title || promptToSend,
          category: "Özel Metin",
          estimatedMinutes: data.estimatedMinutes || estMinutes,
          text: data.normalText,
          bionicText: data.bionicText,
        };

        setCustomArticle(generatedArticle);
        if (data.fallback) {
          toast.warning("Yapay zeka şu an ulaşılamıyor; örnek bir metin hazırlandı.");
        } else {
          toast.success("Metinler yapay zeka ile hazırlandı.");
        }
        setTestState("selection");
      } else {
        throw new Error(data.error || "Metin oluşturulurken bir hata oluştu.");
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") {
        return;
      }
      toast.error(
        (err as Error)?.message || "Metin üretilemedi. Lütfen bağlantınızı kontrol edin.",
      );
      setTestState("selection");
    }
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setTestState("selection");
  };

  // START NORMAL READING (Aşama 1)
  const handleStartNormalTest = () => {
    setNormalElapsedMs(0);
    setBionicElapsedMs(0);
    setTestState("reading_normal");
    startTimeRef.current = Date.now();

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setNormalElapsedMs(Date.now() - startTimeRef.current);
    }, 50);
  };

  // STOP NORMAL READING -> GO TO BIONIC READY
  const handleStopNormalReading = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const finalNormalTime = Math.max(800, Date.now() - startTimeRef.current);
    setNormalElapsedMs(finalNormalTime);
    setTestState("reading_bionic_ready");
  };

  // START BIONIC READING (Aşama 2)
  const handleStartBionicTest = () => {
    setTestState("reading_bionic");
    startTimeRef.current = Date.now();

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setBionicElapsedMs(Date.now() - startTimeRef.current);
    }, 50);
  };

  // STOP BIONIC READING -> SHOW RESULTS
  const handleStopBionicReading = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const finalBionicTime = Math.max(800, Date.now() - startTimeRef.current);
    setBionicElapsedMs(finalBionicTime);
    setTestState("results");

    const normalSec = Math.max(0.5, normalElapsedMs / 1000);
    const bionicSec = Math.max(0.5, finalBionicTime / 1000);
    const nWpm = Math.max(1, Math.round(realNormalWordsCount / (normalSec / 60)));
    const bWpm = Math.max(1, Math.round(realBionicWordsCount / (bionicSec / 60)));

    saveTestResult({
      title: currentArticle.title,
      normalWpm: nWpm,
      bionicWpm: bWpm,
      accuracy: 96,
      durationSeconds: Math.round(bionicSec),
    });
    toast.success("Test tamamlandı ve sonuçlarınız kaydedildi.");
  };

  // RESET TEST
  const handleResetTest = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setTestState("selection");
    setNormalElapsedMs(0);
    setBionicElapsedMs(0);
  };

  const normalSeconds = Math.max(0.5, +(normalElapsedMs / 1000).toFixed(1));
  const bionicSeconds = Math.max(0.5, +(bionicElapsedMs / 1000).toFixed(1));

  const normalMinutes = normalSeconds / 60;
  const bionicMinutes = bionicSeconds / 60;

  const normalWpm = Math.max(1, Math.round(realNormalWordsCount / normalMinutes));
  const bionicWpm = Math.max(1, Math.round(realBionicWordsCount / bionicMinutes));

  const speedIncreasePercent = Math.max(
    0,
    Math.round(((bionicWpm - normalWpm) / Math.max(1, normalWpm)) * 100),
  );

  const savedSeconds = Math.max(0, +(normalSeconds - bionicSeconds).toFixed(1));
  const CategoryIcon = currentCategory.icon;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6 select-none font-sans text-gray-900 pb-8">
      {/* =========================================================================
          EXACT SCREEN REPLICA (Matches User Image Pixel-for-Pixel, Zero Emojis)
          ========================================================================= */}
      {testState === "ai_generating_screen" && (
        <div className="relative min-h-[660px] sm:min-h-[720px] max-w-sm mx-auto w-full rounded-[40px] overflow-hidden bg-[#090e17] text-white flex flex-col justify-between p-6 shadow-2xl border border-white/10 select-none animate-in fade-in duration-300">
          {/* Background image overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 pointer-events-none mix-blend-luminosity scale-105"
            style={{
              backgroundImage:
                "image-set(url('/bionic-mountain-background-sm.webp') 1x, url('/bionic-mountain-background.webp') 2x)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#090e17]/60 via-[#090e17]/80 to-[#090e17] pointer-events-none" />

          {/* Top iOS Status Bar */}
          <div className="relative z-10 flex items-center justify-between text-xs text-white/90 px-2 pt-1">
            <span className="font-semibold tracking-tight text-sm">9:41</span>
            <div className="flex items-center gap-1.5 text-white/80">
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 h-1 bg-white rounded-full" />
                <span className="w-0.5 h-1.5 bg-white rounded-full" />
                <span className="w-0.5 h-2 bg-white rounded-full" />
                <span className="w-0.5 h-3 bg-white rounded-full" />
              </div>
              <Wifi className="size-3.5 text-white" />
              <div className="flex items-center border border-white/70 rounded-xs px-0.5 py-0.5 w-5 h-2.5">
                <div className="bg-white h-full w-3 rounded-2xs" />
              </div>
            </div>
          </div>

          {/* Center Stage: Exact Circle with Waveform & Text */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto space-y-4 py-4">
            {/* Waveform double ring element */}
            <div className="relative flex items-center justify-center size-28">
              {/* Outer track */}
              <div className="absolute inset-0 rounded-full border border-white/15 bg-white/5 backdrop-blur-md" />
              {/* Spinning progress arc */}
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white border-r-white border-b-white/20 animate-spin" />
              {/* Center dark disc */}
              <div className="size-20 rounded-full bg-[#0d1420]/80 border border-white/10 flex items-center justify-center shadow-inner">
                {/* 5-bar vertical waveform icon */}
                <div className="flex items-center justify-center gap-1">
                  <span className="w-1 h-3 bg-white rounded-full animate-pulse" />
                  <span className="w-1 h-5 bg-white rounded-full animate-pulse delay-75" />
                  <span className="w-1 h-7 bg-white rounded-full animate-pulse delay-150" />
                  <span className="w-1 h-5 bg-white rounded-full animate-pulse delay-100" />
                  <span className="w-1 h-3 bg-white rounded-full animate-pulse" />
                </div>
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-1.5 px-4">
              <h2 className="text-xl font-normal tracking-tight text-white font-sans">
                Test Hazırlanıyor...
              </h2>
              <p className="text-xs text-white/60 font-normal leading-relaxed max-w-[220px] mx-auto">
                Metin analiz ediliyor ve
                <br />
                okuma moduna hazırlanıyor.
              </p>
            </div>

            {/* Glass Info Card (2 Rows without difficulty, matching requested clean design) */}
            <div className="w-full rounded-[24px] border border-white/10 bg-[#131b26]/75 backdrop-blur-2xl p-4 space-y-3.5 text-left shadow-2xl">
              {/* Row 1 */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/10 text-white/80">
                    <FileText className="size-4 text-white/90" />
                  </div>
                  <span className="text-white/90 font-medium">Metin Uzunluğu</span>
                </div>
                <span className="text-white/80 font-normal">{generatorEstimatedWords} kelime</span>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/5 w-full" />

              {/* Row 2 */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/10 text-white/80">
                    <Clock className="size-4 text-white/90" />
                  </div>
                  <span className="text-white/90 font-medium">Tahmini Süre</span>
                </div>
                <div className="flex items-center gap-1 text-white/80 font-normal">
                  <span>{generatorEstimatedMinutes} dakika</span>
                  <ChevronRight className="size-3.5 text-white/50" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Button (İptal Et) */}
          <div className="relative z-10 w-full space-y-3">
            <button
              type="button"
              onClick={handleCancelGeneration}
              className="w-full py-3.5 rounded-full bg-white text-[#0f172a] hover:bg-white/95 text-sm font-medium tracking-tight shadow-xl transition-all active:scale-98 text-center"
            >
              İptal Et
            </button>
            <div className="w-32 h-1 bg-white/30 rounded-full mx-auto" />
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ÖZEL METİN HAZIRLAMA GİRİŞİ (Zero Emojis, Word Count Controls)
          ========================================================================= */}
      {testState === "custom_generator_modal" && (
        <div className="rounded-3xl border border-gray-200/90 bg-white p-5 sm:p-8 shadow-xl space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-display text-base sm:text-lg font-semibold text-gray-900">
                Özel Okuma Metni Oluştur
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-500">
                Okumak istediğiniz konuyu ve istediğiniz kelime sayısını belirleyin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTestState("selection")}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Konu Açıklaması */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Metin Konusu</label>
              <textarea
                value={generatorPrompt}
                onChange={(e) => setGeneratorPrompt(e.target.value)}
                placeholder="Örnek: Kuantum fiziğinde süperpozisyon ve zamanın göreliliği, Antik Roma ordularının askeri taktikleri, İnsan beyninin nöroplastisite kapasitesi..."
                rows={3}
                className="w-full rounded-2xl border border-gray-200 p-3.5 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-all"
              />
            </div>

            {/* Konu Başlıkları */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-gray-500">Örnek Konular:</span>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {[
                  "Kuantum Fiziği ve Zaman",
                  "Nörobilim ve Hızlı Öğrenme",
                  "Stoacı Felsefe ve Zihin",
                  "Yapay Zeka ve Bilgi Çağı",
                  "Derin Uzay ve Kara Delikler",
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setGeneratorPrompt(chip)}
                    className="px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 text-[11px] font-medium text-gray-700 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Hedef Kelime Sayısı Seçimi */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-gray-700">
                Hedef Kelime Sayısı:{" "}
                <span className="text-black font-mono font-bold">{targetWordCount} kelime</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[120, 200, 300, 450].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setTargetWordCount(count)}
                    className={`py-2 px-2 rounded-xl border text-center text-xs font-medium transition-all ${
                      targetWordCount === count
                        ? "border-black bg-gray-900 text-white font-semibold shadow-2xs"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {count} Kelime
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setTestState("selection")}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleStartTextGeneration}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-[#121620] hover:bg-black text-white px-7 py-3 text-xs sm:text-sm font-semibold shadow-lg transition-all active:scale-95"
            >
              <span>Metinleri Hazırla</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          DEFAULT WORKSPACE CARD (Selection / Normal / Bionic / Results)
          ========================================================================= */}
      {testState !== "ai_generating_screen" && testState !== "custom_generator_modal" && (
        <>
          {/* MAIN WORKSPACE CARD */}
          <div className="relative rounded-3xl border border-gray-200/90 bg-white/95 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] p-4 sm:p-6 lg:p-8 backdrop-blur-md min-h-[500px] lg:min-h-[560px] flex flex-col justify-between overflow-hidden">
            {/* STATE 1: SELECTION */}
            {testState === "selection" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 h-full flex-1">
                {/* COLUMN 1: Kategori & Açılır Metin Seçimi (5 Cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-4 lg:border-r lg:border-gray-100 lg:pr-8">
                  <div className="space-y-4">
                    {/* Metin Oluşturma Giriş Butonu */}
                    <div className="p-3 sm:p-3.5 rounded-2xl border border-gray-200 bg-gray-50/80 text-gray-900 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-gray-900">
                          Özel Konuda Metin Hazırla
                        </div>
                        <p className="text-[11px] text-gray-500">
                          İstediğin konuda 2 aşamalı metin oluştur.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTestState("custom_generator_modal")}
                        className="px-3 py-1.5 rounded-xl bg-gray-900 text-white hover:bg-black text-[11px] font-semibold shrink-0 transition-transform active:scale-95 shadow-xs"
                      >
                        Oluştur
                      </button>
                    </div>

                    {/* Active Custom Badge if custom article selected */}
                    {customArticle && (
                      <div className="p-2.5 rounded-xl bg-gray-100 border border-gray-300 flex items-center justify-between text-xs text-gray-900">
                        <span className="font-semibold truncate">
                          Özel Metin: {customArticle.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCustomArticle(null)}
                          className="text-[11px] font-semibold text-gray-600 hover:underline shrink-0 ml-2"
                        >
                          Hazır Metinlere Dön
                        </button>
                      </div>
                    )}

                    {/* Kategori Seç Dropdown */}
                    {!customArticle && (
                      <div className="relative space-y-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Cpu className="size-4 text-gray-700" />
                            <h3 className="font-display text-xs sm:text-sm font-semibold text-gray-900">
                              Kategori Seç
                            </h3>
                          </div>
                          <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
                            İlgi alanına uygun bir kategori seç.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                            setIsArticlesDropdownOpen(false);
                          }}
                          className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-800 transition-all shadow-2xs active:scale-98"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-800">
                              <CategoryIcon className="size-4" />
                            </span>
                            <span className="font-semibold text-gray-900 truncate">
                              {currentCategory.name}
                            </span>
                            <span className="text-gray-400 font-mono text-[11px] sm:text-[11px] shrink-0">
                              ({currentCategory.countText})
                            </span>
                          </div>
                          {isCategoryDropdownOpen ? (
                            <ChevronUp className="size-4 text-gray-500 shrink-0 ml-1" />
                          ) : (
                            <ChevronDown className="size-4 text-gray-500 shrink-0 ml-1" />
                          )}
                        </button>

                        {isCategoryDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl space-y-1 max-h-56 overflow-y-auto animate-in fade-in-50 duration-150">
                            {TEST_CATEGORIES.map((cat) => {
                              const isSelected = selectedCategoryId === cat.id;
                              const Icon = cat.icon;
                              return (
                                <div
                                  key={cat.id}
                                  onClick={() => {
                                    setSelectedCategoryId(cat.id);
                                    if (cat.articles[0]) {
                                      setSelectedArticleId(cat.articles[0].id);
                                    }
                                    setIsCategoryDropdownOpen(false);
                                  }}
                                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                                    isSelected
                                      ? "bg-gray-100 font-semibold text-gray-900"
                                      : "hover:bg-gray-50 text-gray-700"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 overflow-hidden">
                                    <span
                                      className={`flex size-6 shrink-0 items-center justify-center rounded-lg ${
                                        isSelected
                                          ? "bg-gray-900 text-white"
                                          : "bg-gray-100 text-gray-700"
                                      }`}
                                    >
                                      <Icon className="size-3.5" />
                                    </span>
                                    <span className="truncate">{cat.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <span className="text-[11px] font-mono text-gray-400">
                                      {cat.countText}
                                    </span>
                                    {isSelected && <Check className="size-3 text-black" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Açılır Metinler Bölümü */}
                    {!customArticle && (
                      <div className="relative pt-2 border-t border-gray-100 space-y-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-gray-700" />
                            <h3 className="font-display text-xs sm:text-sm font-semibold text-gray-900">
                              Metinler
                            </h3>
                          </div>
                          <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
                            Seçtiğin kategoriye ait metinleri incele ve seç.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsArticlesDropdownOpen(!isArticlesDropdownOpen);
                            setIsCategoryDropdownOpen(false);
                          }}
                          className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-800 transition-all shadow-2xs active:scale-98"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                              <FileText className="size-3.5" />
                            </span>
                            <span className="font-semibold text-gray-900 truncate">
                              {currentArticle.title}
                            </span>
                            <span className="text-gray-400 font-mono text-[11px] sm:text-[11px] shrink-0">
                              ({realNormalWordsCount} kelime)
                            </span>
                          </div>
                          {isArticlesDropdownOpen ? (
                            <ChevronUp className="size-4 text-gray-500 shrink-0 ml-1" />
                          ) : (
                            <ChevronDown className="size-4 text-gray-500 shrink-0 ml-1" />
                          )}
                        </button>

                        {isArticlesDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl space-y-1 max-h-48 overflow-y-auto animate-in fade-in-50 duration-150">
                            {currentCategory.articles.map((art) => {
                              const isSelected = selectedArticleId === art.id;
                              const artWordCount = art.text
                                .trim()
                                .split(/\s+/)
                                .filter(Boolean).length;
                              return (
                                <div
                                  key={art.id}
                                  onClick={() => {
                                    setSelectedArticleId(art.id);
                                    setIsArticlesDropdownOpen(false);
                                  }}
                                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                                    isSelected
                                      ? "bg-gray-100 font-semibold text-gray-900"
                                      : "hover:bg-gray-50 text-gray-700"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <span
                                      className={`flex size-3.5 shrink-0 items-center justify-center rounded-full border ${
                                        isSelected
                                          ? "border-gray-900 bg-gray-900"
                                          : "border-gray-300 bg-white"
                                      }`}
                                    >
                                      {isSelected && (
                                        <span className="size-1 rounded-full bg-white" />
                                      )}
                                    </span>
                                    <span className="truncate">{art.title}</span>
                                  </div>
                                  <span className="text-[11px] sm:text-[11px] font-mono text-gray-400 shrink-0 ml-2">
                                    {artWordCount} kelime
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUMN 2: Metin Önizleme ve Başlatma Alanı (7 Cols) */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-4 h-full pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                  <div className="space-y-2.5 flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-gray-700" />
                        <h3 className="font-display text-xs sm:text-sm font-semibold text-gray-900">
                          Metin Önizleme (1. Aşama)
                        </h3>
                      </div>
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-mono font-medium text-gray-600">
                        {realNormalWordsCount} kelime
                      </span>
                    </div>

                    <div className="rounded-2xl border border-gray-200/80 bg-gray-50/50 p-4 sm:p-6 flex-1 max-h-[260px] lg:max-h-none overflow-y-auto space-y-2">
                      <h4 className="font-display text-sm sm:text-base font-semibold text-gray-900 border-b border-gray-200/60 pb-2">
                        {currentArticle.title}
                      </h4>
                      <p className="text-xs sm:text-sm leading-relaxed text-gray-700 font-sans select-text line-clamp-6 lg:line-clamp-none">
                        {currentArticle.text}
                      </p>
                    </div>
                  </div>

                  {/* Start Test Action Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
                    <div className="text-[11px] text-gray-500 flex items-center gap-1.5 self-start sm:self-center">
                      <Clock className="size-3.5 text-gray-400" />
                      <span>2 Aşamalı Hız Karşılaştırma Testi</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartNormalTest}
                      className="w-full sm:w-auto flex items-center justify-center rounded-full bg-[#121620] hover:bg-black text-white px-7 sm:px-9 py-3 text-xs sm:text-sm font-semibold shadow-md transition-all active:scale-95"
                    >
                      Testi Başlat
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STATE 2: READING NORMAL TEXT (Aşama 1) */}
            {testState === "reading_normal" && (
              <div className="flex flex-col justify-between h-full min-h-[440px] sm:min-h-[480px] space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-gray-100 pb-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-full bg-gray-900 text-white text-xs font-bold font-mono">
                      1 / 2
                    </span>
                    <div>
                      <h3 className="font-display text-xs sm:text-sm font-semibold text-gray-900">
                        Aşama 1: Normal Metin Okuma
                      </h3>
                      <p className="text-[11px] sm:text-xs text-gray-500">
                        Metni doğal okuma hızınızla okuyun ve bitirdiğinizde butona tıklayın.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-1 text-gray-900">
                    <Clock className="size-3.5 text-gray-600 animate-spin" />
                    <span className="font-mono text-xs sm:text-sm font-semibold">
                      {(normalElapsedMs / 1000).toFixed(1)} sn
                    </span>
                    <span className="text-[11px] text-gray-500 font-mono">
                      ({realNormalWordsCount} kelime)
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-8 shadow-xs flex-1 h-[260px] sm:h-[320px] overflow-y-auto">
                  <h4 className="font-display text-base sm:text-lg font-medium text-gray-900 mb-2 pb-2 border-b border-gray-100">
                    {currentArticle.title}
                  </h4>
                  <p className="text-sm sm:text-lg leading-relaxed text-gray-800 font-sans select-text">
                    {currentArticle.text}
                  </p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 pt-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetTest}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Testi İptal Et</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStopNormalReading}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-neutral-900 hover:bg-black text-white px-6 sm:px-7 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold shadow-lg transition-all active:scale-95"
                  >
                    <Square className="size-3.5 sm:size-4 fill-current" />
                    <span>Süreyi Durdur (Bitirdim)</span>
                    <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* STATE 2.5: BIONIC READING READY */}
            {testState === "reading_bionic_ready" && (
              <div className="flex flex-col justify-between h-full min-h-[440px] sm:min-h-[480px] space-y-6 animate-in fade-in duration-200 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-gray-100 pb-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-full bg-gray-900 text-white text-xs font-bold font-mono">
                      2 / 2
                    </span>
                    <div>
                      <h3 className="font-display text-xs sm:text-sm font-semibold text-gray-900">
                        Aşama 2: Biyonik Okuma Hazırlığı
                      </h3>
                      <p className="text-[11px] sm:text-xs text-gray-500">
                        1. Aşama tamamlandı. Hazır olduğunuzda 2. aşamayı başlatın.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-1 text-gray-700 font-mono text-xs">
                    <span>1. Aşama Süreniz:</span>
                    <strong className="text-gray-900">
                      {(normalElapsedMs / 1000).toFixed(1)} sn
                    </strong>
                  </div>
                </div>

                {/* Center Callout Card */}
                <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-5 p-6 rounded-3xl border border-gray-200 bg-gray-50/70 shadow-inner">
                  <div className="size-14 rounded-2xl bg-[#121620] text-white flex items-center justify-center shadow-md">
                    <Zap className="size-7 fill-current text-white" />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="font-display text-lg sm:text-xl font-semibold text-gray-900">
                      Biyonik Okuma Testine Hazır mısınız?
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-md">
                      Bu aşamada aynı konuyu ele alan paralel kardeş metin{" "}
                      <strong>Biyonik Format</strong> ile karşınıza çıkacaktır. Başlat butonuna
                      bastığınız anda süre saymaya başlayacaktır.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartBionicTest}
                    className="flex items-center gap-2.5 rounded-full bg-[#121620] hover:bg-black text-white px-8 py-3.5 text-xs sm:text-sm font-semibold shadow-lg transition-all active:scale-95"
                  >
                    <Play className="size-4 fill-current text-white" />
                    <span>2. Aşamayı Başlat (Biyonik Okuma)</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetTest}
                    className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Testi İptal Et</span>
                  </button>
                </div>
              </div>
            )}

            {/* STATE 3: READING BIONIC TEXT (Aşama 2) */}
            {testState === "reading_bionic" && (
              <div className="flex flex-col justify-between h-full min-h-[440px] sm:min-h-[480px] space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-gray-100 pb-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-full bg-gray-900 text-white text-xs font-bold font-mono">
                      2 / 2
                    </span>
                    <div>
                      <h3 className="font-display text-xs sm:text-sm font-semibold text-gray-900">
                        Aşama 2: Biyonik Formatlı Metin Okuma
                      </h3>
                      <p className="text-[11px] sm:text-xs text-gray-500">
                        Normal okuma süreniz:{" "}
                        <strong>{(normalElapsedMs / 1000).toFixed(1)} sn</strong>. Biyonik formatta
                        okumayı bitirdiğinizde butona tıklayın.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-1 text-gray-900">
                    <Zap className="size-3.5 text-gray-700" />
                    <span className="font-mono text-xs sm:text-sm font-semibold">
                      {(bionicElapsedMs / 1000).toFixed(1)} sn
                    </span>
                    <span className="text-[11px] text-gray-500 font-mono">
                      ({realBionicWordsCount} kelime)
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-8 shadow-xs flex-1 h-[260px] sm:h-[320px] overflow-y-auto">
                  <h4 className="font-display text-base sm:text-lg font-medium text-gray-900 mb-2 pb-2 border-b border-gray-100">
                    {currentArticle.title}
                  </h4>
                  <div
                    className="text-sm sm:text-lg leading-relaxed text-gray-900 font-sans select-text"
                    dangerouslySetInnerHTML={{
                      __html: convertToBionicHtml(bionicArticleText, {
                        fixation: userSettings.bionicFixation,
                        saccade: userSettings.saccadeStep,
                      }),
                    }}
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 pt-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetTest}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Testi İptal Et</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStopBionicReading}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-neutral-900 hover:bg-black text-white px-6 sm:px-7 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold shadow-lg transition-all active:scale-95"
                  >
                    <CheckCheck className="size-4" />
                    <span>Süreyi Durdur ve Sonuçları Gör</span>
                    <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* STATE 4: RESULTS DASHBOARD */}
            {testState === "results" && (
              <div className="flex flex-col justify-between h-full min-h-[440px] sm:min-h-[480px] space-y-4 sm:space-y-5 animate-in zoom-in-98 duration-200 overflow-y-auto pr-1">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 shrink-0">
                  <div>
                    <span className="text-[11px] font-mono font-medium text-gray-400 uppercase tracking-widest">
                      Performans Raporu
                    </span>
                    <h3 className="font-display text-lg sm:text-2xl font-normal text-gray-900">
                      Biyonik Okuma Analizi
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600 font-mono">
                    <FileText className="size-3.5 text-gray-500" />
                    <span className="truncate max-w-[140px] sm:max-w-none">
                      {currentArticle.title}
                    </span>
                    <span>•</span>
                    <span>{realNormalWordsCount} kelime</span>
                  </div>
                </div>

                {/* Comparative KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5 shrink-0">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3.5 sm:p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                      <span>Normal Okuma</span>
                      <Clock className="size-3.5 text-gray-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-light text-gray-900 font-mono">
                      {normalWpm} <span className="text-xs font-normal text-gray-500">WPM</span>
                    </div>
                    <div className="text-[11px] sm:text-[11px] text-gray-500 font-mono pt-1 border-t border-gray-200/60">
                      Süre: {normalSeconds} sn
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-900 bg-white p-3.5 sm:p-4 space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between text-xs text-gray-900 font-semibold">
                      <span>Biyonik Okuma</span>
                      <Zap className="size-3.5 text-gray-900" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-normal text-gray-900 font-mono">
                      {bionicWpm} <span className="text-xs font-normal text-gray-500">WPM</span>
                    </div>
                    <div className="text-[11px] sm:text-[11px] text-gray-700 font-mono pt-1 border-t border-gray-100">
                      Süre: {bionicSeconds} sn
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-neutral-900 text-white p-3.5 sm:p-4 space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
                      <span>Hız Artış Oranı</span>
                      <ArrowUpRight className="size-3.5 text-emerald-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-medium text-white font-mono">
                      +{speedIncreasePercent}%
                    </div>
                    <div className="text-[11px] sm:text-[11px] text-gray-300 font-mono pt-1 border-t border-neutral-800">
                      {savedSeconds > 0 ? `${savedSeconds} sn tasarruf` : "Bilişsel akış artışı"}
                    </div>
                  </div>
                </div>

                {/* Comparative Visual Graph Bars */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3 shrink-0">
                  <div className="flex items-center justify-between text-xs">
                    <h4 className="font-display font-semibold text-gray-900">Okuma Hızı Farkı</h4>
                    <span className="font-mono text-gray-500">
                      +{Math.max(0, bionicWpm - normalWpm)} WPM artış
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-gray-600 font-mono">
                        <span>Standart Metin</span>
                        <span>
                          {normalWpm} WPM ({normalSeconds} sn)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-gray-400 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(15, (normalWpm / Math.max(normalWpm, bionicWpm)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-gray-900 font-semibold font-mono">
                        <span>Biyonik Metin</span>
                        <span>
                          {bionicWpm} WPM ({bionicSeconds} sn)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-neutral-900 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(15, (bionicWpm / Math.max(normalWpm, bionicWpm)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-gray-100 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetTest}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-xs font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Yeni Bir Metin Seç</span>
                  </button>

                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    {onGoToProfile && (
                      <button
                        type="button"
                        onClick={onGoToProfile}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 text-xs font-semibold transition-colors shadow-xs"
                      >
                        <span>Profil & İstatistikleri Gör</span>
                        <ArrowUpRight className="size-3.5" />
                      </button>
                    )}

                    {onBackToTranslate && (
                      <button
                        type="button"
                        onClick={onBackToTranslate}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-neutral-900 text-white px-5 py-2.5 text-xs font-medium hover:bg-black transition-colors shadow-xs"
                      >
                        <BookOpen className="size-3.5" />
                        <span>Çeviriciye Dön</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
