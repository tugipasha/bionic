import { ArrowRight } from "lucide-react";
import { SiteLanguageSwitcher } from "./SiteLanguageSwitcher";
import { useSiteLanguage } from "@/lib/i18n";

interface LandingPageProps {
  onGoToLogin: () => void;
  /** Hesapsız, misafir olarak uygulamaya geç */
  onTryNow?: () => void;
}

export function LandingPage({ onGoToLogin, onTryNow }: LandingPageProps) {
  const { siteLang, setSiteLang, t } = useSiteLanguage();

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-black text-white flex flex-col justify-between select-none">
      <img
        src="/bionic-mountain-background.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none"
      />

      <header className="relative z-20 w-full px-5 sm:px-12 py-6 sm:py-8 flex items-center justify-between gap-3">
        <div className="font-display text-2xl sm:text-3xl font-light tracking-tight text-white/95">
          BionicText
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <SiteLanguageSwitcher siteLang={siteLang} onSelect={setSiteLang} variant="dark" />
          <button
            type="button"
            onClick={onGoToLogin}
            className="group flex items-center gap-3 rounded-full border border-white/20 bg-black/20 hover:bg-black/40 px-4 sm:px-5 py-2 text-sm font-light text-white backdrop-blur-md transition-all shadow-sm active:scale-95"
          >
            <span>{t("btn.login")}</span>
            <span className="flex size-6 items-center justify-center rounded-full bg-white text-black transition-transform group-hover:translate-x-0.5 rtl:rotate-180">
              <ArrowRight className="size-3.5" strokeWidth={2.2} />
            </span>
          </button>
        </div>
      </header>

      <div
        aria-hidden="true"
        className="absolute start-6 sm:start-10 top-1/2 -translate-y-1/2 z-20 hidden sm:flex flex-col gap-2.5 pointer-events-none"
      >
        {[0, 1, 2, 3, 4].map((item) => (
          <span
            key={item}
            className={
              item === 0
                ? "size-3 rotate-45 border border-white/90 bg-white/40 shadow-sm"
                : "size-3 rotate-45 border border-white/60 bg-transparent"
            }
          />
        ))}
      </div>

      <main className="relative z-10 w-full flex-1 flex flex-col items-center justify-center gap-6 sm:gap-8 px-4">
        <h1 className="font-display text-5xl sm:text-8xl md:text-9xl lg:text-[11rem] font-light tracking-tight text-white/95 drop-shadow-[0_10px_35px_rgba(0,0,0,0.8)] pointer-events-none">
          BionicText
        </h1>
        {onTryNow && (
          <button
            type="button"
            onClick={onTryNow}
            className="group flex items-center gap-3 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 px-6 py-2.5 text-sm font-light text-white backdrop-blur-md transition-all active:scale-95"
          >
            <span>{t("btn.tryNow")}</span>
            <ArrowRight className="size-4 rtl:rotate-180" strokeWidth={2} />
          </button>
        )}
      </main>

      <div className="relative z-10 pb-6 text-center text-xs font-light text-white/60 pointer-events-none">
        {t("tagline")}
      </div>
    </div>
  );
}
