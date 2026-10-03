import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe, Search } from "lucide-react";
import { SITE_LANGUAGES, getLanguageMeta, t } from "@/lib/i18n";

interface Props {
  siteLang: string;
  onSelect: (code: string) => void;
  /** "light": açık zemin, "dark": koyu/fotoğraf zemini */
  variant?: "light" | "dark";
}

export function SiteLanguageSwitcher({ siteLang, onSelect, variant = "light" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const current = getLanguageMeta(siteLang);
  const dark = variant === "dark";

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = SITE_LANGUAGES.filter(
    (l) =>
      !q ||
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.code.includes(q),
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t("select.language", siteLang)}
        aria-label={t("select.language", siteLang)}
        className={`flex items-center gap-1.5 sm:gap-2 rounded-full border py-1.5 px-2.5 sm:px-3.5 text-xs sm:text-sm font-medium shadow-xs backdrop-blur-md transition-all active:scale-95 ${
          dark
            ? "border-white/20 bg-black/20 text-white hover:bg-black/40"
            : "border-gray-300/90 bg-white/90 text-gray-800 hover:bg-white"
        }`}
      >
        <Globe className="size-3.5 sm:size-4 opacity-70" />
        <span className="text-sm sm:text-base leading-none">{current.flag}</span>
        <span className="hidden md:inline font-semibold text-xs">{current.nativeName}</span>
        <span className="md:hidden font-bold text-xs uppercase">{current.code}</span>
        <ChevronDown
          className={`size-3 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-2 z-50 w-72 max-w-[calc(100vw-1.5rem)] rounded-3xl border border-gray-200 bg-white p-3 text-gray-900 shadow-2xl flex flex-col gap-2">
          <div className="flex items-center justify-between px-1 pb-1 border-b border-gray-100">
            <span className="text-xs font-bold">{t("select.language", siteLang)}</span>
            <span className="text-[10px] text-gray-400 font-mono">
              {t("lang.count", siteLang, { n: SITE_LANGUAGES.length })}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("select.search", siteLang)}
              className="w-full ps-8 pe-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-900 focus:outline-none focus:border-black"
            />
          </div>
          <div role="listbox" className="overflow-y-auto max-h-60 space-y-0.5 pe-1">
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-gray-400">
                {t("select.noResult", siteLang)}
              </p>
            )}
            {filtered.map((lang) => {
              const selected = lang.code === siteLang;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onSelect(lang.code);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`w-full flex items-center justify-between gap-2 p-2 rounded-xl text-xs text-start transition-colors ${
                    selected ? "bg-black text-white font-semibold" : "hover:bg-gray-100"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{lang.flag}</span>
                    <span className="min-w-0">
                      <span className="block font-medium truncate">{lang.nativeName}</span>
                      <span
                        className={`block text-[10px] truncate ${selected ? "text-gray-300" : "text-gray-400"}`}
                      >
                        {lang.name}
                      </span>
                    </span>
                  </span>
                  {selected && <Check className="size-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
