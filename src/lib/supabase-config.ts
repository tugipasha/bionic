/** Supabase ortam değişkenleri gerçekten tanımlı mı? (placeholder ile çalışmayı ayırt eder) */
export function isSupabaseConfigured(): boolean {
  const url =
    (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ||
    (typeof process !== "undefined" ? process.env["SUPABASE_URL"] : undefined);
  const key =
    (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) ||
    (typeof process !== "undefined" ? process.env["SUPABASE_PUBLISHABLE_KEY"] : undefined);
  return Boolean(url && key && !url.includes("placeholder"));
}
