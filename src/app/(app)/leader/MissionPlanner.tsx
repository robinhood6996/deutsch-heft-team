"use client";
import { useMemo, useState } from "react";
import { useAppRouter } from "@/lib/progress";
import { LoadingButton } from "@/components/LoadingButton";
import type { Chapter, Lesson, Mission } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase/client";

const addDays = (d: string, n: number) => {
  const x = new Date(d + "T12:00:00Z");
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

/**
 * The leader assigns the daily lesson. One lesson can cover several days:
 * each day the mission takes the next unlearned words from it.
 */
export function MissionPlanner({ chapters, lessons, missions, teamId, today }: { chapters: Chapter[]; lessons: Lesson[]; missions: Mission[]; teamId: string; today: string }) {
  const router = useAppRouter();
  const [day, setDay] = useState(today);
  const [repeat, setRepeat] = useState(1);
  const [lessonId, setLessonId] = useState<string>(missions.find((m) => m.day === today)?.lesson_id ?? "");
  const [newWords, setNewWords] = useState(8);
  const [reviewCap, setReviewCap] = useState(30);
  const [quizSize, setQuizSize] = useState(10);
  const [passPct, setPassPct] = useState(70);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const titleOf = useMemo(() => new Map(lessons.map((l) => [l.id, l.title])), [lessons]);

  function load(m: Mission) {
    setDay(m.day);
    setRepeat(1);
    setLessonId(m.lesson_id ?? "");
    setNewWords(m.new_words);
    setReviewCap(m.review_cap);
    setQuizSize(m.quiz_size);
    setPassPct(m.pass_pct);
    setNote(m.note);
  }

  async function save() {
    setBusy(true);
    setMsg("");
    const rows = Array.from({ length: repeat }, (_, i) => ({
      team_id: teamId,
      day: addDays(day, i),
      lesson_id: lessonId || null,
      new_words: newWords,
      review_cap: reviewCap,
      quiz_size: quizSize,
      pass_pct: passPct,
      note,
    }));
    const { error } = await supabaseBrowser().from("daily_missions").upsert(rows, { onConflict: "team_id,day" });
    setBusy(false);
    if (error) return setMsg("❌ " + error.message);
    setMsg(`✅ Saved ${rows.length} day${rows.length > 1 ? "s" : ""}`);
    router.refresh();
  }

  const num = (v: number, set: (n: number) => void, min: number, max: number) => (
    <input type="number" className="input" min={min} max={max} value={v} onChange={(e) => set(Math.max(min, Math.min(max, Number(e.target.value) || 0)))} />
  );

  return (
    <section>
      <h2 className="mb-1 text-xl font-extrabold">Tagesmission planen · দৈনিক মিশন ঠিক করো</h2>
      <p className="mb-2 text-sm text-muted">
        Pick the lesson and how strict the day is. Without a plan the app follows the focus chapter in order. Each member gets the next words they
        have not learned yet from this lesson.
      </p>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card grid gap-3 sm:grid-cols-2">
          <label>
            <span className="label">Start day</span>
            <input type="date" className="input" min={today} value={day} onChange={(e) => setDay(e.target.value)} />
          </label>
          <label>
            <span className="label">For how many days</span>
            {num(repeat, setRepeat, 1, 14)}
          </label>
          <label className="sm:col-span-2">
            <span className="label">Lesson · পাঠ</span>
            <select className="input" value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
              <option value="">Automatic (next lesson in the focus chapter)</option>
              {chapters.map((c) => (
                <optgroup key={c.id} label={c.title}>
                  {lessons
                    .filter((l) => l.chapter_id === c.id)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title} · {l.en_title}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            <span className="label">New words per day</span>
            {num(newWords, setNewWords, 0, 30)}
          </label>
          <label>
            <span className="label">Max review cards</span>
            {num(reviewCap, setReviewCap, 0, 100)}
          </label>
          <label>
            <span className="label">Quiz questions</span>
            {num(quizSize, setQuizSize, 5, 30)}
          </label>
          <label>
            <span className="label">Pass mark %</span>
            {num(passPct, setPassPct, 0, 100)}
          </label>
          <label className="sm:col-span-2">
            <span className="label">Note for the team (shown on Today)</span>
            <input className="input" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Heute: Berufe! Lest den Text zweimal laut." />
          </label>
          <div className="flex items-center gap-3 sm:col-span-2">
            <LoadingButton className="btn" loading={busy || router.pending} loadingText="Speichern …" onClick={save}>
              Speichern
            </LoadingButton>
            {msg && <span className="text-sm">{msg}</span>}
          </div>
        </div>
        <div className="card">
          <h3 className="mb-2 font-extrabold">Geplant · পরিকল্পনা</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {missions.map((m) => (
              <li key={m.id}>
                <button className="w-full rounded-lg px-2 py-1 text-left hover:bg-surface-2" onClick={() => load(m)}>
                  <b className="tabular-nums">{m.day === today ? "Heute" : m.day}</b> · {m.lesson_id ? titleOf.get(m.lesson_id) : "auto"} · {m.new_words} new · pass {m.pass_pct}%
                  {m.note && <span className="block truncate text-xs text-muted">“{m.note}”</span>}
                </button>
              </li>
            ))}
            {!missions.length && <li className="text-muted">Nothing planned yet.</li>}
          </ul>
        </div>
      </div>
    </section>
  );
}
