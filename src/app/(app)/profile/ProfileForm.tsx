"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

const EMOJIS = ["🙂", "😎", "🦊", "🐼", "🐯", "🦁", "🐸", "🦉", "🐝", "🌻", "🚀", "⚽", "🎧", "📚", "🍵", "🥨"];

export function ProfileForm({ id, name, emoji }: { id: string; name: string; emoji: string }) {
  const router = useRouter();
  const [n, setN] = useState(name);
  const [e, setE] = useState(emoji);
  const [msg, setMsg] = useState("");
  return (
    <div className="card flex flex-col gap-3">
      <h2 className="text-lg font-extrabold">Name & Avatar</h2>
      <label>
        <span className="label">Display name</span>
        <input className="input" maxLength={40} value={n} onChange={(ev) => setN(ev.target.value)} />
      </label>
      <div className="flex flex-wrap gap-1">
        {EMOJIS.map((x) => (
          <button key={x} onClick={() => setE(x)} className={`h-10 w-10 rounded-lg border-2 text-xl ${e === x ? "border-blue bg-blue-soft" : "border-line"}`}>
            {x}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          className="btn"
          onClick={async () => {
            const { error } = await supabaseBrowser().from("profiles").update({ display_name: n.trim(), avatar_emoji: e }).eq("id", id);
            setMsg(error ? "❌ " + error.message : "✅ Saved");
            router.refresh();
          }}
        >
          Speichern
        </button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>
    </div>
  );
}
