"use client";
import { useEffect, useMemo, useState } from "react";
import type { Word } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase/client";
import { speak } from "@/lib/speech";
import { ArticleText, Progress, SpeakButton, articleFrame } from "./ui";
import { WordVisual } from "./WordVisual";
import { LoadingButton } from "./LoadingButton";
import { Spinner } from "./Spinner";

const GRADES = [
  { g: 0, label: "Nochmal", bn: "ভুলে গেছি", cls: "bg-red-soft border-red text-red" },
  { g: 1, label: "Schwer", bn: "কঠিন", cls: "bg-gold-soft border-gold-bg" },
  { g: 2, label: "Gut", bn: "পেরেছি", cls: "bg-blue-soft border-blue text-blue" },
  { g: 3, label: "Leicht", bn: "সহজ", cls: "bg-green-soft border-green text-green" },
];

/**
 * Spaced-repetition review. Each card: see the German, try to recall the meaning,
 * reveal, then grade yourself. "Nochmal" cards come back once more at the end.
 */
export function ReviewSession({ words, onDone }: { words: Word[]; onDone: (stats: { reviewed: number; correct: number }) => void | Promise<void> }) {
  const [queue, setQueue] = useState<Word[]>(words);
  const [shown, setShown] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [requeued, setRequeued] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<number | null>(null);
  const total = useMemo(() => words.length, [words]);
  const card = queue[0];

  useEffect(() => {
    if (card) speak(card.de);
  }, [card]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card || busy !== null) return;
      if (!shown && (e.code === "Space" || e.key === "Enter")) {
        e.preventDefault();
        setShown(true);
      } else if (shown && ["1", "2", "3", "4"].includes(e.key)) grade(Number(e.key) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!card) {
    return (
      <div className="card text-center">
        <p className="hand text-5xl text-green">Fertig!</p>
        <p className="mt-2">
          {reviewed} cards reviewed · {correct} remembered
        </p>
        <LoadingButton className="btn mt-4" loadingText="Speichern …" onClick={() => onDone({ reviewed, correct })}>
          Weiter →
        </LoadingButton>
      </div>
    );
  }

  async function grade(g: number) {
    setBusy(g);
    await supabaseBrowser().rpc("review_word", { p_word: card.id, p_grade: g });
    setBusy(null);
    setReviewed((n) => n + 1);
    if (g > 0) setCorrect((n) => n + 1);
    setShown(false);
    setQueue((q) => {
      const rest = q.slice(1);
      if (g === 0 && !requeued.has(card.id)) {
        setRequeued((s) => new Set(s).add(card.id));
        return [...rest, card];
      }
      return rest;
    });
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-2 flex justify-between text-sm text-muted tabular-nums">
        <span>
          {Math.min(reviewed + 1, total + requeued.size)} / {total + requeued.size}
        </span>
        <span>Space = show · 1–4 = grade</span>
      </div>
      <Progress value={reviewed} max={total + requeued.size} className="mb-4" />
      <div className={`card flex min-h-72 flex-col items-center justify-center gap-3 border-4 text-center ${articleFrame(card.de)}`}>
        <WordVisual word={card} size={88} />
        <div className="flex items-center gap-2">
          <ArticleText de={card.de} className="font-display text-3xl font-extrabold" />
          <SpeakButton text={card.de} />
        </div>
        {card.say && <p className="bn text-blue">উচ্চারণ: {card.say}</p>}
        {shown ? (
          <div className="mt-2 flex flex-col gap-1">
            <p className="text-xl font-bold">{card.en}</p>
            <p className="bn text-lg">{card.bn}</p>
            {card.mnemonic && <p className="bn mt-1 rounded-lg bg-gold-soft px-3 py-1.5 text-sm">💡 {card.mnemonic}</p>}
            {!card.mnemonic && card.tip && <p className="mt-1 rounded-lg bg-gold-soft px-3 py-1.5 text-sm">💡 {card.tip}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted">What does it mean? Say it in Bangla, then check. · মানেটা মনে করো, তারপর দেখো।</p>
        )}
      </div>
      {shown ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {GRADES.map((x) => (
            <button
              key={x.g}
              disabled={busy !== null}
              aria-busy={busy === x.g || undefined}
              onClick={() => grade(x.g)}
              className={`rounded-xl border-2 px-2 py-2 font-bold ${x.cls} ${busy !== null && busy !== x.g ? "opacity-50" : ""}`}
            >
              <span className="inline-flex items-center gap-1">
                {busy === x.g && <Spinner className="h-3.5 w-3.5" />}
                {x.label}
              </span>
              <span className="bn block text-xs font-normal">{x.bn}</span>
            </button>
          ))}
        </div>
      ) : (
        <button className="btn mt-3 w-full text-lg" onClick={() => setShown(true)}>
          Antwort zeigen · উত্তর দেখাও
        </button>
      )}
    </div>
  );
}
