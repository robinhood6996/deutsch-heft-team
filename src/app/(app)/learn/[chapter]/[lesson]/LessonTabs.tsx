"use client";
import { useState } from "react";
import { useAppRouter } from "@/lib/progress";
import { LoadingButton } from "@/components/LoadingButton";
import type { Lesson, Sentence, Word } from "@/lib/types";
import { byTopic } from "@/lib/german";
import { Reader } from "@/components/Reader";
import { Understand } from "@/components/Understand";
import { QuizSession } from "@/components/QuizSession";
import { LearnSession } from "@/components/LearnSession";
import { Exercises } from "@/components/Exercises";
import { ArticleText, SpeakButton } from "@/components/ui";

type Tab = "read" | "understand" | "words" | "notes" | "exercises" | "quiz" | "learn";

export function LessonTabs({ lesson, sentences, words, known }: { lesson: Lesson; sentences: Sentence[]; words: Word[]; known: string[] }) {
  const router = useAppRouter();
  const [tab, setTab] = useState<Tab>("read");
  const [run, setRun] = useState(0);
  const knownSet = new Set(known);
  const unlearned = words.filter((w) => !knownSet.has(w.id));

  const tabs: [Tab, string, string][] = [
    ["read", "Lesen", "পড়ো"],
    ["understand", "Verstehen", "বোঝো"],
    ["words", "Wörter", "শব্দ"],
    ...(lesson.notes_html ? ([["notes", "Regeln", "নিয়ম"]] as [Tab, string, string][]) : []),
    ...(lesson.exercises?.length ? ([["exercises", "Übungen", "অনুশীলন"]] as [Tab, string, string][]) : []),
    ["quiz", "Quiz", "কুইজ"],
  ];

  return (
    <div>
      <div className="-mx-4 mb-4 overflow-x-auto px-4">
        <div className="flex w-max gap-1 rounded-full border border-line bg-surface p-1">
          {tabs.map(([t, de, bn]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1.5 text-sm font-bold ${tab === t ? "bg-blue text-surface" : "text-muted hover:text-ink"}`}
            >
              {de} <span className="bn font-normal opacity-80">{bn}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === "read" && <Reader title={lesson.kind === "text" ? lesson.title : undefined} sentences={sentences} words={words} layout={lesson.kind === "text" ? "text" : "list"} />}
      {tab === "understand" && <Understand sentences={sentences} />}
      {tab === "notes" && <div className="card prose-notes" dangerouslySetInnerHTML={{ __html: lesson.notes_html }} />}
      {tab === "exercises" && lesson.exercises && <Exercises items={lesson.exercises} />}
      {tab === "quiz" && (
        <QuizSession key={run} targets={words} pool={words} size={Math.min(12, words.length)} context={`lesson:${lesson.id}`} onFinish={() => setRun((r) => r + 1)} />
      )}
      {tab === "learn" && (
        <LearnSession
          words={unlearned.slice(0, 8)}
          pool={words}
          onDone={() => {
            setTab("words");
            router.refresh();
          }}
        />
      )}
      {tab === "words" && (
        <div className="flex flex-col gap-3">
          <div className="card flex flex-wrap items-center justify-between gap-2">
            <p>
              <b className="tabular-nums">{words.length - unlearned.length}</b> / {words.length} words in your review schedule.{" "}
              <span className="bn text-muted">মিশনের বাইরে বাড়তি শিখতে চাইলে:</span>
            </p>
            <button className="btn" disabled={!unlearned.length} onClick={() => setTab("learn")}>
              {unlearned.length ? `Extra lernen (${Math.min(8, unlearned.length)})` : "Alle gelernt ✓"}
            </button>
          </div>
          {byTopic(words).map(([topic, ws]) => (
            <div key={topic} className="card">
              <h3 className="mb-2 font-extrabold">{topic}</h3>
              <ul className="divide-y divide-line">
                {ws.map((w) => (
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
                    {knownSet.has(w.id) && <span className="text-green" title="learned">●</span>}
                    <SpeakButton text={w.de} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
