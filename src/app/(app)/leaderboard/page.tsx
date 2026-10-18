import Link from "next/link";
import { requireMember } from "@/lib/session";
import type { LeaderRow } from "@/lib/types";

const PERIODS = [
  ["week", "Diese Woche", "এই সপ্তাহ"],
  ["month", "Dieser Monat", "এই মাস"],
  ["all", "Gesamt", "সব সময়"],
] as const;

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const period = PERIODS.some(([k]) => k === p) ? p! : "week";
  const { supabase, user } = await requireMember();
  const { data } = await supabase.rpc("leaderboard", { p_period: period });
  const rows = (data ?? []) as LeaderRow[];
  const medal = ["🥇", "🥈", "🥉"];
  const improved = [...rows].sort((a, b) => b.improvement - a.improvement)[0];
  const sharp = [...rows].filter((r) => r.xp > 0).sort((a, b) => b.accuracy - a.accuracy)[0];
  const fire = [...rows].sort((a, b) => b.streak - a.streak)[0];

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="eyebrow">Rangliste · লিডারবোর্ড</p>
        <h1 className="text-3xl font-extrabold">Wer lernt am meisten?</h1>
        <p className="text-muted">
          XP come from real work: reviews, new words, the mission and exams. Daily caps stop anyone from grinding. Beat your own last week, not only
          others. <span className="bn">নিজের গত সপ্তাহকে হারাও!</span>
        </p>
      </header>
      <div className="flex w-max gap-1 rounded-full border border-line bg-surface p-1">
        {PERIODS.map(([k, de, bn]) => (
          <Link key={k} href={`/leaderboard?p=${k}`} className={`rounded-full px-3 py-1.5 text-sm font-bold ${period === k ? "bg-blue text-surface" : "text-muted"}`}>
            {de} <span className="bn font-normal">{bn}</span>
          </Link>
        ))}
      </div>

      {rows.length > 1 && (
        <div className="grid gap-2 sm:grid-cols-3">
          {improved && improved.improvement > 0 && period !== "all" && (
            <div className="card py-3">
              <p className="eyebrow">📈 Most improved · সবচেয়ে উন্নতি</p>
              <p className="font-bold">
                {improved.avatar_emoji} {improved.display_name} <span className="text-green">+{improved.improvement} XP</span>
              </p>
            </div>
          )}
          {sharp && (
            <div className="card py-3">
              <p className="eyebrow">🎯 Sharpest · সবচেয়ে নির্ভুল</p>
              <p className="font-bold">
                {sharp.avatar_emoji} {sharp.display_name} <span className="text-blue">{sharp.accuracy}%</span>
              </p>
            </div>
          )}
          {fire && fire.streak > 0 && (
            <div className="card py-3">
              <p className="eyebrow">🔥 Longest streak · টানা দিন</p>
              <p className="font-bold">
                {fire.avatar_emoji} {fire.display_name} <span className="text-red">{fire.streak} Tage</span>
              </p>
            </div>
          )}
        </div>
      )}

      <ol className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <li key={r.user_id} className={`card flex items-center gap-3 py-3 ${r.user_id === user.id ? "border-2 border-blue" : ""}`}>
            <span className="w-8 text-center text-2xl font-extrabold tabular-nums">{medal[i] ?? i + 1}</span>
            <span className="text-3xl" aria-hidden>
              {r.avatar_emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">
                {r.display_name || "—"} {r.user_id === user.id && <span className="chip ml-1">du</span>}
              </p>
              <p className="text-sm text-muted tabular-nums">
                🎯 {r.accuracy}% · 🔥 {r.streak} · ★ {r.mastered} mastered
                {period !== "all" && (
                  <span className={r.improvement >= 0 ? "text-green" : "text-red"}>
                    {" "}
                    · {r.improvement >= 0 ? "▲" : "▼"} {Math.abs(r.improvement)}
                  </span>
                )}
              </p>
            </div>
            <span className="text-2xl font-extrabold tabular-nums">
              {r.xp}
              <span className="text-sm font-bold text-muted"> XP</span>
            </span>
          </li>
        ))}
      </ol>
      <details className="card text-sm">
        <summary className="cursor-pointer font-bold">How XP works · পয়েন্ট কীভাবে আসে</summary>
        <ul className="mt-2 list-disc pl-5 text-muted">
          <li>Review card remembered: 2 XP (max 60 a day)</li>
          <li>New word learned: 3 XP (max 45 a day)</li>
          <li>Quiz with 90% or more: +20 XP once a day</li>
          <li>Daily mission complete: +50 XP</li>
          <li>Every 7-day streak: +100 XP. Whole team finishes the day: +20 XP for everyone</li>
          <li>Answer a nudge within an hour: +10 XP for you and the sender</li>
          <li>Exam: XP equal to your score in percent</li>
        </ul>
      </details>
    </div>
  );
}
