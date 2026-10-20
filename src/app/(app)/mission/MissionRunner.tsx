"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useAppRouter } from "@/lib/progress";
import { LoadingButton } from "@/components/LoadingButton";
import type { Lesson, MissionProgress, Sentence, TodayMission, Word } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ReviewSession } from "@/components/ReviewSession";
import { LearnSession } from "@/components/LearnSession";
import { QuizSession } from "@/components/QuizSession";
import { Reader, type ReaderProgress } from "@/components/Reader";

type Step = "review" | "learn" | "read" | "quiz";
const ORDER: Step[] = ["review", "learn", "read", "quiz"];
const NAMES: Record<Step, [string, string]> = {
  review: ["Wiederholen", "রিভিশন"],
  learn: ["Neue Wörter", "নতুন শব্দ"],
  read: ["Lesen & Sprechen", "পড়া ও বলা"],
  quiz: ["Mini-Quiz", "মিনি কুইজ"],
};

function firstOpen(p: MissionProgress): Step | "done" {
  if (!p.review_done) return "review";
  if (!p.learn_done) return "learn";
  if (!p.read_done) return "read";
  if (!p.quiz_done) return "quiz";
  return "done";
}

export function MissionRunner({
  today,
  due,
  fresh,
  lesson,
  sentences,
  pool,
}: {
  today: TodayMission;
  due: Word[];
  fresh: Word[];
  lesson: Lesson | null;
  sentences: Sentence[];
  pool: Word[];
}) {
  const router = useAppRouter();
  const [progress, setProgress] = useState<MissionProgress>(today.progress);
  const [step, setStep] = useState<Step | "done">(firstOpen(today.progress));
  const [error, setError] = useState("");
  const [reading, setReading] = useState<ReaderProgress>({ playedAll: false, spoken: 0 });
  const started = useRef(Date.now());

  async function complete(s: Step, pct?: number) {
    setError("");
    const seconds = Math.round((Date.now() - started.current) / 1000);
    started.current = Date.now();
    const { data, error } = await supabaseBrowser().rpc("complete_mission_step", { p_step: s, p_pct: pct ?? null, p_seconds: seconds });
    if (error) return setError(error.message);
    const p = (data as TodayMission).progress;
    setProgress(p);
    setStep(firstOpen(p));
    window.scrollTo({ top: 0, behavior: "smooth" });
    router.refresh();
  }

  const quizTargets = [...fresh, ...due].length >= 4 ? [...fresh, ...due] : pool;
  const quizPool = [...pool, ...fresh, ...due];
  const readUnlocked = reading.playedAll || reading.spoken >= 3;

  return (
    <div className="flex flex-col gap-4">
      <ol className="grid grid-cols-4 gap-1.5">
        {ORDER.map((s, i) => {
          const done = progress[`${s}_done` as keyof MissionProgress];
          return (
            <li key={s} className={`rounded-lg border px-2 py-1.5 text-center text-xs font-bold sm:text-sm ${done ? "border-green bg-green-soft text-green" : step === s ? "border-blue bg-blue-soft text-blue" : "border-line text-muted"}`}>
              {done ? "✓" : i + 1} {NAMES[s][0]}
            </li>
          );
        })}
      </ol>
      {error && <p className="rounded-lg bg-red-soft px-3 py-2 text-sm text-red">{error}</p>}

      {step === "done" && (
        <div className="card text-center">
          <p className="hand text-6xl text-green">Geschafft!</p>
          <p className="mt-2 text-lg">Mission complete: +50 XP. Your streak grows. 🔥</p>
          <p className="bn text-muted">আজকের মিশন শেষ! কাল আবার দেখা হবে।</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/team" className="btn-ghost">
              See who still needs a nudge
            </Link>
            <Link href="/" className="btn">
              Zurück
            </Link>
          </div>
        </div>
      )}

      {step === "review" && (
        <section>
          <h1 className="mb-1 text-2xl font-extrabold">1 · Wiederholen <span className="bn text-lg font-normal text-muted">রিভিশন</span></h1>
          {due.length ? (
            <ReviewSession words={due} onDone={() => complete("review")} />
          ) : (
            <div className="card">
              <p>No cards are due today. Nice! · <span className="bn">আজ রিভিশনের কিছু নেই।</span></p>
              <LoadingButton className="btn mt-3" loadingText="Speichern …" onClick={() => complete("review")}>
                Weiter →
              </LoadingButton>
            </div>
          )}
        </section>
      )}

      {step === "learn" && (
        <section>
          <h1 className="mb-1 text-2xl font-extrabold">2 · Neue Wörter <span className="bn text-lg font-normal text-muted">নতুন শব্দ</span></h1>
          {fresh.length ? (
            <LearnSession words={fresh} pool={quizPool} onDone={() => complete("learn")} />
          ) : (
            <div className="card">
              <p>You have already learned every word here. The leader can pick the next lesson. · <span className="bn">এখানকার সব শব্দ শেখা শেষ।</span></p>
              <LoadingButton className="btn mt-3" loadingText="Speichern …" onClick={() => complete("learn")}>
                Weiter →
              </LoadingButton>
            </div>
          )}
        </section>
      )}

      {step === "read" && (
        <section>
          <h1 className="mb-1 text-2xl font-extrabold">3 · Lesen & Sprechen <span className="bn text-lg font-normal text-muted">পড়া ও বলা</span></h1>
          <p className="mb-3 text-muted">
            Play the text and read along out loud, or read at least 3 sentences into the microphone. Tap words you don&apos;t know.{" "}
            <span className="bn">পুরো টেক্সট শুনে জোরে পড়ো, অথবা মাইকে অন্তত ৩টা বাক্য বলো।</span>
          </p>
          {sentences.length ? (
            <Reader title={lesson?.title} sentences={sentences} words={pool} layout={lesson?.kind === "text" ? "text" : "list"} onProgress={setReading} />
          ) : (
            <p className="card">This lesson has no text.</p>
          )}
          <div className="sticky bottom-20 mt-4 flex justify-end lg:bottom-4">
            <LoadingButton
              className="btn-gold shadow-lg"
              disabled={!readUnlocked && sentences.length > 0}
              loadingText="Speichern …"
              onClick={async () => {
                if (lesson) await supabaseBrowser().rpc("mark_read", { p_lesson: lesson.id });
                await complete("read");
              }}
            >
              {readUnlocked || !sentences.length ? "Ich habe laut gelesen ✓" : `🔒 Play the text or speak 3 sentences (${reading.spoken}/3)`}
            </LoadingButton>
          </div>
        </section>
      )}

      {step === "quiz" && (
        <section>
          <h1 className="mb-1 text-2xl font-extrabold">4 · Mini-Quiz <span className="bn text-lg font-normal text-muted">মিনি কুইজ</span></h1>
          <p className="mb-3 text-muted">You need {today.mission.pass_pct}% to finish today&apos;s mission.</p>
          <QuizSession
            targets={quizTargets}
            pool={quizPool}
            size={today.mission.quiz_size}
            passPct={today.mission.pass_pct}
            context="mission"
            onFinish={(pct) => (pct >= today.mission.pass_pct ? complete("quiz", pct) : router.push("/"))}
          />
        </section>
      )}
    </div>
  );
}
