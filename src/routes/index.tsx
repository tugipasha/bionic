import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { initAuth, logoutGoogle } from "@/lib/google-sheets-db";
import { ExactBionicApp } from "@/components/bionic/ExactBionicApp";
import { LandingPage } from "@/components/bionic/LandingPage";

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
  const [userEmail, setUserEmail] = useState<string>("ardumindproje@gmail.com");

  useEffect(() => {
    // 1. Google Workspace Firebase Auth Listener
    const unsubscribeGoogle = initAuth(
      (user) => {
        setLoggedIn(true);
        if (user.email) setUserEmail(user.email);
      },
      () => {
        // Fallback to Supabase check
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) {
            setLoggedIn(true);
            if (data.session.user?.email) {
              setUserEmail(data.session.user.email);
            }
          }
        });
      },
    );

    // 2. Supabase Auth Listener
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setLoggedIn(true);
        if (data.session.user?.email) {
          setUserEmail(data.session.user.email);
        }
      }
    });

    const { data: supaSub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        setLoggedIn(true);
        if (session.user?.email) {
          setUserEmail(session.user.email);
        }
      }
    });

    return () => {
      unsubscribeGoogle();
      supaSub.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await logoutGoogle();
    await supabase.auth.signOut();
    setLoggedIn(false);
  };

  const handleGoToLogin = () => {
    navigate({ to: "/giris" });
  };

  if (!loggedIn) {
    return <LandingPage onGoToLogin={handleGoToLogin} />;
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
