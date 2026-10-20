"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAppRouter } from "@/lib/progress";
import { LoadingButton } from "@/components/LoadingButton";
import { supabaseBrowser } from "@/lib/supabase/client";

function LoginForm() {
  const router = useAppRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const sb = supabaseBrowser();
    if (mode === "signin") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setMsg({ ok: false, text: error.message });
      else return router.replace(next); // keep the spinner until the next page shows
    } else {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });
      if (error) setMsg({ ok: false, text: error.message });
      else if (data.session) return router.replace("/onboarding");
      else setMsg({ ok: true, text: "Check your email and tap the confirmation link. · ইমেইলে পাঠানো লিংকে চাপ দিন।" });
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6">
        <p className="hand -rotate-2 text-2xl text-red">Du schaffst das!</p>
        <h1 className="text-4xl font-extrabold">Deutsch-Heft Team</h1>
        <p className="mt-1 text-muted">
          Our group&apos;s daily German practice. <span className="bn">আমাদের দলের প্রতিদিনের জার্মান অনুশীলন।</span>
        </p>
      </div>
      <form onSubmit={submit} className="card flex flex-col gap-3">
        <div className="flex rounded-full border border-line bg-surface-2 p-1 text-sm font-bold">
          {(["signin", "signup"] as const).map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-full py-1.5 ${mode === m ? "bg-blue text-surface" : "text-muted"}`}
            >
              {m === "signin" ? "Anmelden · লগইন" : "Registrieren · নতুন অ্যাকাউন্ট"}
            </button>
          ))}
        </div>
        {mode === "signup" && (
          <label className="flex flex-col gap-1">
            <span className="label">Your name</span>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="label">Email</span>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Password</span>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </label>
        <LoadingButton type="submit" className="btn mt-1" loading={busy || router.pending} loadingText={mode === "signin" ? "Signing in …" : "Creating account …"}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </LoadingButton>
        {msg && <p className={`text-sm ${msg.ok ? "text-green" : "text-red"}`}>{msg.text}</p>}
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
