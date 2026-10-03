import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Trophy,
  Zap,
  Users,
  Swords,
  RotateCcw,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Award,
  Radio,
  Copy,
  Check,
  Share2,
  Plus,
  LogIn,
  AlertCircle,
  Clock,
} from "lucide-react";
import { convertToBionicHtml } from "./bionic-transformer";
import { saveTestResult } from "@/lib/reading-stats-store";
import { getUserSettings, type UserSettings } from "@/lib/user-settings-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RealRacer {
  id: string;
  name: string;
  avatar: string;
  isHost?: boolean;
  ready?: boolean;
}

interface RaceArticlePair {
  id: string;
  title: string;
  category: string;
  normalText: string;
  bionicText: string;
}

const RACE_TEXT_PAIRS: RaceArticlePair[] = [
  {
    id: "pair-1",
    title: "Nöroplastisite ve Zihinsel Sürat",
    category: "Nörobilim & Zihin",
    normalText:
      "İnsan beyni, edindiği her yeni bilgi ve deneyimle sinirsel bağlantılarını yeniden şekillendirebilen dinamik bir organ yapısına sahiptir. Bu olağanüstü biyolojik esneklik, nöroplastisite olarak adlandırılır. Hızlı ve odaklanmış okuma antrenmanları, beynin görsel işleme merkezleri ile dil algılama ağları arasındaki iletim hızını katlar. Zihinsel odaklanma derinleştikçe, metin bloklarını çözümleme süresi azalır ve bilgi kalıcı hafızaya çok daha süratle aktarılır.",
    bionicText:
      "Beynimizin yapısal esnekliği, zihinsel kapasitemizi sürekli olarak geliştirmemize olanak tanır. Bilinçli görsel yönlendirme teknikleri, göz kaslarının gereksiz geri dönüşlerini engelleyerek odaklanma eşiğini en üst seviyeye taşır. Bilişsel işlem hızının artmasıyla birlikte, sözcük öbekleri bütünsel kavramlar halinde kavranir. Bu sistematik disiplin, okuma hızımızı ikiye katlarken anlama derinliğimizi maksimum düzeyde korumamızı sağlar.",
  },
  {
    id: "pair-2",
    title: "Kuantum Gerçekliği ve Zaman Algısı",
    category: "Fizik & Evren",
    normalText:
      "Kuantum mekaniği, mikroskobik ölçekte evrenin kesin kurallarla değil, olasılık dalgalarıyla işlediğini ortaya koymuştur. Parçacıkların aynı anda birden fazla durumda bulunabilmesi anlamına gelen süperpozisyon ilkesi, klasik deterministik fizik algısını temelden sarsmıştır. Zamanın akışı da mutlak bir şerit değil, gözlemcinin referans sistemine göre şekillenen göreli bir boyuttur. Bu büyüleyici bilimsel gerçekler, algımızın evreni anlama sınırlarını genişletir.",
    bionicText:
      "Atom altı dünyanın dinamikleri, madde ve enerjinin birbirine nasıl dönüştüğünü çarpıcı biçimde sergilemektedir. Kuantum dolanıklık ilkesi, mesafeler ne kadar uzak olursa olsun parçacıkların anlık iletişim kurabildiğini kanıtlar. Evrenin bu derin matematiği, insan zihninin karmaşık ilişkileri modelleme kabiliyetini sınar. Bilimsel kavrayışımız derinleştikçe, doğanın gizli kalmış simetrileri aydınlanmaya devam eder.",
  },
  {
    id: "pair-3",
    title: "Yapay Zeka ve Bilgi Devrimi",
    category: "Gelecek & Teknoloji",
    normalText:
      "Yapay zeka sistemleri, insan düşüncesinin örüntü tanıma ve bağlamsal ilişki kurma mekanizmalarını bilgisayar mimarileriyle simüle eder. Derin öğrenme algoritmalarının gelişimi, devasa veri yığınları içerisindeki karmaşık desenleri insanüstü bir hızla analiz ederek yeni hipotezler üretir. Bilginin geometrik olarak çoğaldığı bu yeni çağda, bireylerin bilgiye ulaşma ve onu kavrama hızı en kritik entelektüel avantaj haline gelmiştir.",
    bionicText:
      "Yapay sinir ağlarının gelişimi, modern toplumların veri işleme kapasitesini kökten dönüştürmektedir. Karmaşık problemlerin çözümü, çok boyutlu matematiksel modellerin optimize edilmesiyle mümkün kılınır. İnsan zihni ile akıllı sistemlerin uyumlu iş birliği, bilimsel keşiflerin hızını katlayarak yeni bir aydınlanma çağının kapılarını aralamaktadır. Geleceğin dünyasında hızlı öğrenme, başarının anahtarıdır.",
  },
];

const DEFAULT_RACE_ARTICLE = RACE_TEXT_PAIRS[0] as RaceArticlePair;

