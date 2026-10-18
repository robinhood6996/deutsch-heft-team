"use client";

let voice: SpeechSynthesisVoice | null = null;

function pickVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const voices = window.speechSynthesis.getVoices();
  voice =
    voices.find((v) => /de[-_]DE/i.test(v.lang) && /Google|Anna|Helena|Katja|Markus/i.test(v.name)) ||
    voices.find((v) => /^de/i.test(v.lang)) ||
    null;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** Clean text so the voice doesn't read brackets, slashes or quotes. */
export function cleanForSpeech(text: string) {
  return text
    .replace(/…|___/g, " ")
    .replace(/[„“”"–]/g, " ")
    .replace(/\s*\/\s*/g, ", ")
    .replace(/[()]/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

export function speak(text: string, rate = 0.85, onEnd?: () => void) {
  if (!canSpeak()) return;
  const u = new SpeechSynthesisUtterance(cleanForSpeech(text));
  u.lang = "de-DE";
  u.rate = rate;
  if (voice) u.voice = voice;
  if (onEnd) {
    u.onend = onEnd;
    u.onerror = onEnd;
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

/** Speak a list one after another; returns a cancel function. */
export function speakSequence(
  texts: string[],
  rate: number,
  onStart: (i: number) => void,
  onDone: () => void,
) {
  if (!canSpeak()) return () => {};
  let cancelled = false;
  window.speechSynthesis.cancel();
  const step = (i: number) => {
    if (cancelled) return;
    if (i >= texts.length) return onDone();
    onStart(i);
    const u = new SpeechSynthesisUtterance(cleanForSpeech(texts[i]));
    u.lang = "de-DE";
    u.rate = rate;
    if (voice) u.voice = voice;
    u.onend = u.onerror = () => setTimeout(() => step(i + 1), 250);
    window.speechSynthesis.speak(u);
  };
  step(0);
  return () => {
    cancelled = true;
    window.speechSynthesis.cancel();
  };
}

// ----- Pronunciation check (Chrome / Edge / Android: Web Speech recognition) -----

type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function canRecognize() {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/** Listen once in German and resolve with what was heard (several guesses). */
export function listenOnce(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as Record<string, new () => Recognition>;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return reject(new Error("Speech recognition is not available in this browser. Try Chrome."));
    const rec = new Ctor();
    rec.lang = "de-DE";
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    let heard: string[] = [];
    rec.onresult = (e) => {
      const alts = e.results[0];
      heard = Array.from({ length: alts.length }, (_, i) => alts[i].transcript);
    };
    rec.onerror = (e) => reject(new Error(e.error === "not-allowed" ? "Microphone permission was denied." : e.error));
    rec.onend = () => resolve(heard);
    rec.start();
  });
}

const normWords = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-zäöüß0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/** Percentage of target words found in what was heard (best alternative). */
export function pronunciationScore(target: string, heard: string[]) {
  const t = normWords(target);
  if (!t.length) return 0;
  let best = 0;
  for (const h of heard) {
    const hw = new Set(normWords(h));
    const hit = t.filter((w) => hw.has(w)).length;
    best = Math.max(best, Math.round((hit / t.length) * 100));
  }
  return best;
}
