import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BionicText" },
      {
        name: "description",
        content: "BionicText ile okuma deneyiminizi yeniden keşfedin.",
      },
      { property: "og:title", content: "BionicText" },
      {
        property: "og:description",
        content: "BionicText ile okuma deneyiminizi yeniden keşfedin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setLoggedIn(!!session));
    return () => data.subscription.unsubscribe();
  }, []);

  const cta =
    "group flex h-[clamp(2.15rem,4.45vw,3.3rem)] items-center gap-[clamp(.6rem,1.2vw,1.15rem)] rounded-full border border-foreground/25 py-1 pl-[clamp(.8rem,1.45vw,1.6rem)] pr-1 text-[clamp(.65rem,1.17vw,1.1rem)] font-medium backdrop-blur-sm transition-colors hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
  const arrow = (
    <span className="flex size-[clamp(1.65rem,3.35vw,2.55rem)] shrink-0 items-center justify-center rounded-full bg-foreground text-background">
      <ArrowRight aria-hidden="true" className="size-[42%]" strokeWidth={1.8} />
    </span>
  );

  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-background text-foreground">
      <img
        src="/bionic-mountain-background.png"
        alt="Sisli dağların üzerinde yükselen küre"
        className="absolute inset-0 -z-10 h-full w-full object-cover object-center"
      />

      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-[2.73vw] pt-[3.25vh]">
        <a href="/" className="font-display text-[clamp(1.05rem,2.15vw,2.6rem)] font-light leading-none tracking-normal">
          BionicText
        </a>

        {loggedIn ? (
          <button onClick={() => supabase.auth.signOut()} className={cta}>
            Çıkış Yap
            {arrow}
          </button>
        ) : (
          <Link to="/giris" className={cta}>
            Giriş Yap
            {arrow}
          </Link>
        )}
      </header>

      <div aria-hidden="true" className="absolute left-[2.15vw] top-1/2 z-10 flex -translate-y-1/2 flex-col gap-[.72vw]">
        {[0, 1, 2, 3, 4].map((item) => (
          <span
            key={item}
            className={item === 0 ? "size-[clamp(.38rem,.78vw,.7rem)] rotate-45 border border-foreground bg-foreground/45" : "size-[clamp(.38rem,.78vw,.7rem)] rotate-45 border border-foreground/75"}
          />
        ))}
      </div>

      <section className="absolute inset-x-0 top-[46.9%] flex -translate-y-1/2 items-center justify-center px-[8vw]">
        <h1 className="title-focus font-display text-[12.55vw] font-light leading-none tracking-normal text-foreground/95">
          BionicText
        </h1>
      </section>
    </main>
  );
}
