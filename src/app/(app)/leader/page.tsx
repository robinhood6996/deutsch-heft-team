import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/session";
import { appToday } from "@/lib/german";
import type { Chapter, Lesson, Mission, TeamOverview } from "@/lib/types";
import { ago, minutes } from "@/lib/format";
import { MissionPlanner } from "./MissionPlanner";
import { TeamSettings } from "./TeamSettings";
import { ExportCsv } from "./ExportCsv";

type Heat = { user_id: string; day: string; completed: boolean; xp: number };
type Weak = { word_id: string; de: string; en: string; bn: string; wrong: number; attempts: number };

export default async function LeaderPage() {
  const { supabase, isLeader } = await requireMember();
  if (!isLeader) redirect("/");
  const today = appToday();
  const [{ data: ov }, { data: heat }, { data: weak }, { data: chapters }, { data: lessons }, { data: missions }] = await Promise.all([
    supabase.rpc("team_overview"),
    supabase.rpc("team_heatmap", { p_days: 28 }),
    supabase.rpc("team_weak_words", { p_limit: 15 }),
    supabase.from("chapters").select("*").order("sort"),
    supabase.from("lessons").select("id, chapter_id, title, en_title, bn_title, sort, num, kind").order("sort"),
    supabase.from("daily_missions").select("*").gte("day", today).order("day").limit(30),
  ]);
  const o = ov as TeamOverview;
  const heatRows = (heat ?? []) as Heat[];
  const days = [...new Set(heatRows.map((h) => h.day))].sort();
  const cell = new Map(heatRows.map((h) => [`${h.user_id}|${h.day}`, h]));
  const notStarted = o.members.filter((m) => !m.done_today && !(m.steps && (m.steps.review || m.steps.learn)));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Leiter-Dashboard · লিডার ড্যাশবোর্ড</p>
          <h1 className="text-3xl font-extrabold">{o.team.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/leader/exams" className="btn-gold">
            📝 Prüfungen planen
          </Link>
          <ExportCsv members={o.members} />
        </div>
      </header>

      {notStarted.length > 0 && (
        <p className="rounded-xl border-2 border-red bg-red-soft px-4 py-3">
          <b>{notStarted.length} not started today:</b> {notStarted.map((m) => `${m.avatar_emoji} ${m.display_name}`).join(", ")}.{" "}
          <Link href="/team" className="font-bold underline">
            Nudge them
          </Link>
        </p>
      )}

      <section>
        <h2 className="mb-2 text-xl font-extrabold">Heute & diese Woche · আজ ও এই সপ্তাহ</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase text-muted">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Today</th>
                <th className="p-2">Quiz</th>
                <th className="p-2">Days/7</th>
                <th className="p-2">Time today</th>
                <th className="p-2">Time week</th>
                <th className="p-2">XP week</th>
                <th className="p-2">Accuracy</th>
                <th className="p-2">Words</th>
                <th className="p-2">Mastered</th>
                <th className="p-2">Streak</th>
                <th className="p-2">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {o.members.map((m) => (
                <tr key={m.user_id}>
                  <td className="p-2 font-bold">
                    {m.avatar_emoji} {m.display_name}
                  </td>
                  <td className="p-2">
                    {m.done_today ? (
                      <span className="text-green">✅</span>
                    ) : (
                      <span className="font-mono text-xs">
                        {(["review", "learn", "read", "quiz"] as const).map((s) => (m.steps?.[s] ? "●" : "○")).join("")}
                      </span>
                    )}
                  </td>
                  <td className="p-2">{m.steps?.quiz_pct ?? "–"}</td>
                  <td className={`p-2 ${m.days_this_week < 3 ? "font-bold text-red" : ""}`}>{m.days_this_week}</td>
                  <td className="p-2">{minutes(m.seconds_today)}</td>
                  <td className="p-2">{minutes(m.seconds_week)}</td>
                  <td className="p-2">{m.xp_week}</td>
                  <td className={`p-2 ${m.accuracy_week && m.accuracy_week < 70 ? "text-red" : ""}`}>{m.accuracy_week}%</td>
                  <td className="p-2">{m.words_learned}</td>
                  <td className="p-2">{m.mastered}</td>
                  <td className="p-2">🔥 {m.streak}</td>
                  <td className="p-2 text-muted">{ago(m.last_active)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-xl font-extrabold">Letzte 4 Wochen · গত ৪ সপ্তাহ</h2>
        <p className="mb-2 text-sm text-muted">Green = mission finished. Pale = some XP but not finished. Empty = nothing.</p>
        <div className="card overflow-x-auto">
          <table className="text-xs">
            <tbody>
              {o.members.map((m) => (
                <tr key={m.user_id}>
                  <td className="whitespace-nowrap pr-2 font-bold">
                    {m.avatar_emoji} {m.display_name}
                  </td>
                  {days.map((d) => {
                    const h = cell.get(`${m.user_id}|${d}`);
                    const cls = h?.completed ? "bg-green" : h && h.xp > 0 ? "bg-green-soft" : "bg-surface-2";
                    return (
                      <td key={d} className="p-0.5">
                        <div title={`${d}: ${h?.completed ? "done" : (h?.xp ?? 0) + " XP"}`} className={`h-4 w-4 rounded-sm ${cls} ${d === today ? "ring-2 ring-blue" : ""}`} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <MissionPlanner chapters={(chapters ?? []) as Chapter[]} lessons={(lessons ?? []) as Lesson[]} missions={(missions ?? []) as Mission[]} teamId={o.team.id} today={today} />

      <section>
        <h2 className="mb-1 text-xl font-extrabold">Schwache Wörter im Team · টিমের দুর্বল শব্দ</h2>
        <p className="mb-2 text-sm text-muted">Words the team forgot most in the last 30 days. Use them in your next class or put them in an exam.</p>
        <ul className="card divide-y divide-line">
          {((weak ?? []) as Weak[]).map((w) => (
            <li key={w.word_id} className="flex items-center gap-3 py-2 text-sm">
              <b className="flex-1" lang="de">
                {w.de}
              </b>
              <span className="flex-1 text-muted">
                {w.en} · <span className="bn">{w.bn}</span>
              </span>
              <span className="tabular-nums text-red">
                {w.wrong}/{w.attempts} wrong
              </span>
            </li>
          ))}
          {!weak?.length && <li className="py-2 text-sm text-muted">No data yet.</li>}
        </ul>
      </section>

      <TeamSettings team={o.team} chapters={(chapters ?? []) as Chapter[]} members={o.members} />
    </div>
  );
}
