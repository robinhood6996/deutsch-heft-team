import Link from "next/link";
import { requireMember } from "@/lib/session";
import type { ExamQuestion } from "@/lib/types";
import { ArticleText } from "@/components/ui";

type Review =
  | { locked: true; closes_at: string; score: number; total: number }
  | { locked: false; questions: ExamQuestion[]; answers: string[]; keys: string[]; score: number; total: number; violations: number };

function prompt(q: ExamQuestion) {
  switch (q.type) {
    case "meaning":
    case "listen":
      return <ArticleText de={q.de} />;
    case "article":
      return `___ ${q.noun} (${q.en})`;
    default:
      return `${q.en} · ${q.bn}`;
  }
}

export default async function ExamResult({ params }: { params: Promise<{ attempt: string }> }) {
  const { attempt } = await params;
  const { supabase } = await requireMember();
  const [{ data, error }, { data: meta }] = await Promise.all([
    supabase.rpc("exam_review", { p_attempt: attempt }),
    supabase.from("exam_attempts").select("user_id, auto_submitted, exams(title)").eq("id", attempt).maybeSingle(),
  ]);
  const { data: who } = meta
    ? await supabase.from("profiles").select("display_name").eq("id", (meta as { user_id: string }).user_id).maybeSingle()
    : { data: null };
  if (error) return <p className="card text-red">{error.message}</p>;
  const r = data as Review;
  const m = meta as unknown as { auto_submitted: boolean; exams: { title: string } } | null;
  const pct = Math.round((r.score * 100) / Math.max(1, r.total));

  return (
    <div className="flex flex-col gap-4">
      <Link href="/exams" className="text-sm font-bold text-blue">
        ← Prüfungen
      </Link>
      <header className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Ergebnis · ফলাফল {who?.display_name ? `· ${who.display_name}` : ""}</p>
          <h1 className="text-2xl font-extrabold">{m?.exams?.title}</h1>
          {m?.auto_submitted && <p className="text-sm text-red">Submitted automatically</p>}
          {!r.locked && r.violations > 0 && <p className="text-sm text-red">⚠️ {r.violations} warnings</p>}
        </div>
        <p className={`text-4xl font-extrabold tabular-nums ${pct >= 70 ? "text-green" : "text-red"}`}>
          {r.score}/{r.total} <span className="text-xl">({pct}%)</span>
        </p>
      </header>
      {r.locked ? (
        <p className="card">
          The correct answers appear when the exam window closes ({new Date(r.closes_at).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}), so nobody can share
          them early. · <span className="bn">সবার পরীক্ষা শেষ হলে সঠিক উত্তর দেখা যাবে।</span>
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {r.questions.map((q, i) => {
            const ans = r.answers[i] ?? "";
            const key = r.keys[i];
            const right = q.type === "german" ? null : ans === key;
            const label = (id: string) => (q.type === "meaning" || q.type === "listen" ? q.options.find((o) => o.id === id)?.en ?? id : id);
            return (
              <li key={i} className={`card py-3 ${right === false ? "border-red" : right ? "border-green" : ""}`}>
                <p className="text-xs text-muted">
                  {i + 1}. {q.type}
                </p>
                <p className="font-bold">
                  {prompt(q)}
                </p>
                <p className="text-sm">
                  Your answer: <b>{ans ? label(ans) : "—"}</b>
                  {" · "}Correct: <b className="text-green">{label(key)}</b>
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
