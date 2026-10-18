"use client";
import { useEffect, useMemo, useState } from "react";
import type { Word } from "@/lib/types";
import { isCorrect, makeQuiz, type QuizQuestion } from "@/lib/german";
import { supabaseBrowser } from "@/lib/supabase/client";
import { speak } from "@/lib/speech";
import { ArticleText, Progress, SpeakButton, cheer } from "./ui";

const LABEL: Record<QuizQuestion["kind"], string> = {
  de2en: "What does it mean? · মানে কী?",
  en2de: "Say it in German · জার্মানে কী?",
  listen: "Listen and choose · শুনে বেছে নাও",
  article: "der, die or das?",
};

export function QuizSession({
  targets,
  pool,
  size,
  passPct,
  context,
  onFinish,
}: {
  targets: Word[];
  pool: Word[];
  size: number;
  passPct?: number;
  context: string;
  onFinish: (pct: number) => void;
}) {
  const [round, setRound] = useState(0);
  const questions = useMemo(() => makeQuiz(targets, pool, size), [targets, pool, size, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [pct, setPct] = useState<number | null>(null);
  const q = questions[i];

  useEffect(() => {
    setAnswer(null);
    if (q?.kind === "listen") setTimeout(() => speak(q.word.de), 200);
  }, [i, q]);

  async function choose(a: string) {
    if (answer) return;
    setAnswer(a);
    const ok = isCorrect(q, a);
    if (ok) {
      setScore((s) => s + 1);
      speak(q.word.de);
    } else {
      // A miss sends the word back into tomorrow's review
      supabaseBrowser().rpc("review_word", { p_word: q.word.id, p_grade: 0 });
    }
  }

  async function next() {
    if (i + 1 < questions.length) return setI(i + 1);
    const { data } = await supabaseBrowser().rpc("record_quiz", { p_context: context, p_total: questions.length, p_correct: score });
    setPct(typeof data === "number" ? data : Math.round((score * 100) / questions.length));
  }

  if (!questions.length) {
    return (
      <div className="card text-center">
        <p>No words to quiz yet.</p>
        <button className="btn mt-3" onClick={() => onFinish(100)}>
          Weiter →
        </button>
      </div>
    );
  }

  if (pct !== null) {
    const passed = passPct === undefined || pct >= passPct;
    return (
      <div className="card text-center">
        <p className={`hand text-5xl ${passed ? "text-green" : "text-red"}`}>{passed ? "Bestanden!" : "Noch einmal!"}</p>
        <p className="mt-2 text-lg">
          {score} / {questions.length} richtig · <b>{pct}%</b>
        </p>
        {!passed && <p className="text-muted">You need {passPct}% to finish the mission. The wrong words are now in your review.</p>}
        <div className="mt-4 flex justify-center gap-2">
          {!passed && (
            <button
              className="btn-ghost"
              onClick={() => {
                setRound((r) => r + 1);
                setI(0);
                setScore(0);
                setPct(null);
              }}
            >
              Neue Runde
            </button>
          )}
          <button className="btn" onClick={() => onFinish(pct)}>
            {passed ? "Weiter →" : "Später"}
          </button>
        </div>
      </div>
    );
  }

  const ok = answer ? isCorrect(q, answer) : null;
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-2 flex justify-between text-sm text-muted tabular-nums">
        <span>
          Frage {i + 1} / {questions.length}
        </span>
        <span>{score} richtig</span>
      </div>
      <Progress value={i} max={questions.length} className="mb-4" />
      <div className="card">
        <p className="eyebrow">{LABEL[q.kind]}</p>
        <div className="my-3">
          {q.kind === "de2en" && (
            <div className="flex items-center gap-2">
              <ArticleText de={q.word.de} className="font-display text-3xl font-extrabold" />
              <SpeakButton text={q.word.de} />
            </div>
          )}
          {q.kind === "listen" && (
            <button className="btn-ghost text-lg" onClick={() => speak(q.word.de)}>
              🔊 Noch einmal hören
            </button>
          )}
          {q.kind === "en2de" && (
            <>
              <p className="font-display text-2xl font-bold">{q.word.en}</p>
              <p className="bn text-lg text-muted">{q.word.bn}</p>
            </>
          )}
          {q.kind === "article" && (
            <>
              <p className="font-display text-3xl font-extrabold">
                ___ {q.noun}
              </p>
              <p className="text-muted">
                {q.word.en} · <span className="bn">{q.word.bn}</span>
              </p>
            </>
          )}
        </div>
        <div className={`grid gap-2 ${q.kind === "article" ? "grid-cols-3" : ""}`}>
          {q.kind === "article"
            ? (["der", "die", "das"] as const).map((a) => {
                const st = answer ? (a === q.answer ? "border-green bg-green-soft" : a === answer ? "border-red bg-red-soft" : "opacity-60") : "";
                return (
                  <button key={a} onClick={() => choose(a)} className={`rounded-xl border-2 border-line bg-surface py-3 font-display text-2xl font-extrabold art-${a} ${st}`}>
                    {a}
                  </button>
                );
              })
            : q.options.map((o) => {
                const st = answer ? (o.id === q.word.id ? "border-green bg-green-soft" : o.id === answer ? "border-red bg-red-soft" : "opacity-60") : "";
                return (
                  <button key={o.id} onClick={() => choose(o.id)} className={`rounded-xl border-2 border-line bg-surface px-3 py-2.5 text-left font-bold ${st}`}>
                    {q.kind === "en2de" ? (
                      <ArticleText de={o.de} />
                    ) : (
                      <>
                        {o.en}
                        <span className="bn block text-sm font-normal text-muted">{o.bn}</span>
                      </>
                    )}
                  </button>
                );
              })}
        </div>
        {answer && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className={`hand text-3xl ${ok ? "text-green" : "text-red"}`}>{ok ? cheer() : "Fast!"}</span>
            <span className="text-sm text-muted">
              <ArticleText de={q.word.de} /> = {q.word.en} · <span className="bn">{q.word.bn}</span>
            </span>
            <button className="btn ml-auto" onClick={next} autoFocus>
              Weiter →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
