import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/session";
import type { Lesson, Sentence, Word } from "@/lib/types";
import { LessonTabs } from "./LessonTabs";

export default async function LessonPage({ params }: { params: Promise<{ chapter: string; lesson: string }> }) {
  const { chapter, lesson: id } = await params;
  const { supabase, user } = await requireMember();
  const [{ data: lesson }, { data: sentences }, { data: links }, { data: siblings }] = await Promise.all([
    supabase.from("lessons").select("*").eq("id", id).maybeSingle(),
    supabase.from("sentences").select("*").eq("lesson_id", id).order("idx"),
    supabase.from("word_lessons").select("words(*)").eq("lesson_id", id),
    supabase.from("lessons").select("id, title, sort").eq("chapter_id", chapter).order("sort"),
  ]);
  if (!lesson || (lesson as Lesson).chapter_id !== chapter) notFound();
  const words = ((links ?? []) as unknown as { words: Word }[]).map((r) => r.words).filter(Boolean).sort((a, b) => a.sort - b.sort);
  const { data: mine } = await supabase
    .from("user_words")
    .select("word_id")
    .eq("user_id", user.id)
    .in("word_id", words.length ? words.map((w) => w.id) : ["-"]);
  const known = (mine ?? []).map((r) => r.word_id as string);

  const list = siblings ?? [];
  const pos = list.findIndex((l) => l.id === id);
  const prev = list[pos - 1];
  const next = list[pos + 1];
  const l = lesson as Lesson;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <Link href={`/learn/${chapter}`} className="text-sm font-bold text-blue">
          ← Kapitel
        </Link>
        <p className="eyebrow mt-1">
          Lektion {pos + 1} / {list.length}
        </p>
        <h1 className="text-3xl font-extrabold">{l.title}</h1>
        <p className="text-muted">
          {l.en_title} · <span className="bn">{l.bn_title}</span>
        </p>
      </header>
      <LessonTabs lesson={l} sentences={(sentences ?? []) as Sentence[]} words={words} known={known} />
      <nav className="flex justify-between gap-2">
        {prev ? (
          <Link className="btn-ghost" href={`/learn/${chapter}/${prev.id}`}>
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link className="btn-ghost" href={`/learn/${chapter}/${next.id}`}>
            {next.title} →
          </Link>
        )}
      </nav>
    </div>
  );
}
