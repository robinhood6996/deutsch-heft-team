import type { Word } from "./types";

export type Article = "der" | "die" | "das";

/** Article of a single noun entry like "der Hund" (not "der Arzt / die Ärztin"). */
export function articleOf(de: string): Article | null {
  const m = de.match(/^(der|die|das) [^/,(]+$/);
  return m ? (m[1] as Article) : null;
}

/** First article in an entry, for colouring a card frame. */
export function firstArticle(de: string): Article | null {
  const m = de.match(/^(der|die|das)\s/);
  return m ? (m[1] as Article) : null;
}

/** Split an entry into text runs, marking each article so it can be coloured. */
export function articleRuns(de: string): { text: string; art?: Article }[] {
  const runs: { text: string; art?: Article }[] = [];
  const re = /(^|[\s(/])(der|die|das)(?= )/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(de))) {
    const start = m.index + m[1].length;
    if (start > last) runs.push({ text: de.slice(last, start) });
    runs.push({ text: m[2], art: m[2] as Article });
    last = start + m[2].length;
  }
  if (last < de.length) runs.push({ text: de.slice(last) });
  return runs;
}

export const WORD_RE = /([A-Za-zÄÖÜäöüßé]+(?:-[A-Za-zÄÖÜäöüßé]+)*)/;

/** Text split into [plain, word, plain, word, ...]: odd indexes are words. */
export const tokenize = (text: string) => text.split(WORD_RE);

/**
 * Build a lookup from every form likely to appear in a text to its dictionary entry:
 * base form, plural in brackets, both halves of "der Arzt / die Ärztin",
 * simple verb endings (-e, -st, -t, -et) and adjective endings.
 */
export function buildWordIndex(words: Word[], extra: Record<string, string> = {}) {
  const idx = new Map<string, Word>();
  const add = (k: string, w: Word) => {
    if (k && !idx.has(k)) idx.set(k, w);
  };
  for (const w of words) {
    const parens = [...w.de.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]);
    const main = w.de.replace(/\s*\([^)]*\)/g, "");
    const parts = main.split(/\s*[/,]\s*/).concat(parens.flatMap((p) => p.split(/\s*[/,]\s*/)));
    for (const part of parts) {
      const base = part.replace(/^(der|die|das)\s+/, "").replace(/[!?.]/g, "").trim();
      if (!base || /\s/.test(base)) continue;
      const k = base.toLowerCase();
      add(k, w);
      const isNoun = /^(der|die|das)\s/.test(part) || /^[A-ZÄÖÜ]/.test(base);
      if (!isNoun && /(en|ln|rn)$/.test(k) && w.en.startsWith("to ")) {
        const stem = k.endsWith("en") ? k.slice(0, -2) : k.slice(0, -1);
        [stem + "e", stem + "st", stem + "t", stem + "et", stem + "est"].forEach((f) => add(f, w));
      } else if (!isNoun) {
        [k + "e", k + "en", k + "er", k + "es", k + "em"].forEach((f) => add(f, w));
      }
    }
  }
  for (const [form, de] of Object.entries(extra)) {
    const w = words.find((x) => x.de === de);
    if (w) idx.set(form, w);
  }
  return idx;
}

export function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export const sameDe = (a: Word, b: Word) => a.de.trim().toLowerCase() === b.de.trim().toLowerCase();

// ------------------------------------------------------------------ quiz

export type QuizQuestion =
  | { kind: "de2en" | "listen"; word: Word; options: Word[] }
  | { kind: "en2de"; word: Word; options: Word[] }
  | { kind: "article"; word: Word; noun: string; answer: Article };

function distractors(word: Word, pool: Word[], n = 3) {
  const ok = (x: Word) => x.id !== word.id && !sameDe(x, word) && x.en !== word.en;
  let cands = pool.filter((x) => ok(x) && x.topic === word.topic);
  if (cands.length < n) cands = pool.filter(ok);
  const out: Word[] = [];
  for (const x of shuffle(cands)) {
    if (!out.some((o) => o.en === x.en || sameDe(o, x))) out.push(x);
    if (out.length === n) break;
  }
  return out;
}

/** Mixed quiz: meaning, reverse, listening and der/die/das questions. */
export function makeQuiz(targets: Word[], pool: Word[], size: number): QuizQuestion[] {
  const picks = shuffle(targets).slice(0, size);
  const kinds = ["de2en", "en2de", "article", "listen", "de2en", "en2de"] as const;
  return picks.map((word, i) => {
    let kind: (typeof kinds)[number] = kinds[i % kinds.length];
    const art = articleOf(word.de);
    if (kind === "article" && !art) kind = "de2en";
    if (kind === "article" && art) {
      return { kind, word, noun: word.de.replace(/^(der|die|das)\s+/, ""), answer: art };
    }
    const options = shuffle([word, ...distractors(word, pool)]);
    return { kind, word, options } as QuizQuestion;
  });
}

export const isCorrect = (q: QuizQuestion, answer: string) =>
  q.kind === "article" ? answer === q.answer : answer === q.word.id;

/** Today's date in the team's time zone (Asia/Dhaka), as YYYY-MM-DD. */
export const appToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

/** Group words by topic, keeping the first-seen topic order. */
export function byTopic(words: Word[]) {
  const map = new Map<string, Word[]>();
  for (const w of words) {
    const k = w.topic || "Andere";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(w);
  }
  return [...map.entries()];
}
