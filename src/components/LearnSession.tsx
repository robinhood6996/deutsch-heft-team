"use client";
import { useEffect, useState } from "react";
import type { Word } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase/client";
import { shuffle } from "@/lib/german";
import { speak } from "@/lib/speech";
import { ArticleText, Progress, SpeakButton, articleFrame, cheer } from "./ui";
import { WordVisual } from "./WordVisual";

type Step = { type: "show"; word: Word } | { type: "check"; word: Word; options: Word[] };

/**
 * Introduces new words one at a time (picture, sound, Bangla pronunciation,
 * memory trick), with a quick recall check after every few words.
 * Words are saved into the review schedule at the end.
 */
export function LearnSession({ words, pool, onDone }: { words: Word[]; pool: Word[]; onDone: (n: number) => void }) {
  const [steps] = useState<Step[]>(() => {
    const out: Step[] = [];
    const batch: Word[] = [];
    words.forEach((w, i) => {
      out.push({ type: "show", word: w });
      batch.push(w);
      if (batch.length === 4 || i === words.length - 1) {
        for (const b of shuffle(batch)) {
          const others = shuffle(pool.filter((x) => x.id !== b.id && x.en !== b.en)).slice(0, 3);
          out.push({ type: "check", word: b, options: shuffle([b, ...others]) });
        }
        batch.length = 0;
      }
    });
    return out;
  });
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const step = steps[i];

  useEffect(() => {
    setPicked(null);
    if (step?.type === "show") speak(step.word.de);
  }, [i, step]);

  async function finish() {
    setSaving(true);
    await supabaseBrowser().rpc("learn_words", { p_words: words.map((w) => w.id) });
    setSaving(false);
    onDone(words.length);
  }

  if (!step) {
    return (
      <div className="card text-center">
        <p className="hand text-5xl text-green">{cheer()}</p>
        <p className="mt-2">{words.length} new words added to your review schedule. You will see them again tomorrow.</p>
        <p className="bn text-muted">নতুন শব্দগুলো কাল আবার রিভিশনে আসবে।</p>
        <button className="btn mt-4" disabled={saving} onClick={finish}>
          {saving ? "…" : "Speichern & weiter →"}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <Progress value={i} max={steps.length} className="mb-4" />
      {step.type === "show" ? (
        <div className={`card flex flex-col items-center gap-3 border-4 text-center ${articleFrame(step.word.de)}`}>
          <span className="chip">Neues Wort · নতুন শব্দ</span>
          <WordVisual word={step.word} size={120} />
          <div className="flex items-center gap-2">
            <ArticleText de={step.word.de} className="font-display text-3xl font-extrabold" />
            <SpeakButton text={step.word.de} />
            <SpeakButton text={step.word.de} rate={0.55} label="Slow" className="text-xs" />
          </div>
          {step.word.say && <p className="bn text-lg text-blue">উচ্চারণ: {step.word.say}</p>}
          <p className="text-xl font-bold">{step.word.en}</p>
          <p className="bn text-lg">{step.word.bn}</p>
          {step.word.mnemonic && <p className="bn rounded-lg bg-gold-soft px-3 py-2">💡 {step.word.mnemonic}</p>}
          {!step.word.mnemonic && step.word.tip && <p className="rounded-lg bg-gold-soft px-3 py-2 text-sm">💡 {step.word.tip}</p>}
          <p className="text-sm text-muted">Say it out loud twice. · দুইবার জোরে বলো।</p>
          <button className="btn mt-1 w-full" onClick={() => setI(i + 1)}>
            Weiter →
          </button>
        </div>
      ) : (
        <div className="card">
          <p className="eyebrow">Schnell-Check · মনে আছে?</p>
          <div className="my-3 flex items-center gap-2">
            <ArticleText de={step.word.de} className="font-display text-2xl font-extrabold" />
            <SpeakButton text={step.word.de} />
          </div>
          <div className="grid gap-2">
            {step.options.map((o) => {
              const state = picked ? (o.id === step.word.id ? "border-green bg-green-soft" : o.id === picked ? "border-red bg-red-soft" : "opacity-60") : "";
              return (
                <button key={o.id} disabled={!!picked} onClick={() => setPicked(o.id)} className={`rounded-xl border-2 border-line bg-surface px-3 py-2 text-left font-bold ${state}`}>
                  {o.en} <span className="bn block text-sm font-normal text-muted">{o.bn}</span>
                </button>
              );
            })}
          </div>
          {picked && (
            <button className="btn mt-3 w-full" onClick={() => setI(i + 1)}>
              {picked === step.word.id ? cheer() : "Merken! ·  মনে রাখো"} Weiter →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