type RaceViewMode =
  | "lobby"
  | "creating_room"
  | "joining_room"
  | "public_waiting"
  | "room_waiting"
  | "stage1_countdown"
  | "stage1_racing"
  | "stage1_summary"
  | "stage2_countdown"
  | "stage2_racing"
  | "verdict";

interface ReadingRacePageProps {
  onBackToTranslate: () => void;
  userEmail?: string;
}

export function ReadingRacePage({
  onBackToTranslate,
  userEmail = "kullanici@bionictext.com",
}: ReadingRacePageProps) {
  const [viewMode, setViewMode] = useState<RaceViewMode>("lobby");
  const [roomId, setRoomId] = useState<string>("");
  const [joinCodeInput, setJoinCodeInput] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [queueElapsedSec, setQueueElapsedSec] = useState<number>(0);
  const [onlineCountInQueue, setOnlineCountInQueue] = useState<number>(1);

  // Players
  const [isHost, setIsHost] = useState<boolean>(false);
  const [opponent, setOpponent] = useState<RealRacer | null>(null);

  // Active Article
  const [activeArticle, setActiveArticle] = useState<RaceArticlePair>(DEFAULT_RACE_ARTICLE);
  const [userSettings, setUserSettings] = useState<UserSettings>(getUserSettings());

  // Countdown timer
  const [countdown, setCountdown] = useState<number>(3);

  // Stage 1 metrics (User & Opponent)
  const [stage1StartTime, setStage1StartTime] = useState<number>(0);
  const [stage1UserDuration, setStage1UserDuration] = useState<number>(0);
  const [stage1UserWpm, setStage1UserWpm] = useState<number>(0);
  const [stage1OpponentWpm, setStage1OpponentWpm] = useState<number>(0);
  const [stage1UserProgress, setStage1UserProgress] = useState<number>(0);
  const [stage1OpponentProgress, setStage1OpponentProgress] = useState<number>(0);
  const [stage1UserFinished, setStage1UserFinished] = useState<boolean>(false);
  const [stage1OpponentFinished, setStage1OpponentFinished] = useState<boolean>(false);

  // Stage 2 metrics (User & Opponent)
  const [stage2StartTime, setStage2StartTime] = useState<number>(0);
  const [stage2UserDuration, setStage2UserDuration] = useState<number>(0);
  const [stage2UserWpm, setStage2UserWpm] = useState<number>(0);
  const [stage2OpponentWpm, setStage2OpponentWpm] = useState<number>(0);
  const [stage2UserProgress, setStage2UserProgress] = useState<number>(0);
  const [stage2OpponentProgress, setStage2OpponentProgress] = useState<number>(0);
  const [stage2UserFinished, setStage2UserFinished] = useState<boolean>(false);
  const [stage2OpponentFinished, setStage2OpponentFinished] = useState<boolean>(false);

  const localUserId = useRef<string>(`usr_${Math.random().toString(36).substring(2, 8)}`).current;

  const currentChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const queueTimerRef = useRef<NodeJS.Timeout | null>(null);

  const username = (userEmail ? userEmail.split("@")[0] : "") || "Okuyucu";
  const userInitial = username.charAt(0).toUpperCase();

  useEffect(() => {
    setUserSettings(getUserSettings());
  }, []);

  // Cleanup Supabase channels on unmount
  useEffect(() => {
    return () => {
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
      if (currentChannelRef.current) {
        supabase.removeChannel(currentChannelRef.current);
      }
    };
  }, []);

  // Leave room / Leave queue
  const leaveActiveRoom = useCallback(() => {
    if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    if (currentChannelRef.current) {
      supabase.removeChannel(currentChannelRef.current);
      currentChannelRef.current = null;
    }
    setViewMode("lobby");
    setRoomId("");
    setOpponent(null);
    setIsHost(false);
    setStage1UserFinished(false);
    setStage1OpponentFinished(false);
    setStage2UserFinished(false);
    setStage2OpponentFinished(false);
  }, []);

  // =========================================================================
  // REAL MULTIPLAYER ROOM CHANNEL SETUP
  // =========================================================================
  const connectToRaceRoom = useCallback(
    (targetRoomId: string, asHost: boolean, initialArticleId?: string) => {
      setRoomId(targetRoomId);
      setIsHost(asHost);
      setViewMode("room_waiting");

      if (currentChannelRef.current) {
        supabase.removeChannel(currentChannelRef.current);
      }

      const roomChannel = supabase.channel(`bionic_duel_${targetRoomId}`, {
        config: { presence: { key: localUserId } },
      });
      currentChannelRef.current = roomChannel;

      // Listen to room events
      roomChannel
        .on("presence", { event: "sync" }, () => {
          const presenceState = roomChannel.presenceState();
          const activeUsers = Object.values(presenceState).flat() as unknown as {
            id: string;
            name: string;
            avatar: string;
            isHost: boolean;
          }[];

          const foundOpponent = activeUsers.find((u) => u.id !== localUserId);
          if (foundOpponent) {
            setOpponent({
              id: foundOpponent.id,
              name: foundOpponent.name || "Canlı Yarışmacı",
              avatar: foundOpponent.avatar || "Y",
              isHost: foundOpponent.isHost,
            });
          } else {
            setOpponent(null);
          }
        })
        .on("presence", { event: "leave" }, ({ leftPresences }) => {
          const leftIds = leftPresences.map((p: unknown) => (p as { id: string })?.id);
          if (leftIds.includes(opponent?.id ?? "")) {
            toast.error("Rakip odadan ayrıldı.");
            setOpponent(null);
          }
        })
        .on("broadcast", { event: "start_race" }, ({ payload }) => {
          if (payload?.articleId) {
            const article =
              RACE_TEXT_PAIRS.find((p) => p.id === payload.articleId) ?? DEFAULT_RACE_ARTICLE;
            setActiveArticle(article);
          }
          startStage1Sequence();
        })
        .on("broadcast", { event: "stage1_progress" }, ({ payload }) => {
          if (payload?.progress !== undefined) setStage1OpponentProgress(payload.progress);
        })
        .on("broadcast", { event: "stage1_finished" }, ({ payload }) => {
          setStage1OpponentFinished(true);
          setStage1OpponentProgress(100);
          if (payload?.wpm) setStage1OpponentWpm(payload.wpm);
        })
        .on("broadcast", { event: "start_stage2" }, () => {
          startStage2Sequence();
        })
        .on("broadcast", { event: "stage2_progress" }, ({ payload }) => {
          if (payload?.progress !== undefined) setStage2OpponentProgress(payload.progress);
        })
        .on("broadcast", { event: "stage2_finished" }, ({ payload }) => {
          setStage2OpponentFinished(true);
          setStage2OpponentProgress(100);
          if (payload?.wpm) setStage2OpponentWpm(payload.wpm);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await roomChannel.track({
              id: localUserId,
              name: username,
              avatar: userInitial,
              isHost: asHost,
            });

            if (asHost && initialArticleId) {
              const article =
                RACE_TEXT_PAIRS.find((p) => p.id === initialArticleId) ?? DEFAULT_RACE_ARTICLE;
              setActiveArticle(article);
            }
          }
        });
    },
    [localUserId, username, userInitial, opponent],
  );

  // =========================================================================
  // CREATE CUSTOM ROOM
  // =========================================================================
  const handleCreateCustomRoom = () => {
    const randomCode = `BIONIC-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomArticle =
      RACE_TEXT_PAIRS[Math.floor(Math.random() * RACE_TEXT_PAIRS.length)] ?? DEFAULT_RACE_ARTICLE;
    connectToRaceRoom(randomCode, true, randomArticle.id);
  };

  // =========================================================================
  // JOIN CUSTOM ROOM
  // =========================================================================
  const handleJoinCustomRoom = () => {
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      toast.error("Lütfen 6 haneli oda kodunu girin.");
      return;
    }
    connectToRaceRoom(cleanCode, false);
  };

  // =========================================================================
  // PUBLIC MATCHMAKING QUEUE (WAIT FOR REAL HUMAN)
  // =========================================================================
  const handleJoinPublicQueue = () => {
    setViewMode("public_waiting");
    setQueueElapsedSec(0);

    if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    queueTimerRef.current = setInterval(() => {
      setQueueElapsedSec((prev) => prev + 1);
    }, 1000);

    if (currentChannelRef.current) {
      supabase.removeChannel(currentChannelRef.current);
    }

    const publicChannel = supabase.channel("bionic_public_match_queue", {
      config: { presence: { key: localUserId } },
    });
    currentChannelRef.current = publicChannel;

    publicChannel
      .on("presence", { event: "sync" }, () => {
        const state = publicChannel.presenceState();
        const queuedUsers = Object.values(state).flat() as unknown as {
          id: string;
          name: string;
          avatar: string;
          queuedAt: number;
        }[];

        setOnlineCountInQueue(queuedUsers.length);

        // If there is another real user in queue, pair them
        const otherUsers = queuedUsers.filter((u) => u.id !== localUserId);
        if (otherUsers.length > 0) {
          const earliestOpponent = otherUsers.sort((a, b) => a.queuedAt - b.queuedAt)[0];
          if (earliestOpponent) {
            // Player with smaller ID initiates room
            if (localUserId < earliestOpponent.id) {
              const sharedRoomCode = `MATCH-${localUserId.slice(-4)}-${earliestOpponent.id.slice(-4)}`;
              const selectedArticle =
                RACE_TEXT_PAIRS[Math.floor(Math.random() * RACE_TEXT_PAIRS.length)] ??
                DEFAULT_RACE_ARTICLE;

              publicChannel.send({
                type: "broadcast",
                event: "match_ready",
                payload: {
                  roomCode: sharedRoomCode,
                  hostId: localUserId,
                  guestId: earliestOpponent.id,
                  articleId: selectedArticle.id,
                },
              });

              connectToRaceRoom(sharedRoomCode, true, selectedArticle.id);
            }
          }
        }
      })
      .on("broadcast", { event: "match_ready" }, ({ payload }) => {
        if (payload?.guestId === localUserId && payload?.roomCode) {
          connectToRaceRoom(payload.roomCode, false, payload.articleId);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await publicChannel.track({
            id: localUserId,
            name: username,
            avatar: userInitial,
            queuedAt: Date.now(),
          });
        }
      });
  };

  // Host starts the race for both users
  const handleHostStartRace = () => {
    if (!opponent) {
      toast.error("Yarışı başlatmak için odada 2 oyuncu olmalıdır.");
      return;
    }
    const selectedArticle =
      RACE_TEXT_PAIRS[Math.floor(Math.random() * RACE_TEXT_PAIRS.length)] ?? DEFAULT_RACE_ARTICLE;
    setActiveArticle(selectedArticle);

    if (currentChannelRef.current) {
      currentChannelRef.current.send({
        type: "broadcast",
        event: "start_race",
        payload: { articleId: selectedArticle.id },
      });
    }

    startStage1Sequence();
  };

  // 1. Stage 1 Sequence
  const startStage1Sequence = () => {
    setViewMode("stage1_countdown");
    setCountdown(3);
    setStage1UserProgress(0);
    setStage1OpponentProgress(0);
    setStage1UserFinished(false);
    setStage1OpponentFinished(false);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(interval);
        setViewMode("stage1_racing");
        setStage1StartTime(Date.now());
      }
    }, 1000);
  };

  // User finishes Stage 1
  const handleFinishStage1 = () => {
    if (stage1UserFinished) return;
    const now = Date.now();
    const durationSec = Math.max(1, (now - stage1StartTime) / 1000);
    const normalWords = activeArticle.normalText.split(/\s+/).filter(Boolean).length;
    const calculatedWpm = Math.round((normalWords / durationSec) * 60);

    setStage1UserDuration(durationSec);
    setStage1UserWpm(calculatedWpm);
    setStage1UserProgress(100);
    setStage1UserFinished(true);

    if (currentChannelRef.current) {
      currentChannelRef.current.send({
        type: "broadcast",
        event: "stage1_finished",
        payload: { wpm: calculatedWpm, duration: durationSec },
      });
    }

    setTimeout(() => {
      setViewMode("stage1_summary");
    }, 600);
  };

  // Host triggers Stage 2
  const handleTriggerStage2 = () => {
    if (currentChannelRef.current) {
      currentChannelRef.current.send({
        type: "broadcast",
        event: "start_stage2",
      });
    }
    startStage2Sequence();
  };

  // 2. Stage 2 Sequence
  const startStage2Sequence = () => {
    setViewMode("stage2_countdown");
    setCountdown(3);
    setStage2UserProgress(0);
    setStage2OpponentProgress(0);
    setStage2UserFinished(false);
    setStage2OpponentFinished(false);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(interval);
        setViewMode("stage2_racing");
        setStage2StartTime(Date.now());
      }
    }, 1000);
  };

  // User finishes Stage 2
  const handleFinishStage2 = () => {
    if (stage2UserFinished) return;
    const now = Date.now();
    const durationSec = Math.max(1, (now - stage2StartTime) / 1000);
    const bionicWords = activeArticle.bionicText.split(/\s+/).filter(Boolean).length;
    const calculatedBionicWpm = Math.round((bionicWords / durationSec) * 60);

    setStage2UserDuration(durationSec);
    setStage2UserWpm(calculatedBionicWpm);
    setStage2UserProgress(100);
    setStage2UserFinished(true);

    if (currentChannelRef.current) {
      currentChannelRef.current.send({
        type: "broadcast",
        event: "stage2_finished",
        payload: { wpm: calculatedBionicWpm, duration: durationSec },
      });
    }

    saveTestResult({
      title: `Canlı Yarış vs ${opponent?.name || "Rakip"}`,
      normalWpm: stage1UserWpm,
      bionicWpm: calculatedBionicWpm,
      accuracy: 96,
      durationSeconds: Math.round(stage1UserDuration + durationSec),
    });

    setTimeout(() => {
      setViewMode("verdict");
    }, 600);
  };

  const copyRoomCodeToClipboard = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    toast.success(`Oda Kodu Kopyalandı: ${roomId}`);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const userWon = stage2UserWpm >= stage2OpponentWpm;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 font-sans text-gray-900 pb-12 select-none">
      {/* =========================================================================
          VIEW 1: LOBBY (CHOICE OF PUBLIC MATCH OR PRIVATE ROOM)
          ========================================================================= */}
      {viewMode === "lobby" && (
        <div className="rounded-3xl border border-gray-200/90 bg-white/95 p-6 sm:p-10 shadow-xl backdrop-blur-md text-center space-y-8 min-h-[480px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-700">
              <Radio className="size-4 text-emerald-600 animate-pulse" />
              <span>Canlı Çok Oyunculu Okuma Arenası</span>
            </div>
            <button
              type="button"
              onClick={onBackToTranslate}
              className="text-xs text-gray-500 hover:text-black font-medium transition-colors"
            >
              Çeviriye Dön
            </button>
          </div>

          <div className="space-y-3 max-w-lg mx-auto">
            <div className="size-16 rounded-full bg-gradient-to-tr from-gray-900 to-gray-700 text-white flex items-center justify-center mx-auto shadow-md">
              <Swords className="size-8" />
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-semibold text-gray-900">
              Canlı Çok Oyunculu Okuma Yarışı
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Arkadaşınızla özel oda açarak veya genel sıraya katılarak gerçek zamanlı eşleşin. Her
              iki oyuncu 1. etapta normal, 2. etapta biyonik metni canlı senkronize okur.
            </p>
          </div>

          {/* Action Cards: Public Queue vs Custom Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
            {/* Card 1: Public Matchmaking */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/60 hover:bg-white hover:border-black transition-all flex flex-col justify-between text-left space-y-4 shadow-2xs">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                  <Users className="size-4 text-black" />
                  <span>Genel Sıra ile Eşleş</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Çevrim içi sırada bekleyen başka bir canlı kullanıcı ile anında eşleş.
                </p>
              </div>

              <button
                type="button"
                onClick={handleJoinPublicQueue}
                className="w-full py-2.5 rounded-xl bg-black text-white hover:bg-gray-800 text-xs font-semibold transition-all active:scale-95 text-center shadow-xs"
              >
                Sıraya Gir & Eşleş
              </button>
            </div>

            {/* Card 2: Custom Private Room */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/60 hover:bg-white hover:border-black transition-all flex flex-col justify-between text-left space-y-4 shadow-2xs">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                  <Plus className="size-4 text-black" />
                  <span>Arkadaşınla Özel Oda</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Oda kodu oluşturup arkadaşına gönder veya var olan bir koda katıl.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCreateCustomRoom}
                  className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white hover:bg-black text-xs font-semibold transition-all active:scale-95 text-center shadow-xs"
                >
                  Oda Oluştur
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("joining_room")}
                  className="px-3 py-2.5 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-100 text-xs font-semibold transition-all active:scale-95"
                >
                  Koda Katıl
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: JOINING CUSTOM ROOM MODAL / INPUT
          ========================================================================= */}
      {viewMode === "joining_room" && (
        <div className="rounded-3xl border border-gray-200/90 bg-white/95 p-6 sm:p-10 shadow-xl backdrop-blur-md text-center space-y-6 max-w-lg mx-auto min-h-[400px] flex flex-col justify-center">
          <div className="space-y-2">
            <div className="size-14 rounded-full bg-gray-100 text-gray-900 flex items-center justify-center mx-auto shadow-xs">
              <LogIn className="size-7" />
            </div>
            <h3 className="font-display text-lg sm:text-xl font-semibold text-gray-900">
              Özel Odaya Katıl
            </h3>
            <p className="text-xs text-gray-500">
              Arkadaşınızın oluşturduğu 6 haneli oda kodunu girin.
            </p>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value)}
              placeholder="Örn: BIONIC-4821"
              className="w-full text-center py-3.5 px-4 rounded-2xl border border-gray-200 bg-gray-50 text-base font-mono uppercase font-bold tracking-wider text-gray-900 focus:outline-none focus:border-black transition-all"
            />

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setViewMode("lobby")}
                className="flex-1 py-3 rounded-xl border border-gray-200 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-all"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleJoinCustomRoom}
                className="flex-1 py-3 rounded-xl bg-black text-white hover:bg-gray-800 text-xs font-semibold transition-all shadow-xs"
              >
                Odaya Bağlan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: PUBLIC MATCH QUEUE (WAITING FOR ACTUAL USER)
          ========================================================================= */}
      {viewMode === "public_waiting" && (
        <div className="rounded-3xl border border-gray-200/90 bg-white/95 p-8 sm:p-12 shadow-xl backdrop-blur-md text-center space-y-6 min-h-[460px] flex flex-col items-center justify-center">
          <div className="relative size-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-gray-300 animate-spin" />
            <div className="size-16 rounded-full bg-gradient-to-tr from-gray-900 to-gray-700 text-white flex items-center justify-center shadow-md animate-pulse">
              <Users className="size-7" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-display text-lg sm:text-xl font-semibold text-gray-900">
              Genel Sırada Canlı Rakip Bekleniyor...
            </h3>
            <p className="text-xs text-gray-500 max-w-md">
              Supabase Realtime kuyruğunda başka bir kullanıcı aranıyor. Biri sıraya girdiği an
              yarış başlayacaktır.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 text-xs font-mono text-gray-700">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              <span>
                Kuyruk Süresi: {Math.floor(queueElapsedSec / 60)}:
                {String(queueElapsedSec % 60).padStart(2, "0")}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-xs font-mono text-gray-700">
              <Users className="size-3.5" />
              <span>Sırada: {onlineCountInQueue} Kişi</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={leaveActiveRoom}
              className="px-6 py-2.5 rounded-full border border-gray-300 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors"
            >
              Sıradan Ayrıl
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 4: ROOM WAITING LOBBY (CUSTOM ROOM WITH CODE & SHARE)
          ========================================================================= */}
      {viewMode === "room_waiting" && (
        <div className="rounded-3xl border border-gray-200/90 bg-white/95 p-6 sm:p-10 shadow-xl backdrop-blur-md text-center space-y-7 min-h-[460px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <Radio className="size-4 text-emerald-600 animate-pulse" />
              <span>Oda Durumu: {opponent ? "2/2 Oyuncu Hazır" : "1/2 Oyuncu Bekleniyor"}</span>
            </div>
            <button
              type="button"
              onClick={leaveActiveRoom}
              className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              Odadan Ayrıl
            </button>
          </div>

          {/* Room Code Card */}
          <div className="max-w-md mx-auto w-full p-4 rounded-2xl border border-gray-200 bg-gray-50/80 space-y-2">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Oda Kodu (Arkadaşına Gönder)
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-gray-900">
                {roomId}
              </span>
              <button
                type="button"
                onClick={copyRoomCodeToClipboard}
                className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 transition-all active:scale-95"
                title="Kodu Kopyala"
              >
                {copiedCode ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              İkinci bir sekmede veya cihazda "Koda Katıl" diyerek bu kodu girebilirsiniz.
            </p>
          </div>

          {/* Connected Racers Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto w-full">
            {/* You */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs flex items-center gap-3 text-left">
              <div className="size-12 rounded-full bg-[#121620] text-white flex items-center justify-center text-base font-bold shrink-0">
                {userInitial}
              </div>
              <div>
                <div className="font-semibold text-xs sm:text-sm text-gray-900">
                  {username} (Sen)
                </div>
                <div className="text-[11px] text-emerald-600 font-medium font-mono">
                  {isHost ? "Oda Sahibi" : "Katılımcı"}
                </div>
              </div>
            </div>

            {/* Opponent (Real) */}
            <div
              className={`p-4 rounded-2xl border flex items-center gap-3 text-left ${
                opponent
                  ? "border-gray-200 bg-white shadow-2xs"
                  : "border-dashed border-gray-300 bg-gray-50/50"
              }`}
            >
              {opponent ? (
                <>
                  <div className="size-12 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-base font-bold shrink-0">
                    {opponent.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-xs sm:text-sm text-gray-900">
                      {opponent.name}
                    </div>
                    <div className="text-[11px] text-emerald-600 font-medium font-mono">
                      Bağlandı • Hazır
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full text-center py-2 text-xs text-gray-400 font-medium">
                  2. Oyuncu bekleniyor...
                </div>
              )}
            </div>
          </div>

          {/* Host Start Button */}
          <div className="pt-2 max-w-sm mx-auto w-full">
            {isHost ? (
              <button
                type="button"
                onClick={handleHostStartRace}
                disabled={!opponent}
                className="w-full py-3.5 rounded-full bg-black hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-black text-white text-sm font-semibold shadow-md transition-all active:scale-95"
              >
                {opponent ? "Yarışı Başlat" : "Oyuncu Bekleniyor..."}
              </button>
            ) : (
              <div className="text-xs text-gray-500 font-medium py-2">
                Oda sahibinin yarışı başlatması bekleniyor...
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          STAGE 1: COUNTDOWN & STANDART TEXT RACE
          ========================================================================= */}
      {viewMode === "stage1_countdown" && (
        <div className="rounded-3xl border border-gray-200/90 bg-white/95 p-8 shadow-xl backdrop-blur-md text-center space-y-4 min-h-[460px] flex flex-col items-center justify-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            1. ETAP: STANDART OKUMA BAŞLIYOR
          </div>
          <div className="size-24 rounded-full bg-gray-900 text-white flex items-center justify-center font-display text-5xl font-bold animate-bounce shadow-xl">
            {countdown}
          </div>
          <p className="text-xs text-gray-500 max-w-xs">
            Metni doğal hızınızda dikkatle okuyun ve bitirdiğinizde butona basın.
          </p>
        </div>
      )}

      {viewMode === "stage1_racing" && (
        <div className="rounded-3xl border border-gray-200/90 bg-white/95 p-4 sm:p-7 shadow-xl backdrop-blur-md space-y-6">
          <div className="space-y-3 border-b border-gray-100 pb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                1. Etap: Normal Metin Hız Yarışı
              </span>
              <span className="text-xs font-mono text-gray-400">
                {activeArticle.normalText.split(/\s+/).filter(Boolean).length} Kelime
              </span>
            </div>

            {/* Live Synchronized Progress Tracks */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs">
                <span className="w-16 font-semibold text-gray-900 truncate">Sen</span>
                <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden relative">
                  <div
                    className="h-full bg-black transition-all duration-300 rounded-full"
                    style={{ width: `${stage1UserProgress}%` }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-gray-600 font-medium">
                  {stage1UserProgress}%
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="w-16 font-medium text-gray-600 truncate">
                  {opponent?.name || "Rakip"}
                </span>
                <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden relative">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                    style={{ width: `${stage1OpponentProgress}%` }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-gray-600 font-medium">
                  {stage1OpponentProgress}%
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-7 rounded-2xl bg-gray-50 border border-gray-100 text-sm sm:text-base leading-relaxed text-gray-800 font-sans max-h-[300px] overflow-y-auto select-text">
            <h4 className="font-display font-semibold text-base sm:text-lg text-gray-900 mb-3">
              {activeArticle.title}
            </h4>
            <p className="whitespace-pre-line leading-relaxed">{activeArticle.normalText}</p>
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleFinishStage1}
              className="rounded-full bg-black hover:bg-neutral-800 text-white px-8 py-3.5 text-xs sm:text-sm font-semibold shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <span>1. Etabı Okumayı Bitirdim</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          STAGE 1 SUMMARY
          ========================================================================= */}
      {viewMode === "stage1_summary" && (
        <div className="rounded-3xl border border-gray-200/90 bg-white/95 p-6 sm:p-8 shadow-xl backdrop-blur-md text-center space-y-6 animate-in fade-in duration-200">
          <div className="size-14 rounded-full bg-gray-100 text-gray-900 flex items-center justify-center mx-auto shadow-xs">
            <Award className="size-7" />
          </div>

          <div className="space-y-1">
            <h3 className="font-display text-lg sm:text-xl font-semibold text-gray-900">
              1. Etap (Normal Okuma) Tamamlandı!
            </h3>
            <p className="text-xs text-gray-500">
              Şimdi kardeş metni Biyonik formatta okuyarak düelloyu tamamlayın.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center">
              <div className="text-xl sm:text-2xl font-bold font-mono text-gray-900">
                {stage1UserWpm} WPM
              </div>
              <div className="text-[11px] text-gray-500 font-medium">Senin Normal Hızın</div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center">
              <div className="text-xl sm:text-2xl font-bold font-mono text-indigo-900">
                {stage1OpponentWpm > 0 ? `${stage1OpponentWpm} WPM` : "Okuyor..."}
              </div>
              <div className="text-[11px] text-gray-500 font-medium">Rakibin Normal Hızı</div>
            </div>
          </div>

          <div className="pt-2">
            {isHost ? (
              <button
                type="button"
                onClick={handleTriggerStage2}
                className="rounded-full bg-gradient-to-r from-gray-900 to-black text-white px-8 py-3.5 text-xs sm:text-sm font-semibold shadow-md transition-all active:scale-95 flex items-center gap-2 mx-auto"
              >
                <Zap className="size-4 text-amber-400" />
                <span>2. Etap Biyonik Yarışına Başla</span>
                <ArrowRight className="size-4" />
              </button>
            ) : (
              <div className="text-xs text-gray-500 font-medium">
                Oda sahibinin 2. etabı başlatması bekleniyor...
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          STAGE 2: COUNTDOWN & BIONIC RACE
          ========================================================================= */}
      {viewMode === "stage2_countdown" && (
        <div className="rounded-3xl border border-gray-200/90 bg-white/95 p-8 shadow-xl backdrop-blur-md text-center space-y-4 min-h-[460px] flex flex-col items-center justify-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            2. ETAP: BİYONİK OKUMA DÜELLOSU
          </div>
          <div className="size-24 rounded-full bg-gradient-to-tr from-black to-gray-800 text-white flex items-center justify-center font-display text-5xl font-bold animate-bounce shadow-xl">
            {countdown}
          </div>
          <p className="text-xs text-gray-500 max-w-xs">
            Biyonik fiksasyon noktalarına odaklanarak gözlerinizi hızlandırın.
          </p>
        </div>
      )}

      {viewMode === "stage2_racing" && (
        <div className="rounded-3xl border border-gray-200/90 bg-white/95 p-4 sm:p-7 shadow-xl backdrop-blur-md space-y-6">
          <div className="space-y-3 border-b border-gray-100 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-900">
                  2. Etap: Biyonik Okuma Yarışı
                </span>
                <span className="px-2 py-0.5 rounded-full bg-black text-white text-[11px] font-bold">
                  BİYONİK MOD
                </span>
              </div>
              <span className="text-xs font-mono text-gray-400">
                {activeArticle.bionicText.split(/\s+/).filter(Boolean).length} Kelime
              </span>
            </div>

            {/* Live Synchronized Progress Tracks */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs">
                <span className="w-16 font-semibold text-gray-900 truncate">Sen</span>
                <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-black to-emerald-600 transition-all duration-300 rounded-full"
                    style={{ width: `${stage2UserProgress}%` }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-emerald-600 font-bold">
                  {stage2UserProgress}%
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="w-16 font-medium text-gray-600 truncate">
                  {opponent?.name || "Rakip"}
                </span>
                <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden relative">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                    style={{ width: `${stage2OpponentProgress}%` }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-gray-600 font-medium">
                  {stage2OpponentProgress}%
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-7 rounded-2xl bg-gray-50 border border-gray-100 text-sm sm:text-base leading-relaxed text-gray-900 font-sans max-h-[300px] overflow-y-auto select-text">
            <h4 className="font-display font-semibold text-base sm:text-lg text-gray-900 mb-3">
              {activeArticle.title}
            </h4>
            <div
              className="leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: convertToBionicHtml(activeArticle.bionicText, {
                  fixation: userSettings.bionicFixation,
                  saccade: userSettings.saccadeStep,
                }),
              }}
            />
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleFinishStage2}
              className="rounded-full bg-black hover:bg-neutral-800 text-white px-8 py-3.5 text-xs sm:text-sm font-semibold shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <Zap className="size-4 text-emerald-400" />
              <span>Yarışı Bitir & Sonucu Gör</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          FINAL VERDICT
          ========================================================================= */}
      {viewMode === "verdict" && (
        <div className="rounded-3xl border border-gray-200/90 bg-white/95 p-6 sm:p-10 shadow-xl backdrop-blur-md text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="space-y-2">
            <div
              className={`size-16 sm:size-20 rounded-full flex items-center justify-center mx-auto shadow-md ${
                userWon
                  ? "bg-gradient-to-tr from-amber-500 to-amber-300 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {userWon ? (
                <Trophy className="size-8 sm:size-10" />
              ) : (
                <Award className="size-8 sm:size-10" />
              )}
            </div>

            <h3 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">
              {userWon ? "Zafer Senin!" : "Çekişmeli Bir Yarış!"}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500">
              {userWon
                ? `Biyonik hızınla ${opponent?.name || "rakibini"} geride bıraktın.`
                : `${opponent?.name || "Rakibin"} ile kıyasıya mücadele ettin.`}
            </p>
          </div>

          <div className="max-w-2xl mx-auto w-full rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5 space-y-3">
            <div className="grid grid-cols-3 text-xs font-semibold text-gray-500 border-b border-gray-200 pb-2">
              <div className="text-left">Metrik</div>
              <div className="text-center font-bold text-gray-900">{username} (Sen)</div>
              <div className="text-right font-medium text-gray-700">
                {opponent?.name || "Rakip"}
              </div>
            </div>

            <div className="grid grid-cols-3 text-xs items-center py-1">
              <div className="text-left text-gray-600">1. Etap (Normal Hız)</div>
              <div className="text-center font-mono font-semibold text-gray-900">
                {stage1UserWpm} WPM
              </div>
              <div className="text-right font-mono text-gray-700">
                {stage1OpponentWpm > 0 ? `${stage1OpponentWpm} WPM` : "-"}
              </div>
            </div>

            <div className="grid grid-cols-3 text-xs items-center py-1 border-t border-gray-100">
              <div className="text-left text-gray-600 font-semibold flex items-center gap-1">
                <Zap className="size-3 text-emerald-600" />
                <span>2. Etap (Biyonik Hız)</span>
              </div>
              <div className="text-center font-mono font-bold text-emerald-700 text-sm">
                {stage2UserWpm} WPM
              </div>
              <div className="text-right font-mono font-semibold text-indigo-900 text-sm">
                {stage2OpponentWpm > 0 ? `${stage2OpponentWpm} WPM` : "-"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={leaveActiveRoom}
              className="rounded-full bg-black hover:bg-neutral-800 text-white px-6 py-3 text-xs sm:text-sm font-semibold shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <RotateCcw className="size-4" />
              <span>Yeni Yarış Başlat</span>
            </button>

            <button
              type="button"
              onClick={onBackToTranslate}
              className="rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 px-6 py-3 text-xs sm:text-sm font-semibold transition-all active:scale-95"
            >
              Çeviriye Dön
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
