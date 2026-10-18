"use client";
import { useState } from "react";
import type { Story, Word } from "@/lib/types";
import { Reader } from "./Reader";

/**
 * Memory story ("Merkgeschichte"): one short, vivid story that packs the
 * chapter's words into scenes you can picture. Read once, then retell it.
 */
export function StoryCard({ story, words }: { story: Story; words: Word[] }) {
  const [open, setOpen] = useState(false);
  const [bn, setBn] = useState(false);
  return (
    <section className="card border-2 border-gold-bg bg-gold-soft/40">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="eyebrow">🧠 Merkgeschichte · মনে রাখার গল্প</p>
          <h2 className="text-2xl font-extrabold">{story.title}</h2>
          {story.bn_title && <p className="bn text-muted">{story.bn_title}</p>}
        </div>
        <button className="btn-gold" onClick={() => setOpen(!open)}>
          {open ? "Schließen" : "Geschichte lesen"}
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">
        Picture each scene like a film while you listen. Then close your eyes and retell it in German. That one retelling fixes more words than
        reading a list five times. <span className="bn">প্রতিটা দৃশ্য চোখে ভাসাও, তারপর নিজের মুখে জার্মানে গল্পটা বলো।</span>
      </p>
      {open && (
        <div className="mt-3">
          <Reader
            sentences={story.sentences.map(([de, en, bnText], i) => ({
              id: i,
              lesson_id: "story",
              idx: i,
              de,
              en,
              bn: bnText,
              say: "",
              emoji: "",
              tip: "",
              grp: "",
              is_list: false,
            }))}
            words={words}
            layout="text"
          />
          <button className="btn-ghost mt-3" onClick={() => setBn(!bn)}>
            {bn ? "Übersetzung verstecken" : "Übersetzung zeigen · অনুবাদ"}
          </button>
          {bn && (
            <ol className="mt-2 flex flex-col gap-1.5">
              {story.sentences.map(([de, en, b], i) => (
                <li key={i} className="text-sm">
                  <span className="font-semibold" lang="de">
                    {de}
                  </span>
                  <br />
                  <span className="bn">{b}</span> <span className="text-muted">· {en}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
