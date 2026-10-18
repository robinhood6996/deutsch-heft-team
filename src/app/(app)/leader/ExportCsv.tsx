"use client";
import type { Member } from "@/lib/types";

export function ExportCsv({ members }: { members: Member[] }) {
  function download() {
    const head = ["name", "role", "done_today", "days_this_week", "minutes_week", "xp_week", "accuracy_week", "words_learned", "mastered", "streak", "last_active"];
    const rows = members.map((m) => [
      m.display_name,
      m.role,
      m.done_today,
      m.days_this_week,
      Math.round(m.seconds_week / 60),
      m.xp_week,
      m.accuracy_week,
      m.words_learned,
      m.mastered,
      m.streak,
      m.last_active ?? "",
    ]);
    const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `team-week-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button className="btn-ghost" onClick={download}>
      ⬇ CSV
    </button>
  );
}
