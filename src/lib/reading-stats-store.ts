import { saveSpeedTestToSheets } from "./google-sheets-db";

export interface TestResultRecord {
  id: string;
  testNumber: number;
  date: string; // e.g. "2026-10-02 14:32"
  title: string;
  normalWpm: number;
  bionicWpm: number;
  improvementPercentage: number;
  accuracy: number;
  durationSeconds: number;
}

const TESTS_STORAGE_KEY = "bionictext_real_tests_v2";

export function getTestHistory(): TestResultRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TESTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTestResult(
  record: Omit<TestResultRecord, "id" | "testNumber" | "date" | "improvementPercentage">,
): TestResultRecord {
  const current = getTestHistory();
  const testNumber = current.length + 1;

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;

  const diff = record.bionicWpm - record.normalWpm;
  const improvement =
    record.normalWpm > 0
      ? Number(((diff / record.normalWpm) * 100).toFixed(1))
      : record.bionicWpm > 0
        ? 15
        : 0;

  const newEntry: TestResultRecord = {
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    testNumber,
    date: dateStr,
    title: record.title || `Okuma Testi #${testNumber}`,
    normalWpm: Math.max(1, record.normalWpm),
    bionicWpm: Math.max(1, record.bionicWpm),
    improvementPercentage: improvement,
    accuracy: record.accuracy || 95,
    durationSeconds: Math.max(1, record.durationSeconds),
  };

  const updated = [...current, newEntry];
  if (typeof window !== "undefined") {
    localStorage.setItem(TESTS_STORAGE_KEY, JSON.stringify(updated));
    // Trigger global event so all open views (Profile, Dashboard, Navbar) update synchronously
    window.dispatchEvent(new CustomEvent("bionictext_stats_updated", { detail: updated }));
  }

  // Sync to Google Sheets in the background
  saveSpeedTestToSheets({
    title: newEntry.title,
    mode: "Bionic vs Normal",
    wpm: newEntry.bionicWpm,
    accuracy: newEntry.accuracy,
    durationSeconds: newEntry.durationSeconds,
  }).catch(() => {});

  return newEntry;
}

export function clearTestHistory() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TESTS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("bionictext_stats_updated", { detail: [] }));
  }
}

export interface CalculatedStatistics {
  totalTests: number;
  avgNormalWpm: number;
  avgBionicWpm: number;
  avgImprovement: number;
  bestImprovement: {
    percentage: number;
    testNumber: number;
  };
  maxSpeed: {
    wpm: number;
    testNumber: number;
    improvement: number;
  };
  consistency: {
    score: number;
    range: string;
  };
  recentTests: TestResultRecord[];
}

export function calculateStats(history: TestResultRecord[]): CalculatedStatistics {
  if (!history || history.length === 0) {
    return {
      totalTests: 0,
      avgNormalWpm: 0,
      avgBionicWpm: 0,
      avgImprovement: 0,
      bestImprovement: { percentage: 0, testNumber: 0 },
      maxSpeed: { wpm: 0, testNumber: 0, improvement: 0 },
      consistency: { score: 0, range: "0" },
      recentTests: [],
    };
  }

  const total = history.length;
  const sumNormal = history.reduce((acc, curr) => acc + curr.normalWpm, 0);
  const sumBionic = history.reduce((acc, curr) => acc + curr.bionicWpm, 0);
  const sumImprovement = history.reduce((acc, curr) => acc + curr.improvementPercentage, 0);

  const avgNormalWpm = Math.round(sumNormal / total);
  const avgBionicWpm = Math.round(sumBionic / total);
  const avgImprovement = Number((sumImprovement / total).toFixed(1));

  let bestImp = history[0];
  let maxSpd = history[0];

  for (const item of history) {
    if (item.improvementPercentage > bestImp.improvementPercentage) {
      bestImp = item;
    }
    if (item.bionicWpm > maxSpd.bionicWpm) {
      maxSpd = item;
    }
  }

  // Calculate consistency based on deviation
  const variance =
    history.reduce(
      (acc, curr) => acc + Math.pow(curr.improvementPercentage - avgImprovement, 2),
      0,
    ) / total;
  const stdDev = Math.sqrt(variance);
  const consistencyScore = Math.max(0, Number((100 - stdDev * 2).toFixed(1)));

  return {
    totalTests: total,
    avgNormalWpm,
    avgBionicWpm,
    avgImprovement,
    bestImprovement: {
      percentage: bestImp.improvementPercentage,
      testNumber: bestImp.testNumber,
    },
    maxSpeed: {
      wpm: maxSpd.bionicWpm,
      testNumber: maxSpd.testNumber,
      improvement: maxSpd.improvementPercentage,
    },
    consistency: {
      score: consistencyScore > 0 ? consistencyScore : 0,
      range: `Test 1-${total}`,
    },
    recentTests: [...history].reverse(),
  };
}
