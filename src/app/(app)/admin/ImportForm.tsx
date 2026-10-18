"use client";
import { useState } from "react";

const EXAMPLE = `{
  "chapters": [{ "id": "k3", "kind": "vocab", "title": "Kapitel 3", "subtitle": "Vocabulary Project", "bn_title": "অধ্যায় ৩", "sort": 4 }],
  "lessons": [{ "id": "k3l1", "chapter_id": "k3", "num": 1, "title": "…", "en_title": "…", "bn_title": "…", "kind": "text", "sort": 1 }],
  "sentences": [{ "lesson_id": "k3l1", "idx": 0, "de": "…", "en": "…", "bn": "…" }],
  "words": [{ "id": "k3w1", "chapter_id": "k3", "de": "der Tisch", "en": "table", "bn": "টেবিল", "say": "ডেয়া টিশ", "topic": "Möbel", "emoji": "🪑", "lessons": ["k3l1"] }],
  "stories": { "k3": { "title": "…", "sentences": [["de", "en", "bn"]] } },
  "mnemonics": { "k3w1": "…" },
  "images": { "k3w1": "https://…/word-images/k3w1.webp" }
}`;

export function ImportForm() {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(body: string) {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/import", { method: "POST", headers: { "content-type": "application/json" }, body });
    const j = (await res.json()) as { ok?: boolean; log?: string[]; error?: string };
    setBusy(false);
    setMsg(j.ok ? "✅ Imported: " + j.log?.join(", ") : "❌ " + j.error);
  }

  return (
    <div className="card flex flex-col gap-3">
      <p className="text-sm text-muted">
        Paste a content bundle (the same shape as <code>content/content.json</code>) or choose a .json file. Existing rows with the same id are updated;
        sentences of the lessons you send are replaced. Every key is optional, so you can send only mnemonics or only images.
      </p>
      <input
        type="file"
        accept="application/json,.json"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) setText(await f.text());
        }}
      />
      <textarea className="input min-h-72 font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} />
      <div className="flex items-center gap-3">
        <button className="btn" disabled={busy || !text.trim()} onClick={() => run(text)}>
          {busy ? "…" : "Importieren"}
        </button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>
    </div>
  );
}
