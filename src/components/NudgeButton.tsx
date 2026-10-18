"use client";
import { useState } from "react";

const PRESETS = [
  "Los geht's! 💪 চলো, আজকের মিশনটা করে ফেলো!",
  "Wir warten auf dich! 👀 টিম তোমার অপেক্ষায়।",
  "Nur 15 Minuten! ⏱️ মাত্র ১৫ মিনিট লাগবে।",
  "Die Serie nicht brechen! 🔥 স্ট্রিক ভেঙো না!",
];

export function NudgeButton({ to, name, already }: { to: string; name: string; already: boolean }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(already);
  const [msg, setMsg] = useState(PRESETS[0]);
  const [err, setErr] = useState("");

  async function send() {
    setErr("");
    const res = await fetch("/api/nudge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to, message: msg }) });
    if (!res.ok) return setErr(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Failed");
    setSent(true);
    setOpen(false);
  }

  if (sent) return <span className="chip text-green">👋 Angestupst</span>;
  return (
    <div className="relative">
      <button className="btn-gold px-3 py-1.5 text-sm" onClick={() => setOpen(!open)}>
        👋 Anstupsen
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-xl border border-line bg-surface p-3 shadow-xl">
          <p className="mb-2 text-sm font-bold">Nudge {name}</p>
          <div className="flex flex-col gap-1">
            {PRESETS.map((p) => (
              <button key={p} onClick={() => setMsg(p)} className={`bn rounded-lg border px-2 py-1 text-left text-sm ${msg === p ? "border-blue bg-blue-soft" : "border-line"}`}>
                {p}
              </button>
            ))}
          </div>
          <input className="input mt-2 text-sm" maxLength={140} value={msg} onChange={(e) => setMsg(e.target.value)} />
          {err && <p className="mt-1 text-sm text-red">{err}</p>}
          <button className="btn mt-2 w-full py-1.5" onClick={send}>
            Senden
          </button>
          <p className="mt-1 text-xs text-muted">If they finish within an hour, you both get +10 XP.</p>
        </div>
      )}
    </div>
  );
}
