import Link from "next/link";
import { requireMember } from "@/lib/session";
import type { Chapter } from "@/lib/types";
import { Progress } from "@/components/ui";

export default async function LearnIndex() {
  const { supabase, user } = await requireMember();
  const [{ data: chapters }, { data: lessons }, { data: words }, { data: mine }] = await Promise.all([
    supabase.from("chapters").select("*").order("sort"),
    supabase.from("lessons").select("id, chapter_id"),
    supabase.from("words").select("id, chapter_id").limit(5000),
    supabase.from("user_words").select("word_id, interval_days, words(chapter_id)").eq("user_id", user.id).limit(5000),
  ]);
  const count = (rows: { chapter_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.chapter_id === id).length;
  const myRows = (mine ?? []) as unknown as { interval_days: number; words: { chapter_id: string } }[];

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="eyebrow">Alle Kapitel · সব অধ্যায়</p>
        <h1 className="text-3xl font-extrabold">Lernen</h1>
        <p className="text-muted">Open any chapter to read the texts, see the word list and the memory story. Your daily mission picks the lesson for you.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {((chapters ?? []) as Chapter[]).map((c) => {
          const total = count(words, c.id);
          const learned = myRows.filter((r) => r.words?.chapter_id === c.id).length;
          const mastered = myRows.filter((r) => r.words?.chapter_id === c.id && r.interval_days >= 21).length;
          return (
            <Link key={c.id} href={`/learn/${c.id}`} className="card flex flex-col gap-2 transition hover:border-blue">
              <span className="chip self-start">{c.kind === "course" ? "📘 Kurs" : "📗 Vocabulary Project"}</span>
              <h2 className="text-2xl font-extrabold">{c.title}</h2>
              <p className="bn text-muted">{c.bn_title}</p>
              <p className="text-sm text-muted">
                {count(lessons, c.id)} lessons · {total} words
              </p>
              <Progress value={learned} max={total} />
              <p className="text-sm tabular-nums">
                {learned} / {total} learned · {mastered} mastered
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
