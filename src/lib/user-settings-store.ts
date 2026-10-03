import {
  fetchDbUserSettings,
  saveDbUserSettings,
  type UserSettingsData as UserSettings,
  DEFAULT_USER_SETTINGS as DEFAULT_SETTINGS,
} from "./supabase-db";

export { type UserSettings, DEFAULT_SETTINGS };

const SETTINGS_STORAGE_KEY = "bionictext_user_settings_v3";

export function getUserSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveUserSettings(settings: Partial<UserSettings>): UserSettings {
  const current = getUserSettings();
  const updated = { ...current, ...settings };
  if (typeof window !== "undefined") {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    applySettingsToDOM(updated);
    window.dispatchEvent(new CustomEvent("bionictext_settings_changed", { detail: updated }));
  }
  // Sync to Supabase in background
  saveDbUserSettings(settings).catch(() => {});
  return updated;
}

export async function syncUserSettingsWithSupabase(): Promise<UserSettings> {
  const settings = await fetchDbUserSettings();
  applySettingsToDOM(settings);
  return settings;
}

export function applySettingsToDOM(settings: UserSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // 1. Font family
  if (settings.fontFamily === "serif") {
    root.style.fontFamily = "'Playfair Display', Georgia, serif";
    root.style.setProperty("--font-sans", "'Playfair Display', Georgia, serif");
  } else if (settings.fontFamily === "mono") {
    root.style.fontFamily = "'JetBrains Mono', monospace";
    root.style.setProperty("--font-sans", "'JetBrains Mono', monospace");
  } else if (settings.fontFamily === "lexend") {
    root.style.fontFamily = "'Lexend', system-ui, sans-serif";
    root.style.setProperty("--font-sans", "'Lexend', system-ui, sans-serif");
  } else if (settings.fontFamily === "outfit") {
    root.style.fontFamily = "'Outfit', sans-serif";
    root.style.setProperty("--font-sans", "'Outfit', sans-serif");
  } else {
    root.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
    root.style.setProperty("--font-sans", "'Inter', system-ui, -apple-system, sans-serif");
  }

  // 2. Bold Weight for Bionic Reading
  const weightMap: Record<string, string> = {
    semibold: "600",
    bold: "700",
    extrabold: "800",
    black: "900",
  };
  root.style.setProperty("--bionic-bold-weight", weightMap[settings.bionicWeight] || "700");

  // 3. Bold Color
  const colorMap: Record<string, string> = {
    black: "#000000",
    charcoal: "#1e293b",
    indigo: "#1e1b4b",
    emerald: "#064e3b",
  };
  root.style.setProperty("--bionic-bold-color", colorMap[settings.bionicColor] || "#000000");

  // 4. Line height
  const lhMap: Record<string, string> = {
    normal: "1.5",
    relaxed: "1.75",
    loose: "2.1",
  };
  root.style.setProperty("--bionic-line-height", lhMap[settings.lineHeight] || "1.75");
}
