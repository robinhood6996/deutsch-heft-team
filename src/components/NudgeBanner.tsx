"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function NudgeBanner({ nudges }: { nudges: { id: number; message: string; from: string }[] }) {
  const [open, setOpen] = useState(nudges.length > 0);
  if (!open) return null;
  return (
    <div className="card mb-4 flex items-start gap-3 border-gold-bg bg-gold-soft">
      <span className="text-2xl">👋</span>
      <div className="flex-1">
        <p className="font-bold">
          {nudges.map((n) => n.from).join(", ")} nudged you! <span className="bn font-normal">তোমাকে ধাক্কা দিয়েছে!</span>
        </p>
        {nudges
          .filter((n) => n.message)
          .map((n) => (
            <p key={n.id} className="text-sm">
              “{n.message}” — {n.from}
            </p>
          ))}
        <p className="mt-1 text-sm text-muted">Start your mission within an hour and you both get +10 XP.</p>
      </div>
      <button
        className="btn-ghost px-3 py-1 text-sm"
        onClick={async () => {
          await supabaseBrowser().rpc("mark_nudges_seen");
          setOpen(false);
        }}
      >
        OK
      </button>
    </div>
  );
}
