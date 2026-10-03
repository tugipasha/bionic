import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

// ============================================================================
// Types
// ============================================================================

export interface TestResultRecord {
  id: string;
  testNumber: number;
  date: string;
  title: string;
  normalWpm: number;
  bionicWpm: number;
  improvementPercentage: number;
  accuracy: number;
  durationSeconds: number;
}

export interface LibraryDocument {
  id: string;
  title: string;
  text: string;
  words: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettingsData {
  fontFamily: "sans" | "outfit" | "lexend" | "serif" | "mono";
  fontSize: "sm" | "base" | "lg" | "xl";
  bionicFixation: number;
  bionicWeight: "semibold" | "bold" | "extrabold" | "black";
  bionicColor: "black" | "indigo" | "emerald" | "charcoal";
  lineHeight: "normal" | "relaxed" | "loose";
  defaultWpm: number;
  ttsSpeed: number;
  saccadeStep: number;
  darkMode?: boolean;
}

const LOCAL_TESTS_KEY = "bionictext_real_tests_v2";
const LOCAL_LIBRARY_KEY = "bionic_library";
const LOCAL_SETTINGS_KEY = "bionictext_user_settings_v3";

export const DEFAULT_USER_SETTINGS: UserSettingsData = {
  fontFamily: "sans",
  fontSize: "base",
  bionicFixation: 3,
  bionicWeight: "bold",
  bionicColor: "black",
  lineHeight: "relaxed",
  defaultWpm: 350,
  ttsSpeed: 1.0,
  saccadeStep: 1,
  darkMode: false,
};

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

export async function getCurrentUser() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export async function signOutUser() {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error("Sign out error:", e);
  }
}

// ============================================================================
// READING TESTS REPOSITORY
// ============================================================================

