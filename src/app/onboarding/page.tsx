"use client";
import { useState } from "react";
import { useAppRouter } from "@/lib/progress";
import { LoadingButton } from "@/components/LoadingButton";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Onboarding() {
  const router = useAppRouter();
  const [code, setCode] = useState("");
  const [team, setTeam] = useState("");
  const [err, setErr] = useState("");

  async function run(fn: "join_team" | "create_team") {
    setErr("");
    const sb = supabaseBrowser();
    const { error } = fn === "join_team" ? await sb.rpc("join_team", { p_code: code }) : await sb.rpc("create_team", { p_name: team });
    if (error) setErr(error.message);
    else router.replace("/");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-3xl font-extrabold">Join your team</h1>
      <p className="text-muted">
        Ask your team leader for the 6-letter invite code. <span className="bn">টিম লিডারের কাছ থেকে ৬ অক্ষরের কোড নিন।</span>
      </p>
      <div className="card flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="label">Invite code</span>
          <input id="code" className="input font-display text-2xl tracking-[0.3em] uppercase" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        <LoadingButton className="btn" disabled={code.length < 6} loading={router.pending} loadingText="Joining …" onClick={() => run("join_team")}>
          Join team · যোগ দিন
        </LoadingButton>
      </div>
      <details className="card">
        <summary className="cursor-pointer font-bold">I am the team leader: create a new team</summary>
        <div className="mt-3 flex flex-col gap-3">
          <input id="team" className="input" placeholder="Team name, e.g. Deutsch Gruppe Dhaka" value={team} onChange={(e) => setTeam(e.target.value)} />
          <LoadingButton className="btn-ghost" disabled={team.trim().length < 2} loading={router.pending} loadingText="Creating …" onClick={() => run("create_team")}>
            Create team
          </LoadingButton>
        </div>
      </details>
      {err && <p className="text-sm text-red">{err}</p>}
    </main>
  );
}
