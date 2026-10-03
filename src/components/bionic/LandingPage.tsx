import React from "react";
import { ArrowRight } from "lucide-react";

interface LandingPageProps {
  onGoToLogin: () => void;
}

export function LandingPage({ onGoToLogin }: LandingPageProps) {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-white flex flex-col justify-between select-none">
      {/* 1. BACKGROUND MOUNTAIN WITH MOON/HALO SPHERE (Full Viewport) */}
      <img
        src="/bionic-mountain-background.png"
        alt="BionicText Mountain"
        className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none"
      />

      {/* 2. NAVBAR (Top Bar) */}
      <header className="relative z-20 w-full px-8 sm:px-12 py-8 flex items-center justify-between">
        {/* Brand Logo (Top Left) */}
        <div className="font-display text-2xl sm:text-3xl font-light tracking-tight text-white/95">
          BionicText
        </div>

        {/* Giriş Yap Button (Top Right) */}
        <button
          type="button"
          onClick={onGoToLogin}
          className="group flex items-center gap-3 rounded-full border border-white/20 bg-black/20 hover:bg-black/40 px-5 py-2 text-sm font-light text-white backdrop-blur-md transition-all shadow-sm active:scale-95"
        >
          <span>Giriş Yap</span>
          <span className="flex size-6 items-center justify-center rounded-full bg-white text-black transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="size-3.5" strokeWidth={2.2} />
          </span>
        </button>
      </header>

      {/* 3. LEFT DIAMOND INDICATORS (5 vertical diamonds matching screenshot) */}
      <div
        aria-hidden="true"
        className="absolute left-6 sm:left-10 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2.5 pointer-events-none"
      >
        {[0, 1, 2, 3, 4].map((item) => (
          <span
            key={item}
            className={
              item === 0
                ? "size-2.5 sm:size-3 rotate-45 border border-white/90 bg-white/40 shadow-sm"
                : "size-2.5 sm:size-3 rotate-45 border border-white/60 bg-transparent"
            }
          />
        ))}
      </div>

      {/* 4. CENTER GIANT HEADLINE: "BionicText" */}
      <main className="relative z-10 w-full flex-1 flex items-center justify-center pointer-events-none">
        <h1 className="font-display text-6xl sm:text-8xl md:text-9xl lg:text-[11rem] font-light tracking-tight text-white/95 drop-shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
          BionicText
        </h1>
      </main>

      {/* Invisible spacer for vertical balance */}
      <div className="h-16 pointer-events-none" />
    </div>
  );
}
