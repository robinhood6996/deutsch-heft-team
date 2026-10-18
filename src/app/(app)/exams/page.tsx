import Link from "next/link";
import { requireMember } from "@/lib/session";
import type { Exam } from "@/lib/types";

type MyAttempt = { id: string; exam_id: string; submitted_at: string | null; score: number | null; total: number; auto_submitted: boolean };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function ExamsPage() {
  const { supabase, user, isLeader } = await requireMember();
  const [{ data: exams }, { data: attempts }] = await Promise.all([
    supabase.from("exams").select("*").order("opens_at", { ascending: false }).limit(60),
    supabase.from("exam_attempts").select("id, exam_id, submitted_at, score, total, auto_submitted").eq("user_id", user.id),
  ]);
  const mine = new Map(((attempts ?? []) as MyAttempt[]).map((a) => [a.exam_id, a]));
  const now = Date.now();
  const list = (exams ?? []) as Exam[];
  const open = list.filter((e) => new Date(e.opens_at).getTime() <= now && new Date(e.closes_at).getTime() > now);
  const upcoming = list.filter((e) => new Date(e.opens_at).getTime() > now).reverse();
  const past = list.filter((e) => new Date(e.closes_at).getTime() <= now);

  const row = (e: Exam) => {
    const a = mine.get(e.id);
    const isOpen = open.includes(e);
    return (
      <li key={e.id} className="card flex flex-wrap items-center gap-3 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold">{e.title}</p>
          <p className="text-sm text-muted">
            {e.num_questions} questions · {e.duration_min} min · {fmt(e.opens_at)} → {fmt(e.closes_at)}
          </p>
        </div>
        {a?.submitted_at ? (
          <Link href={`/exams/result/${a.id}`} className="chip border-green text-green">
            ✓ {a.score}/{a.total} {a.auto_submitted && "· auto"}
          </Link>
        ) : isOpen ? (
          <Link href={`/exams/${e.id}`} className="btn-gold">
            {a ? "Fortsetzen" : "Starten"}
          </Link>
        ) : upcoming.includes(e) ? (
          <span className="chip">🔒 opens {fmt(e.opens_at)}</span>
        ) : (
          <span className="chip text-red">missed</span>
        )}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Prüfungen · পরীক্ষা</p>
          <h1 className="text-3xl font-extrabold">Prüfungen</h1>
          <p className="text-muted">The leader sets the exams. Each one opens for a time window. Once you start, the clock runs.</p>
        </div>
        {isLeader && (
          <Link href="/leader/exams" className="btn">
            + Neue Prüfung
          </Link>
        )}
      </header>
      {open.length > 0 && (
        <section>
          <h2 className="mb-2 text-xl font-extrabold">🟢 Jetzt offen · এখন খোলা</h2>
          <ul className="flex flex-col gap-2">{open.map(row)}</ul>
        </section>
      )}
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-2 text-xl font-extrabold">🗓️ Demnächst · আসছে</h2>
          <ul className="flex flex-col gap-2">{upcoming.map(row)}</ul>
        </section>
      )}
      <section>
        <h2 className="mb-2 text-xl font-extrabold">Vorbei · শেষ</h2>
        <ul className="flex flex-col gap-2">{past.map(row)}</ul>
        {!past.length && <p className="text-muted">No past exams yet.</p>}
      </section>
    </div>
  );
}
