"use client";
import { useState } from "react";
import type { Sentence } from "@/lib/types";
import { SpeakButton } from "./ui";

/** Sentence by sentence: read the German, say the meaning in Bangla, then reveal. */
export function Understand({ sentences }: { sentences: Sentence[] }) {
  const [test, setTest] = useState(true);
  const [open, setOpen] = useState<Set<number>>(new Set());
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-prose text-muted">
          Read the German aloud, say the meaning in Bangla, then reveal it. <span className="bn">মুখে বাংলায় মানে বলো, তারপর মিলিয়ে দেখো।</span>
        </p>
        <div className="flex rounded-full border border-line bg-surface p-0.5 text-sm font-bold">
          <button onClick={() => setTest(true)} className={`rounded-full px-3 py-1 ${test ? "bg-blue text-surface" : "text-muted"}`}>
            Selbsttest
          </button>
          <button onClick={() => setTest(false)} className={`rounded-full px-3 py-1 ${!test ? "bg-blue text-surface" : "text-muted"}`}>
            Alles zeigen
          </button>
        </div>
      </div>
      <p className="mb-2 text-sm text-muted tabular-nums">
        {open.size} / {sentences.length} checked
      </p>
      <div className="flex flex-col gap-2">
        {sentences.map((s, i) => {
          const shown = !test || open.has(i);
          return (
            <article key={s.idx} className="card py-3">
              <div className="flex items-start gap-3">
                <span className="w-6 pt-1 text-xs text-muted tabular-nums">{i + 1}</span>
                <p className="flex-1 font-display text-lg font-semibold" lang="de">
                  {s.de}
                </p>
                <SpeakButton text={s.de} />
              </div>
              {shown ? (
                <div className="mt-1 pl-9">
                  <p className="bn text-[17px]">{s.bn}</p>
                  <p className="text-sm text-muted">{s.en}</p>
                </div>
              ) : (
                <button className="btn-ghost ml-9 mt-2 px-3 py-1.5 text-sm" onClick={() => setOpen((o) => new Set(o).add(i))}>
                  Bedeutung zeigen · <span className="bn">মানে দেখাও</span>
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