export async function fetchReadingTests(): Promise<TestResultRecord[]> {
  try {
    const user = await getCurrentUser();

    if (user) {
      const { data, error } = await supabase
        .from("reading_tests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped: TestResultRecord[] = data.map((d: Tables<"reading_tests">) => {
          const date = new Date(d.created_at);
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
            date.getDate(),
          ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
            date.getMinutes(),
          ).padStart(2, "0")}`;

          return {
            id: d.id,
            testNumber: d.test_number,
            date: dateStr,
            title: d.title,
            normalWpm: d.normal_wpm,
            bionicWpm: d.bionic_wpm,
            improvementPercentage: Number(d.improvement_percentage),
            accuracy: Number(d.accuracy),
            durationSeconds: d.duration_seconds,
          };
        });

        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_TESTS_KEY, JSON.stringify(mapped));
        }
        return mapped;
      }
    }
  } catch (err) {
    console.warn("Supabase fetch reading tests failed, reading local cache:", err);
  }

  // Fallback to local storage
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_TESTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function saveReadingTest(
  record: Omit<TestResultRecord, "id" | "testNumber" | "date" | "improvementPercentage">,
): Promise<TestResultRecord> {
  const currentTests = await fetchReadingTests();
  const testNumber = currentTests.length + 1;

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

  const entry: TestResultRecord = {
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

  // 1. Update local storage & broadcast event immediately for zero-latency UI
  const updated = [...currentTests, entry];
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_TESTS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("bionictext_stats_updated", { detail: updated }));
  }

  // 2. Persist to Supabase asynchronously
  try {
    const user = await getCurrentUser();
    const insertPayload: TablesInsert<"reading_tests"> = {
      user_id: user ? user.id : null,
      test_number: testNumber,
      title: entry.title,
      normal_wpm: entry.normalWpm,
      bionic_wpm: entry.bionicWpm,
      improvement_percentage: entry.improvementPercentage,
      accuracy: entry.accuracy,
      duration_seconds: entry.durationSeconds,
    };

    const { data, error } = await supabase
      .from("reading_tests")
      .insert(insertPayload)
      .select()
      .single();

    if (!error && data) {
      entry.id = data.id;
    }
  } catch (err) {
    console.warn("Supabase save reading test error:", err);
  }

  return entry;
}

export async function clearReadingTests(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_TESTS_KEY);
    window.dispatchEvent(new CustomEvent("bionictext_stats_updated", { detail: [] }));
  }

  try {
    const user = await getCurrentUser();
    if (user) {
      await supabase.from("reading_tests").delete().eq("user_id", user.id);
    }
  } catch (err) {
    console.warn("Supabase clear reading tests error:", err);
  }
}

// ============================================================================
// LIBRARY DOCUMENTS REPOSITORY
// ============================================================================

export async function fetchLibraryDocs(): Promise<LibraryDocument[]> {
  try {
    const user = await getCurrentUser();
    if (user) {
      const { data, error } = await supabase
        .from("library_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const mapped: LibraryDocument[] = data.map((d: Tables<"library_documents">) => ({
          id: d.id,
          title: d.title,
          text: d.text,
          words: d.words,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_LIBRARY_KEY, JSON.stringify(mapped));
        }
        return mapped;
      }
    }
  } catch (e) {
    console.warn("Supabase fetch library failed:", e);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_LIBRARY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function saveLibraryDoc(doc: {
  title: string;
  text: string;
  words?: number;
}): Promise<LibraryDocument> {
  const wordsCount = doc.words || doc.text.trim().split(/\s+/).filter(Boolean).length;
  const now = new Date().toISOString();

  const newDoc: LibraryDocument = {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: doc.title,
    text: doc.text,
    words: wordsCount,
    createdAt: now,
    updatedAt: now,
  };

  // Local sync
  if (typeof window !== "undefined") {
    try {
      const current = JSON.parse(localStorage.getItem(LOCAL_LIBRARY_KEY) || "[]");
      const updated = [newDoc, ...current];
      localStorage.setItem(LOCAL_LIBRARY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Local storage library update failed:", e);
    }
  }

  // Supabase sync
  try {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from("library_documents")
      .insert({
        user_id: user ? user.id : null,
        title: doc.title,
        text: doc.text,
        words: wordsCount,
      })
      .select()
      .single();

    if (!error && data) {
      newDoc.id = data.id;
    }
  } catch (err) {
    console.warn("Supabase save doc error:", err);
  }

  return newDoc;
}

export async function deleteLibraryDoc(id: string): Promise<boolean> {
  // Local sync
  if (typeof window !== "undefined") {
    try {
      const current: LibraryDocument[] = JSON.parse(
        localStorage.getItem(LOCAL_LIBRARY_KEY) || "[]",
      );
      const updated = current.filter((d) => d.id !== id);
      localStorage.setItem(LOCAL_LIBRARY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Local storage delete failed:", e);
    }
  }

  // Supabase sync
  try {
    const user = await getCurrentUser();
    if (user) {
      const { error } = await supabase.from("library_documents").delete().eq("id", id);
      return !error;
    }
    return true;
  } catch {
    return true;
  }
}

// ============================================================================
// USER SETTINGS REPOSITORY
// ============================================================================

export async function fetchDbUserSettings(): Promise<UserSettingsData> {
  try {
    const user = await getCurrentUser();
    if (user) {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        const loaded: UserSettingsData = {
          fontFamily: (data.font_family as UserSettingsData["fontFamily"]) || "sans",
          fontSize: (data.font_size as UserSettingsData["fontSize"]) || "base",
          bionicFixation: data.bionic_fixation ?? 3,
          bionicWeight: (data.bionic_weight as UserSettingsData["bionicWeight"]) || "bold",
          bionicColor: (data.bionic_color as UserSettingsData["bionicColor"]) || "black",
          lineHeight: (data.line_height as UserSettingsData["lineHeight"]) || "relaxed",
          defaultWpm: data.default_wpm ?? 350,
          ttsSpeed: Number(data.tts_speed) || 1.0,
          saccadeStep: data.saccade_step ?? 1,
          darkMode: data.dark_mode ?? false,
        };

        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(loaded));
        }
        return loaded;
      }
    }
  } catch (e) {
    console.warn("Supabase fetch user settings error:", e);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
      return raw ? { ...DEFAULT_USER_SETTINGS, ...JSON.parse(raw) } : DEFAULT_USER_SETTINGS;
    } catch {
      return DEFAULT_USER_SETTINGS;
    }
  }

  return DEFAULT_USER_SETTINGS;
}

export async function saveDbUserSettings(
  settings: Partial<UserSettingsData>,
): Promise<UserSettingsData> {
  let current = DEFAULT_USER_SETTINGS;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
      if (raw) current = JSON.parse(raw);
    } catch (e) {
      console.warn("Local storage settings parse failed:", e);
    }
  }

  const updated: UserSettingsData = { ...current, ...settings };

  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("bionictext_settings_changed", { detail: updated }));
  }

  try {
    const user = await getCurrentUser();
    if (user) {
      await supabase.from("user_settings").upsert({
        user_id: user.id,
        font_family: updated.fontFamily,
        font_size: updated.fontSize,
        bionic_fixation: updated.bionicFixation,
        bionic_weight: updated.bionicWeight,
        bionic_color: updated.bionicColor,
        line_height: updated.lineHeight,
        default_wpm: updated.defaultWpm,
        tts_speed: updated.ttsSpeed,
        saccade_step: updated.saccadeStep,
        dark_mode: updated.darkMode ?? false,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn("Supabase save user settings error:", e);
  }

  return updated;
}

// ============================================================================
// READING & AI LOGS
// ============================================================================

export async function logReadingActivity(data: {
  sourceLang: string;
  targetLang: string;
  wordCount: number;
  isBionic: boolean;
  textSnippet?: string;
}) {
  try {
    const user = await getCurrentUser();
    await supabase.from("reading_logs").insert({
      user_id: user ? user.id : null,
      source_lang: data.sourceLang,
      target_lang: data.targetLang,
      word_count: data.wordCount,
      is_bionic: data.isBionic,
      text_snippet: data.textSnippet ? data.textSnippet.slice(0, 300) : null,
    });
  } catch (err) {
    console.warn("Failed to log reading activity to Supabase:", err);
  }
}

export async function logAIInteraction(data: {
  role: "user" | "assistant" | "system";
  prompt: string;
  response?: string;
  model?: string;
}) {
  try {
    const user = await getCurrentUser();
    await supabase.from("ai_conversations").insert({
      user_id: user ? user.id : null,
      role: data.role,
      prompt: data.prompt,
      response: data.response ? data.response.slice(0, 500) : null,
      model: data.model || null,
    });
  } catch (err) {
    console.warn("Failed to log AI conversation to Supabase:", err);
  }
}
