import React, { useState } from "react";
import {
  Languages,
  BookOpen,
  Zap,
  Sparkles,
  LogOut,
  User,
  ArrowLeft,
  Settings,
  HelpCircle,
} from "lucide-react";
import { BionicConverterTab } from "./BionicConverterTab";
import { BionicLibraryTab } from "./BionicLibraryTab";
import { BionicSpeedReaderTab } from "./BionicSpeedReaderTab";
import { BionicImageAnalysisTab } from "./BionicImageAnalysisTab";
import { SAMPLE_TEXTS } from "./bionic-transformer";

export type DashboardTab = "translate" | "library" | "speed" | "analysis";

interface BionicDashboardProps {
  userEmail?: string;
  onSignOut: () => void;
  onBackToLanding?: () => void;
}

export function BionicDashboard({
  userEmail = "ardumindproje@gmail.com",
  onSignOut,
  onBackToLanding,
}: BionicDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("translate");
  const [speedReaderText, setSpeedReaderText] = useState<string>(SAMPLE_TEXTS[0]?.text || "");

  const handleOpenSpeedReader = (text: string) => {
    setSpeedReaderText(text);
    setActiveTab("speed");
  };

  const handleSelectDocument = (text: string) => {
    try {
      localStorage.setItem("bionic_current_draft", text);
    } catch {
      // ignore
    }
    setActiveTab("translate");
  };

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-background text-foreground font-sans">
      {/* Background Image - Exactly identical to the home page */}
      <img
        src="/bionic-mountain-background.webp"
        srcSet="/bionic-mountain-background-sm.webp 800w, /bionic-mountain-background.webp 1448w"
        sizes="100vw"
        decoding="async"
        alt="Sisli dağların üzerinde yükselen küre"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
      />
      {/* Dark Ambient Glassmorphic Tint */}
      <div className="absolute inset-0 -z-10 bg-black/45 backdrop-blur-[2px]" />

      {/* Top Application Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-foreground/15 bg-black/40 px-4 sm:px-8 py-3.5 backdrop-blur-xl">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-4">
          {onBackToLanding && (
            <button
              onClick={onBackToLanding}
              className="flex size-9 items-center justify-center rounded-full border border-foreground/20 bg-foreground/10 text-foreground/80 transition-colors hover:bg-foreground/20 hover:text-foreground"
              title="Ana Sayfaya Dön"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl sm:text-2xl font-light tracking-wide text-foreground">
              BionicText
            </h1>
            <span className="hidden sm:inline-flex rounded-full border border-foreground/20 bg-foreground/10 px-2 py-0.5 text-[11px] uppercase tracking-wider text-foreground/70">
              Çevirici
            </span>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="hidden md:flex items-center rounded-full border border-foreground/20 bg-foreground/10 p-1 backdrop-blur-md">
          <button
            onClick={() => setActiveTab("translate")}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              activeTab === "translate"
                ? "bg-foreground text-background shadow-lg"
                : "text-foreground/70 hover:text-foreground hover:bg-foreground/10"
            }`}
          >
            <Languages className="size-3.5" />
            Çeviri
          </button>

          <button
            onClick={() => setActiveTab("library")}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              activeTab === "library"
                ? "bg-foreground text-background shadow-lg"
                : "text-foreground/70 hover:text-foreground hover:bg-foreground/10"
            }`}
          >
            <BookOpen className="size-3.5" />
            Kütüphanem
          </button>

          <button
            onClick={() => setActiveTab("speed")}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              activeTab === "speed"
                ? "bg-foreground text-background shadow-lg"
                : "text-foreground/70 hover:text-foreground hover:bg-foreground/10"
            }`}
          >
            <Zap className="size-3.5" />
            Hızlı Okuma (RSVP)
          </button>

          <button
            onClick={() => setActiveTab("analysis")}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              activeTab === "analysis"
                ? "bg-foreground text-background shadow-lg"
                : "text-foreground/70 hover:text-foreground hover:bg-foreground/10"
            }`}
          >
            <Sparkles className="size-3.5" />
            Görsel Analizi
          </button>
        </nav>

        {/* Right: User profile & Logout */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/10 px-3 py-1 text-xs text-foreground/90 backdrop-blur-sm">
            <span className="flex size-5 items-center justify-center rounded-full bg-foreground/20 text-[11px]">
              <User className="size-3" />
            </span>
            <span className="max-w-[140px] truncate">{userEmail}</span>
          </div>

          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 rounded-full border border-foreground/25 bg-foreground/10 px-3.5 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-destructive/20 hover:border-destructive/40 hover:text-destructive backdrop-blur-sm"
          >
            <LogOut className="size-3.5" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </header>

      {/* Mobile Tab Navigation Bar */}
      <div className="flex md:hidden border-b border-foreground/15 bg-black/50 px-2 py-1.5 backdrop-blur-lg overflow-x-auto">
        <button
          onClick={() => setActiveTab("translate")}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            activeTab === "translate"
              ? "bg-foreground text-background"
              : "text-foreground/70 hover:text-foreground"
          }`}
        >
          <Languages className="size-3.5" />
          Çeviri
        </button>

        <button
          onClick={() => setActiveTab("library")}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            activeTab === "library"
              ? "bg-foreground text-background"
              : "text-foreground/70 hover:text-foreground"
          }`}
        >
          <BookOpen className="size-3.5" />
          Kütüphanem
        </button>

        <button
          onClick={() => setActiveTab("speed")}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            activeTab === "speed"
              ? "bg-foreground text-background"
              : "text-foreground/70 hover:text-foreground"
          }`}
        >
          <Zap className="size-3.5" />
          Hızlı Okuma
        </button>

        <button
          onClick={() => setActiveTab("analysis")}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            activeTab === "analysis"
              ? "bg-foreground text-background"
              : "text-foreground/70 hover:text-foreground"
          }`}
        >
          <Sparkles className="size-3.5" />
          Görsel Analizi
        </button>
      </div>

      {/* Main Tab Workspace Content Area */}
      <main className="relative flex flex-1 flex-col px-3 sm:px-6 md:px-8 pt-4 overflow-y-auto">
        {activeTab === "translate" && (
          <BionicConverterTab onOpenSpeedReader={handleOpenSpeedReader} />
        )}

        {activeTab === "library" && <BionicLibraryTab onSelectDocument={handleSelectDocument} />}

        {activeTab === "speed" && <BionicSpeedReaderTab initialText={speedReaderText} />}

        {activeTab === "analysis" && <BionicImageAnalysisTab />}
      </main>
    </div>
  );
}
