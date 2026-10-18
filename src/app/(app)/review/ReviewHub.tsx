"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Word } from "@/lib/types";
import { ReviewSession } from "@/components/ReviewSession";
import { QuizSession } from "@/components/QuizSession";

type Mode = null | "due" | "quiz" | "weak";

export function ReviewHub({ due, learned, weak }: { due: Word[]; learned: Word[]; weak: Word[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [key, setKey] = useState(0);
  const back = () => {
    setMode(null);
    setKey((k) => k + 1);
    router.refresh();
  };

  if (mode === "due") return <ReviewSession key={key} words={due.slice(0, 50)} onDone={back} />;
  if (mode === "quiz") return <QuizSession key={key} targets={learned} pool={learned} size={15} context="practice" onFinish={back} />;
  if (mode === "weak") return <ReviewSession key={key} words={weak.slice(0, 30)} onDone={back} />;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="eyebrow">Spaced repetition · ব্যবধানে পুনরাবৃত্তি</p>
        <h1 className="text-3xl font-extrabold">Wiederholen</h1>
        <p className="max-w-prose text-muted">
          Each word comes back just before you would forget it: after 1 day, then 3, 7, 21 days and so on. A word counts as <b>mastered</b> once
          its gap reaches 21 days. <span className="bn">ভুলে যাওয়ার ঠিক আগে শব্দটা আবার আসে, তাই মনে থেকে যায়।</span>
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        <button disabled={!due.length} onClick={() => setMode("due")} className="card text-left transition hover:border-blue disabled:opacity-60">
          <p className="text-4xl font-extrabold tabular-nums">{due.length}</p>
          <p className="font-bold">Fällig heute · আজকের রিভিশন</p>
          <p className="text-sm text-muted">{due.length ? "Start the cards" : "Nothing due. Come back tomorrow."}</p>
        </button>
        <button disabled={learned.length < 4} onClick={() => setMode("quiz")} className="card text-left transition hover:border-blue disabled:opacity-60">
          <p className="text-4xl font-extrabold tabular-nums">{learned.length}</p>
          <p className="font-bold">Übungs-Quiz · প্র্যাকটিস কুইজ</p>
          <p className="text-sm text-muted">15 random questions from all words you have learned</p>
        </button>
        <button disabled={!weak.length} onClick={() => setMode("weak")} className="card text-left transition hover:border-blue disabled:opacity-60">
          <p className="text-4xl font-extrabold tabular-nums">{weak.length}</p>
          <p className="font-bold">Schwache Wörter · দুর্বল শব্দ</p>
          <p className="text-sm text-muted">Words you forgot recently or just learned</p>
        </button>
      </div>
      {!learned.length && (
        <p className="card">
          You haven&apos;t learned any words yet. Start with <Link href="/mission" className="font-bold text-blue underline">today&apos;s mission</Link>.
        </p>
      )}
    </div>
  );
}
