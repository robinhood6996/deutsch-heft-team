"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Exam, ExamAttempt, ExamQuestion } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase/client";
import { speak } from "@/lib/speech";
import { ArticleText } from "@/components/ui";

type Result = { score: number; total: number; pct?: number; auto?: boolean };
type Phase = "intro" | "running" | "done";

const VIOLATION_TEXT: Record<string, string> = {
  tab_hidden: "You left the exam tab",
  window_blur: "The exam window lost focus",
  fullscreen_exit: "You left full screen",
  camera_off: "The camera was turned off",
  paste: "Pasting is not allowed",
};

/**
 * Proctored exam. The browser cannot truly block other tabs, so the exam
 * watches for them instead: leaving the tab, losing focus or leaving full
 * screen each count as a violation, and too many submit the exam automatically.
 * Questions come one at a time from the server, answers are final, and the
 * answer key never reaches the browser.
 */
export function ExamRunner({ exam, existing }: { exam: Exam; existing: { id: string; submitted_at: string | null } | null }) {
  const sb = supabaseBrowser();
  const [phase, setPhase] = useState<Phase>(existing?.submitted_at ? "done" : "intro");
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [left, setLeft] = useState(0);
  const [camera, setCamera] = useState(false);
  const [needFs, setNeedFs] = useState(false);
  const [busy, setBusy] = useState(false);
  const offset = useRef(0);
  const attemptRef = useRef<ExamAttempt | null>(null);
  const live = useRef(false);
  const lastViolation = useRef(0);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const fsSupported = typeof document !== "undefined" && !!document.documentElement.requestFullscreen;

  const stopCamera = () => {
    stream.current?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    stream.current = null;
  };

  const finish = useCallback((r: Result) => {
    live.current = false;
    setResult(r);
    setPhase("done");
    stopCamera();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  const violation = useCallback(
    async (kind: string) => {
      const a = attemptRef.current;
      if (!live.current || !a) return;
      const now = Date.now();
      if (now - lastViolation.current < 1500) return; // blur + hidden fire together
      lastViolation.current = now;
      const { data } = await sb.rpc("log_exam_violation", { p_attempt: a.id, p_kind: kind });
      const d = data as { violations: number; max?: number; submitted: boolean; score?: number; total?: number; auto?: boolean } | null;
      if (!d) return;
      setViolations(d.violations ?? 0);
      if (d.submitted && d.score !== undefined) {
        finish({ score: d.score, total: d.total ?? a.total, auto: true });
      } else {
        setWarning(`${VIOLATION_TEXT[kind] ?? kind}. Warning ${d.violations} of ${d.max}. At ${d.max} the exam is submitted automatically.`);
      }
    },
    [sb, finish],
  );

  // Proctoring listeners
  useEffect(() => {
    if (phase !== "running") return;
    const onVis = () => document.visibilityState === "hidden" && violation("tab_hidden");
    const onBlur = () => violation("window_blur");
    const onFs = () => {
      if (exam.require_fullscreen && fsSupported && !document.fullscreenElement && live.current) {
        setNeedFs(true);
        violation("fullscreen_exit");
      }
    };
    const block = (e: Event) => e.preventDefault();
    const onPaste = (e: Event) => {
      e.preventDefault();
      violation("paste");
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("contextmenu", block);
    document.addEventListener("paste", onPaste);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("paste", onPaste);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [phase, violation, exam.require_fullscreen, fsSupported]);

  // Clock
  useEffect(() => {
    if (phase !== "running" || !attempt) return;
    const tick = async () => {
      const ms = new Date(attempt.deadline).getTime() - (Date.now() + offset.current);
      setLeft(Math.max(0, Math.ceil(ms / 1000)));
      if (ms <= 0 && live.current) {
        live.current = false;
        const { data } = await sb.rpc("finish_exam", { p_attempt: attempt.id, p_auto: true });
        finish(data as Result);
      }
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [phase, attempt, sb, finish]);

  // Listening questions play by themselves
  const q: ExamQuestion | undefined = attempt?.questions[index];
  useEffect(() => {
    setChoice("");
    if (q?.type === "listen") setTimeout(() => speak(q.de, 0.85), 300);
  }, [index, q]);

  useEffect(() => () => stopCamera(), []);

  async function enableCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
      stream.current = s;
      s.getVideoTracks()[0].onended = () => violation("camera_off");
      setCamera(true);
      setTimeout(() => {
        if (video.current) video.current.srcObject = s;
      }, 0);
    } catch {
      setError("Camera permission was denied. You can still take the exam without it.");
    }
  }

  async function start() {
    setError("");
    setBusy(true);
    if (exam.require_fullscreen && fsSupported) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        /* some browsers refuse; we keep watching for tab switches anyway */
      }
    }
    const { data, error } = await sb.rpc("start_exam", { p_exam: exam.id });
    setBusy(false);
    if (error) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      return setError(error.message);
    }
    const a = data as ExamAttempt;
    if (a.submitted_at) return finish({ score: a.score ?? 0, total: a.total, auto: a.auto_submitted });
    offset.current = new Date(a.server_now).getTime() - Date.now();
    attemptRef.current = a;
    setAttempt(a);
    setIndex(a.answered);
    setViolations(a.violations);
    live.current = true;
    setPhase("running");
    if (camera && video.current && stream.current) video.current.srcObject = stream.current;
  }

  async function submitAnswer() {
    if (!attempt || busy) return;
    setBusy(true);
    setError("");
    const { data, error } = await sb.rpc("answer_exam", { p_attempt: attempt.id, p_index: index, p_answer: choice.trim() });
    setBusy(false);
    if (error) {
      if (/Time is up|already submitted/.test(error.message)) {
        const { data: f } = await sb.rpc("finish_exam", { p_attempt: attempt.id, p_auto: true });
        return finish(f as Result);
      }
      if (/in order/.test(error.message)) {
        // Another tab answered already: resync with the server
        const { data: s } = await sb.rpc("start_exam", { p_exam: exam.id });
        if (s) setIndex((s as ExamAttempt).answered);
        return;
      }
      return setError(error.message);
    }
    const d = data as { answered: number; submitted?: boolean } & Result;
    if (d.submitted) return finish(d);
    setIndex(d.answered);
  }

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  if (phase === "done") {
    return (
      <div className="card mx-auto max-w-lg text-center">
        <p className="hand text-6xl text-green">Abgegeben!</p>
        {result ? (
          <p className="mt-2 text-2xl font-extrabold tabular-nums">
            {result.score} / {result.total} · {result.pct ?? Math.round((result.score * 100) / Math.max(1, result.total))}%
          </p>
        ) : (
          <p className="mt-2">You have already submitted this exam.</p>
        )}
        {result?.auto && <p className="mt-1 text-red">Submitted automatically (time up or too many warnings).</p>}
        <p className="bn mt-2 text-muted">পরীক্ষা জমা হয়েছে। উইন্ডো বন্ধ হলে সঠিক উত্তর দেখতে পারবে।</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/exams" className="btn-ghost">
            Alle Prüfungen
          </Link>
          {(attempt?.id || existing?.id) && (
            <Link href={`/exams/result/${attempt?.id ?? existing?.id}`} className="btn">
              Ergebnis ansehen
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="card mx-auto flex max-w-xl flex-col gap-3">
        <p className="eyebrow">Prüfung · পরীক্ষা</p>
        <h1 className="text-3xl font-extrabold">{exam.title}</h1>
        <p className="text-muted tabular-nums">
          {exam.num_questions} questions · {exam.duration_min} minutes
        </p>
        <ul className="list-disc pl-5 text-sm">
          <li>Questions come one by one. You cannot go back. · <span className="bn">একবার উত্তর দিলে আর ফেরা যাবে না।</span></li>
          <li>
            Do not switch tabs or apps. Each time counts as a warning; at {exam.max_violations} the exam is submitted. ·{" "}
            <span className="bn">অন্য ট্যাব/অ্যাপে গেলে সতর্কতা। {exam.max_violations}টা হলে পরীক্ষা জমা হয়ে যাবে।</span>
          </li>
          {exam.require_fullscreen && fsSupported && <li>The exam runs in full screen. Leaving full screen counts as a warning.</li>}
          <li>The clock keeps running even if you close the page.</li>
          <li>Copy, paste and right-click are switched off.</li>
          <li>For listening questions, turn your sound on. 🔊</li>
        </ul>
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <p className="text-sm font-bold">📷 Camera (optional)</p>
          <p className="text-sm text-muted">
            Shows your own picture in the corner during the exam, like an exam hall. Nothing is recorded or uploaded. Turning it off mid-exam counts as a
            warning.
          </p>
          {camera ? (
            <video ref={video} autoPlay muted playsInline className="mt-2 h-24 w-32 rounded-lg object-cover" />
          ) : (
            <button className="btn-ghost mt-2 text-sm" onClick={enableCamera}>
              Kamera einschalten
            </button>
          )}
        </div>
        {error && <p className="rounded-lg bg-red-soft px-3 py-2 text-sm text-red">{error}</p>}
        <button className="btn-gold text-lg" disabled={busy} onClick={start}>
          {busy ? "…" : existing ? "Prüfung fortsetzen →" : "Prüfung starten →"}
        </button>
      </div>
    );
  }

  // running
  return (
    <div className="exam-mode fixed inset-0 z-50 overflow-y-auto bg-paper select-none">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-5">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold">{exam.title}</p>
          <span className={`rounded-lg px-3 py-1 font-mono text-xl font-extrabold tabular-nums ${left < 60 ? "bg-red-soft text-red" : "bg-surface-2"}`}>
            ⏱ {mm}:{ss}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted tabular-nums">
          <span>
            Frage {index + 1} / {attempt!.total}
          </span>
          <span className={violations ? "font-bold text-red" : ""}>
            ⚠️ {violations} / {exam.max_violations}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-blue" style={{ width: `${(index / attempt!.total) * 100}%` }} />
        </div>

        {warning && (
          <div className="rounded-xl border-2 border-red bg-red-soft px-4 py-3 text-red" role="alert">
            <b>⚠️ {warning}</b>
            <button className="ml-2 underline" onClick={() => setWarning("")}>
              OK
            </button>
          </div>
        )}
        {needFs && (
          <button
            className="btn-gold"
            onClick={() => {
              document.documentElement.requestFullscreen().then(() => setNeedFs(false)).catch(() => setNeedFs(false));
            }}
          >
            Zurück in den Vollbildmodus
          </button>
        )}

        {q && (
          <div className="card">
            {q.type === "meaning" && (
              <>
                <p className="eyebrow">What does it mean? · মানে কী?</p>
                <ArticleText de={q.de} className="my-3 block font-display text-3xl font-extrabold" />
              </>
            )}
            {q.type === "listen" && (
              <>
                <p className="eyebrow">Listen and choose · শুনে বেছে নাও</p>
                <button className="btn-ghost my-3 text-lg" onClick={() => speak(q.de, 0.85)}>
                  🔊 Noch einmal hören
                </button>
              </>
            )}
            {q.type === "german" && (
              <>
                <p className="eyebrow">Write it in German · জার্মানে লেখো</p>
                <p className="mt-3 font-display text-2xl font-bold">{q.en}</p>
                <p className="bn mb-3 text-lg text-muted">{q.bn}</p>
                <input
                  className="input text-lg"
                  autoFocus
                  lang="de"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={choice}
                  onChange={(e) => setChoice(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && choice.trim() && submitAnswer()}
                  placeholder="z. B. der Tisch"
                />
                <p className="mt-1 text-xs text-muted">With or without the article. ae / oe / ue / ss are fine for ä / ö / ü / ß.</p>
              </>
            )}
            {q.type === "article" && (
              <>
                <p className="eyebrow">der, die or das?</p>
                <p className="mt-3 font-display text-3xl font-extrabold">___ {q.noun}</p>
                <p className="mb-3 text-muted">
                  {q.en} · <span className="bn">{q.bn}</span>
                </p>
              </>
            )}

            {(q.type === "meaning" || q.type === "listen") && (
              <div className="grid gap-2">
                {q.options.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setChoice(o.id)}
                    className={`rounded-xl border-2 px-3 py-2.5 text-left font-bold ${choice === o.id ? "border-blue bg-blue-soft" : "border-line bg-surface"}`}
                  >
                    {o.en}
                    <span className="bn block text-sm font-normal text-muted">{o.bn}</span>
                  </button>
                ))}
              </div>
            )}
            {q.type === "article" && (
              <div className="grid grid-cols-3 gap-2">
                {q.options.map((a) => (
                  <button
                    key={a}
                    onClick={() => setChoice(a)}
                    className={`rounded-xl border-2 py-3 font-display text-2xl font-extrabold art-${a} ${choice === a ? "border-blue bg-blue-soft" : "border-line bg-surface"}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}

            {error && <p className="mt-2 text-sm text-red">{error}</p>}
            <button className="btn mt-4 w-full text-lg" disabled={!choice.trim() || busy} onClick={submitAnswer}>
              {index + 1 === attempt!.total ? "Abgeben ✓" : "Antwort speichern →"}
            </button>
            <p className="mt-1 text-center text-xs text-muted">Answers are final. · উত্তর দিলে আর বদলানো যাবে না।</p>
          </div>
        )}
      </div>
      {camera && <video ref={video} autoPlay muted playsInline className="fixed bottom-3 right-3 h-24 w-32 rounded-lg border-2 border-line object-cover shadow-lg" />}
    </div>
  );
}
