"use client";
import { useState } from "react";
import { useAppRouter } from "@/lib/progress";
import { LoadingButton } from "@/components/LoadingButton";
import type { Chapter, Lesson } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase/client";

const TYPES = [
  ["meaning", "Meaning (German → choose meaning)"],
  ["german", "Write the German word"],
  ["article", "der / die / das"],
  ["listen", "Listening"],
] as const;

/** datetime-local value in Dhaka time → ISO */
const dhakaToIso = (local: string) => new Date(local + ":00+06:00").toISOString();
const nowDhakaLocal = () => {
  const d = new Date(Date.now() + 6 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
};

export function ExamPlanner({ teamId, chapters, lessons }: { teamId: string; chapters: Chapter[]; lessons: Lesson[] }) {
  const router = useAppRouter();
  const [title, setTitle] = useState("Wochentest");
  const [scopeChapters, setScopeChapters] = useState<string[]>([]);
  const [scopeLessons, setScopeLessons] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>(["meaning", "german", "article", "listen"]);
  const [num, setNum] = useState(20);
  const [duration, setDuration] = useState(15);
  const [opens, setOpens] = useState(nowDhakaLocal());
  const [windowH, setWindowH] = useState(24);
  const [maxV, setMaxV] = useState(3);
  const [fs, setFs] = useState(true);
  const [every, setEvery] = useState(0); // 0 = once, 3 = every 3 days, 7 = weekly
  const [times, setTimes] = useState(4);
  const [msg, setMsg] = useState("");
  const [, setBusy] = useState(false);

  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  async function create(now = false) {
    setMsg("");
    if (!scopeChapters.length && !scopeLessons.length) return setMsg("❌ Pick at least one chapter or lesson.");
    if (!types.length) return setMsg("❌ Pick at least one question type.");
    setBusy(true);
    const start = now ? new Date() : new Date(dhakaToIso(opens));
    const count = every ? times : 1;
    const rows = Array.from({ length: count }, (_, i) => {
      const o = new Date(start.getTime() + i * every * 86400000);
      return {
        team_id: teamId,
        title: count > 1 ? `${title} #${i + 1}` : title,
        scope: { chapters: scopeChapters, lessons: scopeLessons },
        question_types: types,
        num_questions: num,
        duration_min: duration,
        opens_at: o.toISOString(),
        closes_at: new Date(o.getTime() + windowH * 3600000).toISOString(),
        max_violations: maxV,
        require_fullscreen: fs,
      };
    });
    const { error } = await supabaseBrowser().from("exams").insert(rows);
    setBusy(false);
    if (error) return setMsg("❌ " + error.message);
    setMsg(`✅ ${rows.length} exam${rows.length > 1 ? "s" : ""} scheduled`);
    router.refresh();
  }

  const n = (v: number, set: (x: number) => void, min: number, max: number) => (
    <input type="number" className="input" min={min} max={max} value={v} onChange={(e) => set(Math.max(min, Math.min(max, Number(e.target.value) || min)))} />
  );

  return (
    <section className="card grid gap-4">
      <h2 className="text-xl font-extrabold">Neue Prüfung · নতুন পরীক্ষা</h2>
      <label>
        <span className="label">Title</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <div>
        <span className="label">Scope: whole chapters or single lessons · কোন অংশ থেকে প্রশ্ন</span>
        <div className="grid gap-3 sm:grid-cols-3">
          {chapters.map((c) => (
            <div key={c.id} className="rounded-xl border border-line p-2">
              <label className="flex items-center gap-2 font-bold">
                <input type="checkbox" checked={scopeChapters.includes(c.id)} onChange={() => toggle(scopeChapters, setScopeChapters, c.id)} />
                {c.title} (all)
              </label>
              <div className="mt-1 flex flex-col gap-0.5 pl-5 text-sm">
                {lessons
                  .filter((l) => l.chapter_id === c.id)
                  .map((l) => (
                    <label key={l.id} className={`flex items-center gap-2 ${scopeChapters.includes(c.id) ? "opacity-40" : ""}`}>
                      <input
                        type="checkbox"
                        disabled={scopeChapters.includes(c.id)}
                        checked={scopeLessons.includes(l.id)}
                        onChange={() => toggle(scopeLessons, setScopeLessons, l.id)}
                      />
                      {l.title}
                    </label>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Question types</span>
        <div className="flex flex-wrap gap-3">
          {TYPES.map(([id, label]) => (
            <label key={id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={types.includes(id)} onChange={() => toggle(types, setTypes, id)} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <label>
          <span className="label">Questions</span>
          {n(num, setNum, 5, 60)}
        </label>
        <label>
          <span className="label">Minutes</span>
          {n(duration, setDuration, 3, 120)}
        </label>
        <label>
          <span className="label">Max warnings</span>
          {n(maxV, setMaxV, 1, 10)}
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" checked={fs} onChange={(e) => setFs(e.target.checked)} /> Full screen
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <label className="sm:col-span-2">
          <span className="label">Opens at (Dhaka time)</span>
          <input type="datetime-local" className="input" value={opens} onChange={(e) => setOpens(e.target.value)} />
        </label>
        <label>
          <span className="label">Open for (hours)</span>
          {n(windowH, setWindowH, 1, 168)}
        </label>
        <label>
          <span className="label">Repeat</span>
          <select className="input" value={every} onChange={(e) => setEvery(Number(e.target.value))}>
            <option value={0}>Once</option>
            <option value={1}>Every day</option>
            <option value={3}>Every 3 days</option>
            <option value={7}>Every week</option>
          </select>
        </label>
        {every > 0 && (
          <label>
            <span className="label">How many times</span>
            {n(times, setTimes, 2, 12)}
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <LoadingButton className="btn" loadingText="Speichern …" onClick={() => create(false)}>
          Planen
        </LoadingButton>
        <LoadingButton className="btn-gold" loadingText="Startet …" onClick={() => create(true)}>
          ⚡ Jetzt starten
        </LoadingButton>
        {msg && <span className="text-sm">{msg}</span>}
      </div>
      <p className="text-xs text-muted">
        Every member gets different random questions from the scope. Answer keys stay on the server. Correct answers are shown to members after the window
        closes.
      </p>
    </section>
  );
}
