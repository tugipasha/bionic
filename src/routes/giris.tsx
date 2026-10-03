import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { googleSignIn } from "@/lib/google-sheets-db";

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
      ? await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name } },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    setBusy(false);
    if (error) return setMsg({ text: error.message, error: true });
    if (data.session) return navigate({ to: "/" });
    setMsg({ text: "Doğrulama bağlantısı e-posta adresine gönderildi." });
  }

  async function google() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        navigate({ to: "/" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Google ile giriş yapılamadı.";
      setMsg({ text: message, error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6 text-foreground">
      <img
        src="/bionic-mountain-background.png"
        alt=""
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-black/30" />

      <Link to="/" className="absolute left-[2.73vw] top-[3.25vh] font-display text-xl font-light">
        BionicText
      </Link>

      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-3xl border border-foreground/25 bg-foreground/10 p-8 backdrop-blur-md"
      >
        <h1 className="font-display text-3xl font-light">{signup ? "Kayıt Ol" : "Giriş Yap"}</h1>

        {signup && (
          <input
            className={field}
            name="name"
            placeholder="Ad Soyad"
            autoComplete="name"
            required
          />
        )}
        <input
          className={field}
          name="email"
          type="email"
          placeholder="E-posta"
          autoComplete="email"
          required
        />
        <input
          className={field}
          name="password"
          type="password"
          placeholder="Şifre"
          autoComplete={signup ? "new-password" : "current-password"}
          minLength={6}
          required
        />

        {msg && (
          <p className={`px-2 text-sm ${msg.error ? "text-destructive" : "text-foreground/80"}`}>
            {msg.text}
          </p>
        )}

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
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-foreground/25 text-sm font-medium transition-colors hover:bg-foreground/10 disabled:opacity-60"
        >
          <svg className="size-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Google ile Giriş Yap</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSignup(!signup);
            setMsg(null);
          }}
          className="w-full text-center text-sm font-light text-foreground/70 hover:text-foreground"
        >
          {signup ? "Zaten hesabın var mı? Giriş yap" : "Hesabın yok mu? Kayıt ol"}
        </button>
      </form>
    </main>
  );
}
