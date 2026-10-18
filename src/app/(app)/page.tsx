import Link from "next/link";
import { requireMember } from "@/lib/session";
import type { MyStats, TeamOverview, TodayMission } from "@/lib/types";
import { NudgeBanner } from "@/components/NudgeBanner";

const STEPS = [
  { key: "review_done", label: "Wiederholen", bn: "রিভিশন", icon: "🔁" },
  { key: "learn_done", label: "Neue Wörter", bn: "নতুন শব্দ", icon: "✨" },
  { key: "read_done", label: "Lesen & Sprechen", bn: "পড়া ও বলা", icon: "🗣️" },
  { key: "quiz_done", label: "Mini-Quiz", bn: "মিনি কুইজ", icon: "🎯" },
] as const;

export default async function Today() {
  const { supabase, profile } = await requireMember();
  const [{ data: today }, { data: stats }, { data: overview }] = await Promise.all([
    supabase.rpc("get_today_mission"),
    supabase.rpc("my_stats"),
    supabase.rpc("team_overview"),
  ]);
  const t = today as TodayMission;
  const s = stats as MyStats;
  const o = overview as TeamOverview;
  const { data: lesson } = t?.learn_lesson_id
    ? await supabase.from("lessons").select("id, title, bn_title, chapter_id").eq("id", t.learn_lesson_id).single()
    : { data: null };

  const done = STEPS.filter((x) => t?.progress?.[x.key]).length;
  const complete = Boolean(t?.progress?.completed_at);
  const teamDone = o?.members.filter((m) => m.done_today).length ?? 0;
  const hour = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Dhaka" }));
  const greeting = hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";

  return (
    <div className="flex flex-col gap-5">
      <NudgeBanner nudges={s?.unseen_nudges ?? []} />
      <div>
        <h1 className="text-3xl font-extrabold">
          {greeting}, {profile.display_name || "du"}!
        </h1>
        <p className="text-muted">
          {complete ? "Mission complete. See you tomorrow!" : "Your mission for today takes about 15 minutes."}{" "}
          <span className="bn">{complete ? "আজকের মিশন শেষ। কাল আবার দেখা হবে!" : "আজকের মিশনে প্রায় ১৫ মিনিট লাগবে।"}</span>
        </p>
      </div>

      <section className={`card ${complete ? "border-green bg-green-soft" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Tagesmission · দৈনিক মিশন</p>
            <h2 className="text-2xl font-extrabold">{complete ? "Geschafft! 🎉" : `${done} / 4 Schritte`}</h2>
            {lesson && (
              <p className="text-sm text-muted">
                New words from <b>{lesson.title}</b> <span className="bn">({lesson.bn_title})</span>
              </p>
            )}
            {t?.mission?.note && <p className="mt-1 rounded-lg bg-gold-soft px-2 py-1 text-sm">📌 {t.mission.note}</p>}
          </div>
          {!complete && (
            <Link href="/mission" className="btn-gold text-lg">
              {done === 0 ? "Mission starten →" : "Weitermachen →"}
            </Link>
          )}
        </div>
        <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEPS.map((x, i) => {
            const ok = t?.progress?.[x.key];
            return (
              <li key={x.key} className={`rounded-xl border p-3 ${ok ? "border-green bg-green-soft" : "border-line bg-surface-2"}`}>
                <span className="text-xs font-bold text-muted">Schritt {i + 1}</span>
                <p className="font-bold">
                  {ok ? "✓ " : x.icon + " "}
                  {x.label}
                </p>
                <p className="bn text-sm text-muted">{x.bn}</p>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-sm text-muted">
          {t?.due_word_ids.length ?? 0} cards to review · {t?.new_word_ids.length ?? 0} new words · quiz pass mark {t?.mission?.pass_pct ?? 70}%
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="card">
          <p className="eyebrow">Deine Serie</p>
          <p className="font-display text-4xl font-extrabold">🔥 {t?.streak ?? 0}</p>
          <p className="text-sm text-muted">
            days in a row · one missed day per week is forgiven <span className="bn">(সপ্তাহে ১ দিন মাফ)</span>
          </p>
        </section>
        <section className="card">
          <p className="eyebrow">Wörter</p>
          <p className="font-display text-4xl font-extrabold">{s?.mastered ?? 0}</p>
          <p className="text-sm text-muted">
            words remembered 21+ days · {s?.words_learned ?? 0} started · {s?.due_today ?? 0} due today
          </p>
        </section>
        <section className="card">
          <p className="eyebrow">Team heute</p>
          <p className="font-display text-4xl font-extrabold">
            {teamDone}/{o?.members.length ?? 0}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {o?.members.map((m) => (
              <span key={m.user_id} title={m.display_name} className={`grid h-8 w-8 place-items-center rounded-full border-2 ${m.done_today ? "border-green" : "border-line opacity-50"}`}>
                {m.avatar_emoji}
              </span>
            ))}
          </div>
          <p className="mt-1 text-sm text-muted">
            Team streak 🔥 {o?.team_streak ?? 0}. <Link href="/team" className="font-bold text-blue">Nudge the others →</Link>
          </p>
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/review" className="card hover:border-blue">
          <p className="font-bold">🔁 Extra review</p>
          <p className="text-sm text-muted">Due cards outside the mission</p>
        </Link>
        <Link href="/learn" className="card hover:border-blue">
          <p className="font-bold">📘 Lessons & stories</p>
          <p className="text-sm text-muted">Read texts, word lists, memory stories</p>
        </Link>
        <Link href="/exams" className="card hover:border-blue">
          <p className="font-bold">📝 Exams</p>
          <p className="text-sm text-muted">Open and upcoming tests</p>
        </Link>
      </div>
    </div>
  );
}
