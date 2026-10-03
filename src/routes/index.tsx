import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExactBionicApp } from "@/components/bionic/ExactBionicApp";
import { LandingPage } from "@/components/bionic/LandingPage";
import { syncUserSettingsWithSupabase } from "@/lib/user-settings-store";
import { syncTestHistoryWithSupabase } from "@/lib/reading-stats-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BionicText — Biyonik Okuma ve Metin Dönüştürücü" },
      {
        name: "description",
        content:
          "BionicText ile metinleri çevirin, biyonik okuma formatında görün ve okuma becerilerinizi bir üst seviyeye taşıyın.",
      },
      { property: "og:title", content: "BionicText" },
      {
        property: "og:description",
        content:
          "Metinleri çevir, biyonik okuma formatında gör, ve okuma becerilerini bir üst seviyeye taşı.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(false);
  const [guest, setGuest] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    try {
      if (sessionStorage.getItem("bionictext_guest") === "1") setGuest(true);
    } catch {
      /* yoksay */
    }
    // Check initial Supabase session
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) {
          setLoggedIn(true);
          if (data.session.user?.email) {
            setUserEmail(data.session.user.email);
          }
          syncUserSettingsWithSupabase().catch(() => {});
          syncTestHistoryWithSupabase().catch(() => {});
        }
      })
      .catch(() => {
        /* Supabase yapılandırılmamış / ağ yok: misafir olarak devam */
      });

    // Listen to real-time auth changes
    const { data: supaSub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        setLoggedIn(true);
        if (session.user?.email) {
          setUserEmail(session.user.email);
        }
        syncUserSettingsWithSupabase().catch(() => {});
        syncTestHistoryWithSupabase().catch(() => {});
      } else {
        setLoggedIn(false);
      }
    });

    return () => {
      supaSub.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* yoksay */
    }
    setLoggedIn(false);
    setGuest(false);
    try {
      sessionStorage.removeItem("bionictext_guest");
    } catch {
      /* yoksay */
    }
  };

  const handleGoToLogin = () => {
    navigate({ to: "/giris" });
  };

  if (!loggedIn && !guest) {
    return (
      <LandingPage
        onGoToLogin={handleGoToLogin}
        onTryNow={() => {
          try {
            sessionStorage.setItem("bionictext_guest", "1");
          } catch {
            /* yoksay */
          }
          setGuest(true);
        }}
      />
    );
  }

  return (
    <ExactBionicApp
      isLoggedIn={loggedIn}
      userEmail={userEmail}
      onSignOut={handleSignOut}
      onGoToLogin={handleGoToLogin}
    />
  );
}
