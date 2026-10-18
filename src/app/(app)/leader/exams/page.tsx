import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/session";
import type { Chapter, Exam, Lesson, TeamOverview } from "@/lib/types";
import { ExamPlanner } from "./ExamPlanner";
import { DeleteExam } from "./DeleteExam";

type Att = { id: string; exam_id: string; user_id: string; submitted_at: string | null; score: number | null; total: number; violations: number; auto_submitted: boolean };

const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function LeaderExams() {
  const { supabase, isLeader, teamId } = await requireMember();
  if (!isLeader) redirect("/exams");
  const [{ data: exams }, { data: chapters }, { data: lessons }, { data: ov }] = await Promise.all([
    supabase.from("exams").select("*").order("opens_at", { ascending: false }).limit(40),
    supabase.from("chapters").select("*").order("sort"),
    supabase.from("lessons").select("id, chapter_id, title, en_title, sort").order("sort"),
    supabase.rpc("team_overview"),
  ]);
  const list = (exams ?? []) as Exam[];
  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select("id, exam_id, user_id, submitted_at, score, total, violations, auto_submitted")
    .in("exam_id", list.length ? list.map((e) => e.id) : ["00000000-0000-0000-0000-000000000000"]);
  const members = (ov as TeamOverview).members;
  const byExam = new Map<string, Att[]>();
  for (const a of (attempts ?? []) as Att[]) byExam.set(a.exam_id, [...(byExam.get(a.exam_id) ?? []), a]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link href="/leader" className="text-sm font-bold text-blue">
          ← Dashboard
        </Link>
        <h1 className="text-3xl font-extrabold">Prüfungen planen · পরীক্ষা ঠিক করো</h1>
      </header>
      <ExamPlanner teamId={teamId} chapters={(chapters ?? []) as Chapter[]} lessons={(lessons ?? []) as Lesson[]} />
      <section>
        <h2 className="mb-2 text-xl font-extrabold">Ergebnisse · ফলাফল</h2>
        <div className="flex flex-col gap-3">
          {list.map((e) => {
            const as = byExam.get(e.id) ?? [];
            const done = as.filter((a) => a.submitted_at);
            const avg = done.length ? Math.round(done.reduce((s, a) => s + ((a.score ?? 0) * 100) / Math.max(1, a.total), 0) / done.length) : null;
            return (
              <div key={e.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{e.title}</p>
                    <p className="text-sm text-muted">
                      {fmt(e.opens_at)} → {fmt(e.closes_at)} · {e.num_questions} q · {e.duration_min} min · {done.length}/{members.length} done
                      {avg !== null && ` · avg ${avg}%`}
                    </p>
                  </div>
                  <DeleteExam id={e.id} title={e.title} />
                </div>
                <table className="mt-2 w-full text-sm">
                  <tbody className="divide-y divide-line tabular-nums">
                    {members.map((m) => {
                      const a = as.find((x) => x.user_id === m.user_id);
                      return (
                        <tr key={m.user_id}>
                          <td className="py-1.5">
                            {m.avatar_emoji} {m.display_name}
                          </td>
                          <td className="py-1.5">
                            {!a ? (
                              <span className="text-muted">not started</span>
                            ) : !a.submitted_at ? (
                              <span className="text-gold">in progress</span>
                            ) : (
                              <Link href={`/exams/result/${a.id}`} className="font-bold text-blue underline">
                                {a.score}/{a.total} ({Math.round(((a.score ?? 0) * 100) / Math.max(1, a.total))}%)
                              </Link>
                            )}
                          </td>
                          <td className={`py-1.5 ${a?.violations ? "text-red" : "text-muted"}`}>{a ? `⚠️ ${a.violations}` : ""}</td>
                          <td className="py-1.5 text-red">{a?.auto_submitted ? "auto-submitted" : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
          {!list.length && <p className="text-muted">No exams yet.</p>}
        </div>
      </section>
    </div>
  );
}
