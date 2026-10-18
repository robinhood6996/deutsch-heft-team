import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/session";
import type { Chapter, Lesson, Word } from "@/lib/types";
import { byTopic } from "@/lib/german";
import { ArticleText, SpeakButton } from "@/components/ui";
import { StoryCard } from "@/components/StoryCard";

export default async function ChapterPage({ params }: { params: Promise<{ chapter: string }> }) {
  const { chapter: id } = await params;
  const { supabase, user } = await requireMember();
  const [{ data: chapter }, { data: lessons }, { data: words }, { data: mine }] = await Promise.all([
    supabase.from("chapters").select("*").eq("id", id).maybeSingle(),
    supabase.from("lessons").select("*").eq("chapter_id", id).order("sort"),
    supabase.from("words").select("*").eq("chapter_id", id).order("sort").limit(3000),
    supabase.from("user_words").select("word_id, interval_days").eq("user_id", user.id).limit(5000),
  ]);
  if (!chapter) notFound();
  const c = chapter as Chapter;
  const known = new Map((mine ?? []).map((r) => [r.word_id as string, r.interval_days as number]));
  const groups = byTopic((words ?? []) as Word[]);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <Link href="/learn" className="text-sm font-bold text-blue">
          ← Alle Kapitel
        </Link>
        <h1 className="text-3xl font-extrabold">{c.title}</h1>
        <p className="bn text-muted">{c.bn_title}</p>
      </header>

      <section>
        <h2 className="mb-2 text-xl font-extrabold">Lektionen · পাঠ</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {((lessons ?? []) as Lesson[]).map((l, i) => (
            <Link key={l.id} href={`/learn/${c.id}/${l.id}`} className="card flex items-center gap-3 py-3 transition hover:border-blue">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-soft font-extrabold text-blue">{i + 1}</span>
              <span>
                <span className="block font-bold">{l.title}</span>
                <span className="block text-sm text-muted">
                  {l.en_title} · <span className="bn">{l.bn_title}</span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {c.story && <StoryCard story={c.story} words={(words ?? []) as Word[]} />}

      <section>
        <h2 className="mb-1 text-xl font-extrabold">Wortliste nach Thema · বিষয়ভিত্তিক শব্দ</h2>
        <p className="mb-3 text-sm text-muted">
          <span className="art-der font-bold">der</span> blue · <span className="art-die font-bold">die</span> red ·{" "}
          <span className="art-das font-bold">das</span> green. ● learned · ★ mastered
        </p>
        <div className="flex flex-col gap-4">
          {groups.map(([topic, ws]) => (
            <div key={topic} className="card">
              <h3 className="mb-2 font-extrabold">{topic}</h3>
              <ul className="divide-y divide-line">
                {ws.map((w) => {
                  const k = known.get(w.id);
                  return (
                    <li key={w.id} className="flex items-center gap-3 py-2">
                      <span className="w-6 text-center text-lg" aria-hidden>
                        {w.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <ArticleText de={w.de} className="font-bold" />
                        {w.say && <span className="bn ml-2 text-sm text-blue">{w.say}</span>}
                        <p className="text-sm text-muted">
                          {w.en} · <span className="bn">{w.bn}</span>
                        </p>
                        {w.mnemonic && <p className="bn text-sm">💡 {w.mnemonic}</p>}
                      </div>
                      <span className={`text-sm ${k === undefined ? "text-line" : k >= 21 ? "text-gold" : "text-green"}`} title={k === undefined ? "new" : k >= 21 ? "mastered" : "learned"}>
                        {k !== undefined && k >= 21 ? "★" : "●"}
                      </span>
                      <SpeakButton text={w.de} />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
