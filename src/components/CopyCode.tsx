"use client";
import { useState } from "react";

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="card flex items-center gap-3 py-2 text-left"
      onClick={async () => {
        await navigator.clipboard?.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      <span>
        <span className="eyebrow block">Einladungscode · ইনভাইট কোড</span>
        <span className="font-mono text-2xl font-extrabold tracking-widest">{code}</span>
      </span>
      <span className="text-sm text-muted">{copied ? "✓ copied" : "📋"}</span>
    </button>
  );
}
