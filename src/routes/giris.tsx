import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/giris")({
  head: () => ({ meta: [{ title: "Giriş Yap — BionicText" }] }),
  component: Auth,
});

const field =
  "h-12 w-full rounded-full border border-foreground/25 bg-foreground/5 px-5 text-sm font-light text-foreground placeholder:text-foreground/50 backdrop-blur-sm outline-none transition-colors focus:border-foreground/60";

function Auth() {
  const navigate = useNavigate();
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    const full_name = String(f.get("name") ?? "");
    setBusy(true);
    setMsg(null);

    const { data, error } = signup
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { full_name } } })
      : await supabase.auth.signInWithPassword({ email, password });

    setBusy(false);
    if (error) return setMsg({ text: error.message, error: true });
    if (data.session) return navigate({ to: "/" });
    setMsg({ text: "Doğrulama bağlantısı e-posta adresine gönderildi." });
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setMsg({ text: error.message, error: true });
  }

  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6 text-foreground">
      <img src="/bionic-mountain-background.png" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-black/30" />

      <Link to="/" className="absolute left-[2.73vw] top-[3.25vh] font-display text-xl font-light">
        BionicText
      </Link>

      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-3xl border border-foreground/25 bg-foreground/10 p-8 backdrop-blur-md"
      >
        <h1 className="font-display text-3xl font-light">{signup ? "Kayıt Ol" : "Giriş Yap"}</h1>

        {signup && <input className={field} name="name" placeholder="Ad Soyad" autoComplete="name" required />}
        <input className={field} name="email" type="email" placeholder="E-posta" autoComplete="email" required />
        <input
          className={field}
          name="password"
          type="password"
          placeholder="Şifre"
          autoComplete={signup ? "new-password" : "current-password"}
          minLength={6}
          required
        />

        {msg && <p className={`px-2 text-sm ${msg.error ? "text-destructive" : "text-foreground/80"}`}>{msg.text}</p>}

        <button
          disabled={busy}
          className="group flex h-12 w-full items-center justify-between rounded-full border border-foreground/25 py-1 pl-6 pr-1 text-sm font-medium transition-colors hover:bg-foreground/10 disabled:opacity-60"
        >
          {signup ? "Hesap Oluştur" : "Giriş Yap"}
          <span className="flex size-10 items-center justify-center rounded-full bg-foreground text-background">
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
          </span>
        </button>

        <button
          type="button"
          onClick={google}
          className="h-12 w-full rounded-full border border-foreground/25 text-sm font-medium transition-colors hover:bg-foreground/10"
        >
          Google ile devam et
        </button>

        <button
          type="button"
          onClick={() => { setSignup(!signup); setMsg(null); }}
          className="w-full text-center text-sm font-light text-foreground/70 hover:text-foreground"
        >
          {signup ? "Zaten hesabın var mı? Giriş yap" : "Hesabın yok mu? Kayıt ol"}
        </button>
      </form>
    </main>
  );
}
