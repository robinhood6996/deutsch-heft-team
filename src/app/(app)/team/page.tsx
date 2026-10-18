import { requireMember } from "@/lib/session";
import type { TeamOverview } from "@/lib/types";
import { NudgeButton } from "@/components/NudgeButton";
import { Progress } from "@/components/ui";
import { CopyCode } from "@/components/CopyCode";
import { FEED_TEXT, ago, minutes } from "@/lib/format";

type FeedRow = { id: number; user_id: string; display_name: string; avatar_emoji: string; kind: string; xp: number; meta: Record<string, unknown>; created_at: string };

export default async function TeamPage() {
  const { supabase, user } = await requireMember();
  const [{ data: ov }, { data: feed }] = await Promise.all([supabase.rpc("team_overview"), supabase.rpc("team_feed", { p_limit: 25 })]);
  const o = ov as TeamOverview;
  const done = o.members.filter((m) => m.done_today).length;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Unser Team · আমাদের টিম</p>
          <h1 className="text-3xl font-extrabold">{o.team.name}</h1>
        </div>
        <CopyCode code={o.team.invite_code} />
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card">
          <p className="eyebrow">Heute fertig · আজ শেষ করেছে</p>
          <p className="text-3xl font-extrabold tabular-nums">
            {done} / {o.members.length}
          </p>
          <Progress value={done} max={o.members.length} color="bg-green" className="mt-2" />
        </div>
        <div className="card">
          <p className="eyebrow">Team-Serie · টিম স্ট্রিক</p>
          <p className="text-3xl font-extrabold tabular-nums">🔥 {o.team_streak}</p>
          <p className="text-sm text-muted">days in a row where everyone finished</p>
        </div>
        <div className="card">
          <p className="eyebrow">Wochenziel · সাপ্তাহিক লক্ষ্য</p>
          <p className="text-3xl font-extrabold tabular-nums">
            {o.week_words} <span className="text-lg text-muted">/ {o.team.weekly_goal_words} words</span>
          </p>
          <Progress value={o.week_words} max={o.team.weekly_goal_words} color="bg-gold-bg" className="mt-2" />
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-xl font-extrabold">Mitglieder · সদস্য</h2>
        <ul className="flex flex-col gap-2">
          {o.members.map((m) => {
            const started = m.steps && (m.steps.review || m.steps.learn || m.steps.read);
            const status = m.done_today ? ["✅ Fertig", "text-green"] : started ? ["⏳ Dabei", "text-gold"] : ["💤 Noch nicht", "text-red"];
            return (
              <li key={m.user_id} className="card flex flex-wrap items-center gap-3 py-3">
                <span className="text-3xl" aria-hidden>
                  {m.avatar_emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {m.display_name || "—"} {m.role === "leader" && <span className="chip ml-1">🧭 Leiter</span>}
                    {m.user_id === user.id && <span className="chip ml-1">du</span>}
                  </p>
                  <p className="text-sm text-muted tabular-nums">
                    <span className={`font-bold ${status[1]}`}>{status[0]}</span> · 🔥 {m.streak} · {m.days_this_week}/7 days · {m.xp_week} XP ·{" "}
                    {minutes(m.seconds_week)} this week · active {ago(m.last_active)}
                  </p>
                  {m.steps && !m.done_today && (
                    <p className="text-xs text-muted">
                      {(["review", "learn", "read", "quiz"] as const).map((s) => `${m.steps![s] ? "✓" : "○"} ${s}`).join("  ")}
                    </p>
                  )}
                </div>
                {!m.done_today && m.user_id !== user.id && <NudgeButton to={m.user_id} name={m.display_name} already={m.nudged_today} />}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-extrabold">Neuigkeiten · খবর</h2>
        <ul className="card divide-y divide-line">
          {((feed ?? []) as FeedRow[]).map((f) => (
            <li key={f.id} className="flex items-center gap-2 py-2 text-sm">
              <span aria-hidden>{f.kind === "team_bonus" ? "🎉" : f.avatar_emoji}</span>
              <span className="flex-1">
                {f.kind !== "team_bonus" && <b>{f.display_name} </b>}
                {(FEED_TEXT[f.kind] ?? (() => f.kind))(f.meta, f.xp)}
              </span>
              <span className="text-xs text-muted">{ago(f.created_at)}</span>
            </li>
          ))}
          {!feed?.length && <li className="py-2 text-sm text-muted">Nothing yet. Finish a mission to be the first!</li>}
        </ul>
      </section>
    </div>
  );
}
