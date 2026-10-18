import type { SupabaseClient } from "@supabase/supabase-js";
import type { Story } from "./types";

export type Bundle = {
  chapters?: { id: string; kind: "course" | "vocab"; title: string; subtitle?: string; bn_title?: string; sort?: number; story?: Story | null }[];
  lessons?: { id: string; chapter_id: string; num: number; title: string; en_title?: string; bn_title?: string; kind: string; sort?: number; notes_html?: string; exercises?: unknown }[];
  sentences?: { lesson_id: string; idx: number; de: string; en?: string; bn?: string; say?: string; emoji?: string; tip?: string; grp?: string; is_list?: boolean }[];
  words?: { id: string; chapter_id: string; kind?: string; de: string; en: string; bn?: string; say?: string; topic?: string; emoji?: string; tip?: string; mnemonic?: string; image_url?: string; lessons?: string[] }[];
  stories?: Record<string, Story>;
  mnemonics?: Record<string, string>;
  images?: Record<string, string>;
};

const chunks = <T,>(a: T[], n = 300) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

/** Upsert a content bundle (same shape as content/content.json). Needs the service-role client. */
export async function importBundle(db: SupabaseClient, b: Bundle) {
  const log: string[] = [];
  const must = async (p: PromiseLike<{ error: { message: string } | null }>, what: string) => {
    const { error } = await p;
    if (error) throw new Error(`${what}: ${error.message}`);
  };

  if (b.chapters?.length) {
    await must(
      db.from("chapters").upsert(
        b.chapters.map((c) => ({ id: c.id, kind: c.kind, title: c.title, subtitle: c.subtitle ?? "", bn_title: c.bn_title ?? "", sort: c.sort ?? 0, ...(c.story !== undefined ? { story: c.story } : {}) })),
      ),
      "chapters",
    );
    log.push(`${b.chapters.length} chapters`);
  }
  for (const [id, story] of Object.entries(b.stories ?? {})) {
    await must(db.from("chapters").update({ story }).eq("id", id), `story ${id}`);
    log.push(`story for ${id}`);
  }
  if (b.lessons?.length) {
    await must(
      db.from("lessons").upsert(
        b.lessons.map((l) => ({
          id: l.id,
          chapter_id: l.chapter_id,
          num: l.num,
          title: l.title,
          en_title: l.en_title ?? "",
          bn_title: l.bn_title ?? "",
          kind: l.kind,
          sort: l.sort ?? l.num,
          notes_html: l.notes_html ?? "",
          exercises: l.exercises ?? null,
        })),
      ),
      "lessons",
    );
    log.push(`${b.lessons.length} lessons`);
  }
  if (b.sentences?.length) {
    const lessonIds = [...new Set(b.sentences.map((s) => s.lesson_id))];
    await must(db.from("sentences").delete().in("lesson_id", lessonIds), "clear sentences");
    for (const c of chunks(b.sentences)) {
      await must(
        db.from("sentences").insert(
          c.map((s) => ({ lesson_id: s.lesson_id, idx: s.idx, de: s.de, en: s.en ?? "", bn: s.bn ?? "", say: s.say ?? "", emoji: s.emoji ?? "", tip: s.tip ?? "", grp: s.grp ?? "", is_list: !!s.is_list })),
        ),
        "sentences",
      );
    }
    log.push(`${b.sentences.length} sentences`);
  }
  if (b.words?.length) {
    const { data: maxRow } = await db.from("words").select("sort").order("sort", { ascending: false }).limit(1).maybeSingle();
    let sort = (maxRow?.sort ?? 0) + 1;
    for (const c of chunks(b.words)) {
      await must(
        db.from("words").upsert(
          c.map((w) => ({
            id: w.id,
            chapter_id: w.chapter_id,
            kind: w.kind ?? "word",
            de: w.de,
            en: w.en,
            bn: w.bn ?? "",
            say: w.say ?? "",
            topic: w.topic ?? "",
            emoji: w.emoji ?? "",
            tip: w.tip ?? "",
            ...(w.mnemonic ? { mnemonic: w.mnemonic } : {}),
            ...(w.image_url ? { image_url: w.image_url } : {}),
            sort: sort++,
          })),
        ),
        "words",
      );
    }
    const links = b.words.flatMap((w) => (w.lessons ?? []).map((l) => ({ word_id: w.id, lesson_id: l })));
    if (links.length) {
      await must(db.from("word_lessons").delete().in("word_id", b.words.map((w) => w.id)), "clear links");
      for (const c of chunks(links, 500)) await must(db.from("word_lessons").upsert(c), "word links");
    }
    log.push(`${b.words.length} words, ${links.length} links`);
  }
  for (const [id, mnemonic] of Object.entries(b.mnemonics ?? {})) await must(db.from("words").update({ mnemonic }).eq("id", id), `mnemonic ${id}`);
  if (b.mnemonics) log.push(`${Object.keys(b.mnemonics).length} mnemonics`);
  for (const [id, image_url] of Object.entries(b.images ?? {})) await must(db.from("words").update({ image_url }).eq("id", id), `image ${id}`);
  if (b.images) log.push(`${Object.keys(b.images).length} images`);
  return log;
}
