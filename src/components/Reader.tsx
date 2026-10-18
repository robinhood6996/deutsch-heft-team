"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Sentence, Word } from "@/lib/types";
import { buildWordIndex, tokenize } from "@/lib/german";
import { canRecognize, listenOnce, pronunciationScore, speak, speakSequence, stopSpeaking } from "@/lib/speech";
import { ArticleText, SpeakButton } from "./ui";

export type ReaderProgress = { playedAll: boolean; spoken: number };

/**
 * Read-aloud view of a lesson text. Plays sentence by sentence with highlighting,
 * lets you tap any word for its meaning, and checks your pronunciation per sentence
 * (in browsers that support speech recognition).
 */
export function Reader({
  title,
  sentences,
  words,
  layout = "text",
  onProgress,
}: {
  title?: string;
  sentences: Sentence[];
  words: Word[];
  layout?: "text" | "list";
  onProgress?: (p: ReaderProgress) => void;
}) {
  const index = useMemo(() => buildWordIndex(words), [words]);
  const [active, setActive] = useState<number | null>(null);
  const [rate, setRate] = useState(0.85);
  const [popup, setPopup] = useState<Word | null>(null);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [listening, setListening] = useState<number | null>(null);
  const [micError, setMicError] = useState("");
  const [playedAll, setPlayedAll] = useState(false);
  const cancel = useRef<() => void>(() => {});
  const micOk = typeof window !== "undefined" && canRecognize();

  useEffect(() => () => cancel.current(), []);
  useEffect(() => {
    onProgress?.({ playedAll, spoken: Object.values(scores).filter((s) => s >= 50).length });
  }, [playedAll, scores]); // eslint-disable-line react-hooks/exhaustive-deps

  function playAll() {
    cancel.current();
    cancel.current = speakSequence(
      sentences.map((s) => s.de),
      rate,
      (i) => {
        setActive(i);
        document.getElementById(`s-${sentences[i].idx}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      },
      () => {
        setActive(null);
        setPlayedAll(true);
      },
    );
  }

  function playOne(i: number) {
    cancel.current();
    setActive(i);
    speak(sentences[i].de, rate, () => setActive(null));
  }

  async function check(i: number) {
    setMicError("");
    stopSpeaking();
    setListening(i);
    try {
      const heard = await listenOnce();
      setScores((s) => ({ ...s, [i]: pronunciationScore(sentences[i].de, heard) }));
    } catch (e) {
      setMicError((e as Error).message);
    }
    setListening(null);
  }

  const renderTokens = (text: string) =>
    tokenize(text).map((part, k) => {
      if (k % 2 === 0) return <span key={k}>{part}</span>;
      const w = index.get(part.toLowerCase());
      return w ? (
        <button
          key={k}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPopup(w);
            speak(w.de.replace(/\s*\(.*\)/, ""));
          }}
          className="cursor-help underline decoration-line decoration-dotted decoration-2 underline-offset-4 hover:text-blue"
        >
          {part}
        </button>
      ) : (
        <span key={k}>{part}</span>
      );
    });

  const scoreBadge = (i: number) =>
    scores[i] !== undefined && (
      <span className={`chip ${scores[i] >= 80 ? "border-green text-green" : scores[i] >= 50 ? "border-gold-bg text-gold" : "border-red text-red"}`}>
        🎙️ {scores[i]}%
      </span>
    );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button className="btn" onClick={playAll}>
            ▶ Ganzen Text hören
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              cancel.current();
              setActive(null);
            }}
          >
            ■ Stop
          </button>
        </div>
        <div className="flex rounded-full border border-line bg-surface p-0.5 text-sm font-bold">
          {[
            [0.85, "Normal"],
            [0.6, "Langsam"],
          ].map(([r, l]) => (
            <button key={l} onClick={() => setRate(r as number)} className={`rounded-full px-3 py-1 ${rate === r ? "bg-blue text-surface" : "text-muted"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {micError && <p className="mb-2 text-sm text-red">{micError}</p>}

      {layout === "text" ? (
        <article className="card">
          {title && <h3 className="mb-2 text-2xl font-extrabold">{title}</h3>}
          <div className="font-display text-[19px] font-semibold leading-[1.9] sm:text-[21px]" lang="de">
            {groupList(sentences).map((g, gi) =>
              g.list ? (
                <ul key={gi} className="my-1 list-disc pl-6">
                  {g.items.map(({ s, i }) => (
                    <li key={s.idx} id={`s-${s.idx}`}>
                      <span onClick={() => playOne(i)} className={`cursor-pointer rounded px-0.5 ${active === i ? "bg-gold-soft" : "hover:bg-surface-2"}`}>
                        {renderTokens(s.de)}
                      </span>{" "}
                      {scoreBadge(i)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p key={gi} className="my-1">
                  {g.items.map(({ s, i }) => (
                    <span key={s.idx} id={`s-${s.idx}`}>
                      <span onClick={() => playOne(i)} className={`cursor-pointer rounded px-0.5 ${active === i ? "bg-gold-soft" : "hover:bg-surface-2"}`}>
                        {renderTokens(s.de)}
                      </span>{" "}
                      {scoreBadge(i)}{" "}
                    </span>
                  ))}
                </p>
              ),
            )}
          </div>
        </article>
      ) : null}

      {micOk && (
        <section className="mt-4">
          <h3 className="mb-2 text-lg font-extrabold">
            Sprich nach · শুনে বলো <span className="text-sm font-normal text-muted">(tap 🎙️ and read the sentence)</span>
          </h3>
        </section>
      )}

      <div className={`flex flex-col gap-2 ${layout === "text" && !micOk ? "hidden" : ""}`}>
        {sentences.map((s, i) => (
          <div key={s.idx} className={`card flex items-start gap-3 py-3 ${active === i ? "border-gold-bg" : ""}`}>
            <span className="w-6 pt-1 text-xs text-muted tabular-nums">{i + 1}</span>
            <div className="flex-1">
              <p className="font-display text-lg font-semibold" lang="de">
                {s.emoji && <span className="mr-1">{s.emoji}</span>}
                {renderTokens(s.de)}
              </p>
              {s.say && <p className="text-sm italic text-blue">“{s.say}”</p>}
              {layout === "list" && (
                <>
                  <p className="text-sm">{s.en}</p>
                  <p className="bn text-sm text-muted">{s.bn}</p>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              {scoreBadge(i)}
              <SpeakButton text={s.de} rate={rate} />
              {micOk && (
                <button
                  type="button"
                  onClick={() => check(i)}
                  disabled={listening !== null}
                  className={`inline-grid h-9 w-9 place-items-center rounded-lg border ${listening === i ? "animate-pulse border-red bg-red-soft" : "border-line bg-surface-2"}`}
                  aria-label="Check my pronunciation"
                >
                  🎙️
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {popup && (
        <div
          className="fixed inset-x-0 bottom-20 z-40 mx-auto w-[min(520px,calc(100%-32px))] rounded-2xl border border-line bg-surface p-4 shadow-2xl lg:bottom-6"
          role="dialog"
          aria-label="Word meaning"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <ArticleText de={popup.de} className="font-display text-2xl font-extrabold" />
              {popup.say && <p className="bn text-blue">উচ্চারণ: {popup.say}</p>}
            </div>
            <div className="flex gap-1">
              <SpeakButton text={popup.de} />
              <button className="inline-grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface-2" onClick={() => setPopup(null)} aria-label="Close">
                ✕
              </button>
            </div>
          </div>
          <p className="mt-1 font-bold">{popup.en}</p>
          <p className="bn">{popup.bn}</p>
          {popup.mnemonic && <p className="bn mt-1 rounded-lg bg-gold-soft px-2 py-1 text-sm">💡 {popup.mnemonic}</p>}
          {popup.topic && <p className="mt-1 text-xs text-muted">{popup.topic}</p>}
        </div>
      )}
    </div>
  );
}

function groupList(sentences: Sentence[]) {
  const groups: { list: boolean; items: { s: Sentence; i: number }[] }[] = [];
  sentences.forEach((s, i) => {
    const last = groups[groups.length - 1];
    if (last && last.list === s.is_list) last.items.push({ s, i });
    else groups.push({ list: s.is_list, items: [{ s, i }] });
  });
  return groups;
}
