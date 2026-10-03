import React, { useState, useEffect } from "react";
import {
  Gauge,
  Zap,
  TrendingUp,
  Trophy,
  Calendar,
  Mail,
  Edit2,
  ShieldCheck,
  BarChart2,
  FileText,
  ArrowRight,
  Play,
} from "lucide-react";
import {
  getTestHistory,
  calculateStats,
  TestResultRecord,
  CalculatedStatistics,
} from "@/lib/reading-stats-store";

interface ProfilePageProps {
  userEmail: string;
  onNavigate: (tab: "home" | "profile" | "stats" | "tests" | "assistant" | "settings") => void;
  activeTab?: string;
}

export function ProfilePage({ userEmail, onNavigate }: ProfilePageProps) {
  const [history, setHistory] = useState<TestResultRecord[]>([]);
  const [stats, setStats] = useState<CalculatedStatistics | null>(null);
  const [timeFilter, setTimeFilter] = useState<"7" | "30" | "all">("7");
  const [hoveredTestIndex, setHoveredTestIndex] = useState<number | null>(null);

  useEffect(() => {
    const refreshData = () => {
      const loaded = getTestHistory();
      setHistory(loaded);
      setStats(calculateStats(loaded));
    };

    refreshData();

    // Listen to custom stats update event & browser storage & tab focus
    const handleStatsUpdate = () => refreshData();
    window.addEventListener("bionictext_stats_updated", handleStatsUpdate);
    window.addEventListener("storage", handleStatsUpdate);
    window.addEventListener("focus", handleStatsUpdate);

    return () => {
      window.removeEventListener("bionictext_stats_updated", handleStatsUpdate);
      window.removeEventListener("storage", handleStatsUpdate);
      window.removeEventListener("focus", handleStatsUpdate);
    };
  }, []);

  const username = userEmail ? userEmail.split("@")[0] : "aydintolga008";
  const userInitial = username.charAt(0).toUpperCase();

  if (!stats) return null;

  const displayedHistory =
    timeFilter === "7" ? history.slice(-7) : timeFilter === "30" ? history.slice(-30) : history;

  const maxWpm = 400;
  const minWpm = 100;
  const chartHeight = 180;
  const chartWidth = 720;

  const getY = (wpm: number) => {
    const clamped = Math.min(Math.max(wpm, minWpm), maxWpm);
    const ratio = (clamped - minWpm) / (maxWpm - minWpm);
    return chartHeight - ratio * chartHeight;
  };

  const getX = (index: number, total: number) => {
    if (total <= 1) return chartWidth / 2;
    return (index / (total - 1)) * chartWidth;
  };

  const normalPoints = displayedHistory.map((item, idx) => ({
    x: getX(idx, displayedHistory.length),
    y: getY(item.normalWpm),
    wpm: item.normalWpm,
    test: item.testNumber,
  }));

  const bionicPoints = displayedHistory.map((item, idx) => ({
    x: getX(idx, displayedHistory.length),
    y: getY(item.bionicWpm),
    wpm: item.bionicWpm,
    test: item.testNumber,
    imp: item.improvementPercentage,
  }));

  const normalPath =
    normalPoints.length > 0
      ? normalPoints.reduce(
          (acc, curr, idx, arr) =>
            idx === 0
              ? `M ${curr.x} ${curr.y}`
              : `${acc} Q ${(arr[idx - 1].x + curr.x) / 2} ${arr[idx - 1].y}, ${curr.x} ${curr.y}`,
          "",
        )
      : "";

  const bionicPath =
    bionicPoints.length > 0
      ? bionicPoints.reduce(
          (acc, curr, idx, arr) =>
            idx === 0
              ? `M ${curr.x} ${curr.y}`
              : `${acc} Q ${(arr[idx - 1].x + curr.x) / 2} ${arr[idx - 1].y}, ${curr.x} ${curr.y}`,
          "",
        )
      : "";

  return (
    <div className="w-full space-y-4 sm:space-y-6 select-none font-sans text-gray-900 pb-12">
      {/* 1. USER PROFILE HEADER CARD */}
      <div className="rounded-3xl border border-gray-200/90 bg-white shadow-xs p-4 sm:p-7 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-3.5 sm:gap-5 w-full sm:w-auto">
          {/* Avatar Circle */}
          <div className="flex size-14 sm:size-20 items-center justify-center rounded-full bg-[#121620] text-white text-xl sm:text-2xl font-bold shadow-md shrink-0">
            {userInitial}
          </div>

          {/* User Details */}
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg sm:text-2xl font-semibold text-gray-900 tracking-tight truncate">
                {username}
              </h1>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              <Mail className="size-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{userEmail}</span>
            </div>
          </div>
        </div>

        {/* Right Stats & Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          <div className="rounded-2xl border border-gray-100 bg-[#f8f9fb] px-4 sm:px-6 py-2.5 sm:py-3 text-center relative group min-w-[100px] sm:min-w-[120px]">
            <button
              type="button"
              className="absolute -top-2 -right-2 p-1 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-black shadow-2xs opacity-80 group-hover:opacity-100 transition-opacity"
              title="Testleri Gör"
              aria-label="Testleri Gör"
              onClick={() => onNavigate("tests")}
            >
              <Edit2 className="size-3" />
            </button>
            <div className="text-2xl sm:text-3xl font-display font-semibold text-gray-900">
              {stats.totalTests}
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-gray-500">Toplam Test</div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("tests")}
            className="sm:hidden flex items-center gap-1.5 rounded-full bg-[#121620] text-white px-4 py-2.5 text-xs font-semibold"
          >
            <Play className="size-3 fill-current" />
            <span>Test Yap</span>
          </button>
        </div>
      </div>

      {/* 2. OKUMA İSTATİSTİKLERİ (4 KPI Cards) */}
      <div className="space-y-2.5 sm:space-y-3.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-900">
            <BarChart2 className="size-4.5 text-gray-700" />
            <h2>Okuma İstatistikleri</h2>
          </div>
          <p className="text-[11px] sm:text-xs text-gray-500">
            Okuma performansınızın genel görünümü
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Ort. Normal Hız */}
          <div className="rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3 sm:space-y-4 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-gray-700">Ort. Normal Hız</span>
                <p className="text-[10px] sm:text-[11px] text-gray-400 leading-tight">
                  Standart metinlerde ortalama hızınız
                </p>
              </div>
              <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 shrink-0">
                <Gauge className="size-4" />
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-display font-semibold text-gray-900">
                    {stats.avgNormalWpm}
                  </span>
                  <span className="text-xs font-medium text-gray-500">WPM</span>
                </div>
                {stats.totalTests > 1 ? (
                  <svg
                    className="w-16 sm:w-20 h-5 sm:h-6 stroke-gray-400 fill-none"
                    strokeWidth="2"
                  >
                    <path d="M 2 18 Q 15 5, 30 14 T 60 4 T 78 8" />
                  </svg>
                ) : (
                  <span className="text-[10px] text-gray-300 font-mono">-</span>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-gray-500 border-t border-gray-50 pt-2 font-medium">
                <span className="text-emerald-600 font-semibold">
                  {stats.totalTests > 0 ? `Ort. ${stats.avgNormalWpm} WPM` : "-"}
                </span>
                <span>{stats.totalTests > 0 ? `Son ${stats.totalTests} test` : "Kayıt yok"}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Ort. Bionic Hız */}
          <div className="rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3 sm:space-y-4 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-gray-700">Ort. Bionic Hız</span>
                <p className="text-[10px] sm:text-[11px] text-gray-400 leading-tight">
                  BionicText ile ortalama hızınız
                </p>
              </div>
              <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 shrink-0">
                <Zap className="size-4" />
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-display font-semibold text-gray-900">
                    {stats.avgBionicWpm}
                  </span>
                  <span className="text-xs font-medium text-gray-500">WPM</span>
                </div>
                {stats.totalTests > 1 ? (
                  <svg
                    className="w-16 sm:w-20 h-5 sm:h-6 stroke-indigo-600 fill-none"
                    strokeWidth="2"
                  >
                    <path d="M 2 16 Q 15 2, 30 10 T 60 2 T 78 5" />
                  </svg>
                ) : (
                  <span className="text-[10px] text-gray-300 font-mono">-</span>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-gray-500 border-t border-gray-50 pt-2 font-medium">
                <span className="text-emerald-600 font-semibold">
                  {stats.totalTests > 0 ? `Ort. ${stats.avgBionicWpm} WPM` : "-"}
                </span>
                <span>{stats.totalTests > 0 ? `Son ${stats.totalTests} test` : "Kayıt yok"}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Ortalama İyileşme */}
          <div className="rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3 sm:space-y-4 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-gray-700">Ortalama İyileşme</span>
                <p className="text-[10px] sm:text-[11px] text-gray-400 leading-tight">
                  Biyonik okuma hız artış oranı
                </p>
              </div>
              <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 shrink-0">
                <TrendingUp className="size-4" />
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="text-2xl sm:text-3xl font-display font-semibold text-gray-900">
                +{stats.avgImprovement}%
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-indigo-900 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(stats.avgImprovement * 5, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-gray-500 border-t border-gray-50 pt-2 font-medium">
                <span className="text-emerald-600 font-semibold">
                  {stats.avgImprovement > 0 ? `+${stats.avgImprovement}%` : "0%"}
                </span>
                <span>{stats.totalTests > 0 ? `Son ${stats.totalTests} test` : "Kayıt yok"}</span>
              </div>
            </div>
          </div>

          {/* Card 4: En İyi İyileşme */}
          <div className="rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3 sm:space-y-4 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-gray-700">En İyi İyileşme</span>
                <p className="text-[10px] sm:text-[11px] text-gray-400 leading-tight">
                  Tek bir testteki en yüksek artış
                </p>
              </div>
              <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 text-gray-700 shrink-0">
                <Trophy className="size-4" />
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="text-2xl sm:text-3xl font-display font-semibold text-gray-900">
                +{stats.bestImprovement.percentage}%
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-[#121620] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(stats.bestImprovement.percentage * 4.5, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-gray-500 border-t border-gray-50 pt-2 font-medium">
                <span className="text-emerald-600 font-semibold">
                  {stats.bestImprovement.percentage > 0
                    ? `+${stats.bestImprovement.percentage}%`
                    : "0%"}
                </span>
                <span>
                  {stats.bestImprovement.testNumber > 0
                    ? `Test ${stats.bestImprovement.testNumber}`
                    : "Henüz test yok"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. OKUMA HIZI İLERLEMESİ CHART (Main Interactive Chart) */}
      <div className="rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-6 lg:p-7 shadow-xs space-y-4 sm:space-y-6">
        {/* Chart Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-900">
              <TrendingUp className="size-4.5 text-gray-700" />
              <h3>Okuma Hızı İlerlemesi</h3>
            </div>
            <p className="text-[11px] sm:text-xs text-gray-500">
              Testlerinizdeki okuma hızı gelişimi
            </p>
          </div>

          <div className="flex items-center justify-end">
            {/* Filter Pills */}
            <div className="flex items-center rounded-full border border-gray-200 bg-gray-50 p-1 text-[11px] sm:text-xs font-medium">
              <button
                type="button"
                onClick={() => setTimeFilter("7")}
                className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full transition-all ${
                  timeFilter === "7"
                    ? "bg-[#121620] text-white shadow-2xs font-semibold"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Son 7 Test
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter("30")}
                className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full transition-all ${
                  timeFilter === "30"
                    ? "bg-[#121620] text-white shadow-2xs font-semibold"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Son 30 Gün
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter("all")}
                className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full transition-all ${
                  timeFilter === "all"
                    ? "bg-[#121620] text-white shadow-2xs font-semibold"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Tümü
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-4 sm:gap-6 text-[11px] sm:text-xs text-gray-500 font-medium">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="size-2 rounded-full bg-[#94a3b8]" />
            <span>Normal Okuma</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="size-2 rounded-full bg-[#0f172a]" />
            <span>BionicText</span>
          </div>
        </div>

        {/* SVG Chart Area */}
        <div className="relative w-full pt-3 sm:pt-4 min-h-[200px] sm:min-h-[220px]">
          {/* Y Axis Grid Lines */}
          <div className="space-y-4 sm:space-y-5 text-[9px] sm:text-[10px] font-mono text-gray-400">
            {[400, 350, 300, 250, 200, 150, 100].map((wpm) => (
              <div key={wpm} className="flex items-center gap-2 sm:gap-3">
                <span className="w-10 sm:w-14 text-right shrink-0">{wpm} WPM</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
            ))}
          </div>

          {displayedHistory.length > 0 ? (
            <>
              {/* SVG Canvas Overlay */}
              <svg
                className="absolute inset-x-0 top-5 sm:top-6 left-12 sm:left-16 right-0 overflow-visible w-[calc(100%-3.25rem)] sm:w-[calc(100%-4.5rem)] h-[175px] sm:h-[185px]"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                preserveAspectRatio="none"
              >
                {/* Normal Line */}
                {normalPath && (
                  <path
                    d={normalPath}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}
                {/* Bionic Line */}
                {bionicPath && (
                  <path
                    d={bionicPath}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                )}

                {/* Normal Dots */}
                {normalPoints.map((pt, i) => (
                  <circle
                    key={`n-${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r="5"
                    className="fill-[#94a3b8] stroke-white stroke-2 cursor-pointer transition-all hover:scale-125"
                    onMouseEnter={() => setHoveredTestIndex(i)}
                    onMouseLeave={() => setHoveredTestIndex(null)}
                    onClick={() => setHoveredTestIndex(i === hoveredTestIndex ? null : i)}
                  />
                ))}

                {/* Bionic Dots & Text Annotations */}
                {bionicPoints.map((pt, i) => (
                  <g
                    key={`b-${i}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredTestIndex(i)}
                    onMouseLeave={() => setHoveredTestIndex(null)}
                    onClick={() => setHoveredTestIndex(i === hoveredTestIndex ? null : i)}
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="6"
                      className="fill-[#0f172a] stroke-white stroke-2 hover:scale-125 transition-all"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 12}
                      textAnchor="middle"
                      className="text-[10px] font-semibold fill-gray-700 select-none"
                    >
                      +{pt.imp}%
                    </text>
                  </g>
                ))}
              </svg>

              {/* Dynamic Interactive Tooltip only shown on active hover / tap */}
              {hoveredTestIndex !== null && displayedHistory[hoveredTestIndex] && (
                <div
                  className="absolute z-20 transition-all pointer-events-none"
                  style={{
                    left: `calc(3.5rem + ${
                      (hoveredTestIndex / Math.max(1, displayedHistory.length - 1)) * 75
                    }%)`,
                    top: `${Math.max(10, getY(displayedHistory[hoveredTestIndex].bionicWpm) - 20)}px`,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  <div className="rounded-2xl bg-[#0f172a] text-white p-2.5 sm:p-3 shadow-xl text-xs space-y-1 min-w-[140px]">
                    <div className="font-semibold text-gray-200 border-b border-gray-700/60 pb-1 flex justify-between">
                      <span>Test {displayedHistory[hoveredTestIndex].testNumber}</span>
                      <span className="text-emerald-400 font-medium">
                        ↗ +{displayedHistory[hoveredTestIndex].improvementPercentage}%
                      </span>
                    </div>
                    <div className="space-y-0.5 text-[10px] sm:text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-gray-400">BionicText:</span>
                        <span className="font-semibold">
                          {displayedHistory[hoveredTestIndex].bionicWpm} WPM
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Normal:</span>
                        <span className="font-semibold">
                          {displayedHistory[hoveredTestIndex].normalWpm} WPM
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* X Axis Labels */}
              <div className="flex justify-between pl-12 sm:pl-16 pt-3 text-[10px] sm:text-[11px] font-mono text-gray-400">
                {displayedHistory.map((item) => (
                  <span key={item.id}>T{item.testNumber}</span>
                ))}
              </div>
            </>
          ) : (
            <div className="absolute inset-0 left-12 sm:left-16 flex flex-col items-center justify-center bg-white/80 backdrop-blur-2xs rounded-2xl p-4 sm:p-6 text-center space-y-2.5 sm:space-y-3 border border-dashed border-gray-200">
              <div className="size-9 sm:size-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                <FileText className="size-4 sm:size-5" />
              </div>
              <div className="space-y-0.5 max-w-sm">
                <div className="text-xs sm:text-sm font-semibold text-gray-900">
                  Henüz Test Yapılmadı
                </div>
                <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed">
                  Okuma testlerinizi tamamladıkça hız gelişiminiz buradaki grafiğe otomatik olarak
                  yansır.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("tests")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#121620] hover:bg-black text-white text-xs font-semibold shadow-xs transition-transform active:scale-95"
              >
                <Play className="size-3 fill-current" />
                <span>İlk Hız Testini Yap</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. BOTTOM ROW: 3 Highlights & Son Testler Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Left 3 Performance Cards */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Highlight 1: En Yüksek Hız */}
          <div className="rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-900">
              <Zap className="size-4 text-gray-700" />
              <span>En yüksek hız</span>
            </div>

            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-display font-semibold text-gray-900">
                {stats.maxSpeed.wpm > 0 ? `${stats.maxSpeed.wpm} WPM` : "-"}
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-400 leading-relaxed">
                {stats.maxSpeed.testNumber > 0
                  ? `Test ${stats.maxSpeed.testNumber}'te BionicText ile ulaştığınız hız.`
                  : "Henüz test bulunmuyor."}
              </p>
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-50 pt-2 font-medium">
              <span className="text-emerald-600 font-semibold">
                {stats.maxSpeed.improvement > 0 ? `+${stats.maxSpeed.improvement}%` : "-"}
              </span>
              <span>
                {stats.maxSpeed.testNumber > 0 ? `Test ${stats.maxSpeed.testNumber}` : "-"}
              </span>
            </div>
          </div>

          {/* Highlight 2: En Büyük Gelişim */}
          <div className="rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-900">
              <TrendingUp className="size-4 text-gray-700" />
              <span>En büyük gelişim</span>
            </div>

            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-display font-semibold text-gray-900">
                {stats.bestImprovement.percentage > 0
                  ? `+${stats.bestImprovement.percentage}%`
                  : "-"}
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-400 leading-relaxed">
                {stats.bestImprovement.testNumber > 0
                  ? `Test ${stats.bestImprovement.testNumber}'teki en yüksek artışınız.`
                  : "Henüz test bulunmuyor."}
              </p>
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-50 pt-2 font-medium">
              <span className="text-emerald-600 font-semibold">
                {stats.bestImprovement.percentage > 0
                  ? `+${stats.bestImprovement.percentage}%`
                  : "-"}
              </span>
              <span>
                {stats.bestImprovement.testNumber > 0
                  ? `Test ${stats.bestImprovement.testNumber}`
                  : "-"}
              </span>
            </div>
          </div>

          {/* Highlight 3: En İstikrarlı Performans */}
          <div className="rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-900">
              <ShieldCheck className="size-4 text-gray-700" />
              <span>İstikrarlı performans</span>
            </div>

            <div className="space-y-0.5">
              <div className="text-xl sm:text-2xl font-display font-semibold text-gray-900">
                {stats.consistency.score > 0 ? `+${stats.consistency.score}%` : "-"}
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-400 leading-relaxed">
                {stats.totalTests > 0
                  ? `${stats.consistency.range} arasında en dengeli gelişim aralığı.`
                  : "Henüz test bulunmuyor."}
              </p>
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-50 pt-2 font-medium">
              <span className="text-emerald-600 font-semibold">
                {stats.consistency.score > 0 ? `+${stats.consistency.score}%` : "-"}
              </span>
              <span>{stats.totalTests > 0 ? stats.consistency.range : "-"}</span>
            </div>
          </div>
        </div>

        {/* Right Son Testler Table / Mobile Card List */}
        <div className="lg:col-span-6 rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-900">
              <FileText className="size-4 text-gray-700" />
              <span>Son Testler</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("tests")}
              className="text-xs text-gray-500 hover:text-black flex items-center gap-1 font-medium transition-colors"
            >
              <span>Test Yap</span>
              <ArrowRight className="size-3" />
            </button>
          </div>

          <div className="overflow-x-auto min-h-[140px] flex flex-col justify-center">
            {stats.recentTests.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] sm:text-[11px] text-gray-400 font-medium border-b border-gray-50">
                    <th className="pb-2 font-normal">Test</th>
                    <th className="pb-2 font-normal">Tarih</th>
                    <th className="pb-2 font-normal">Normal</th>
                    <th className="pb-2 font-normal">Bionic</th>
                    <th className="pb-2 font-normal text-right">İyileşme</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-mono text-[11px]">
                  {stats.recentTests.slice(0, 7).map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-2 font-semibold text-gray-900 font-sans">
                        #{row.testNumber}
                      </td>
                      <td className="py-2 text-gray-500 font-sans text-[10px] truncate max-w-[90px] sm:max-w-none">
                        {row.date.split(" ")[0]}
                      </td>
                      <td className="py-2 text-gray-700">{row.normalWpm}</td>
                      <td className="py-2 font-semibold text-gray-900">{row.bionicWpm}</td>
                      <td className="py-2 text-right font-sans">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                          +{row.improvementPercentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-6 text-xs text-gray-400 space-y-1">
                <p>Kayıtlı test geçmişi bulunmuyor.</p>
                <p className="text-[11px] text-gray-400">
                  Hız testi sekmesinden test yaparak ilk sonucunuzu ekleyin.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
