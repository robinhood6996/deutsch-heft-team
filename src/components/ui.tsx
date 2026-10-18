"use client";
import { articleRuns, firstArticle } from "@/lib/german";
import { speak } from "@/lib/speech";

export function ArticleText({ de, className = "" }: { de: string; className?: string }) {
  return (
    <span className={className} lang="de">
      {articleRuns(de).map((r, i) =>
        r.art ? (
          <span key={i} className={`art-${r.art} font-extrabold`}>
            {r.text}
          </span>
        ) : (
          <span key={i}>{r.text}</span>
        ),
      )}
    </span>
  );
}

export function SpeakButton({ text, label = "Listen", className = "", rate }: { text: string; label?: string; className?: string; rate?: number }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speak(text, rate);
      }}
      className={`inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-base hover:border-blue ${className}`}
      aria-label={`${label}: ${text}`}
      title={label}
    >
      🔊
    </button>
  );
}

export function Progress({ value, max, className = "", color = "bg-blue" }: { value: number; max: number; className?: string; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-surface-2 ${className}`} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Card frame colour follows the article: der blue, die red, das green. */
export function articleFrame(de: string) {
  const a = firstArticle(de);
  return a === "der" ? "border-der" : a === "die" ? "border-die" : a === "das" ? "border-das" : "border-line";
}

export const CHEERS = ["Sehr gut!", "Super!", "Toll!", "Richtig!", "Prima!", "Klasse!", "Genau!", "Wunderbar!"];
export const cheer = () => CHEERS[Math.floor(Math.random() * CHEERS.length)];
