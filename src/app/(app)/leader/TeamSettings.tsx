"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Chapter, Member, TeamOverview } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase/client";

export function TeamSettings({ team, chapters, members }: { team: TeamOverview["team"]; chapters: Chapter[]; members: Member[] }) {
  const router = useRouter();
  const [name, setName] = useState(team.name);
  const [focus, setFocus] = useState(team.focus_chapter_id ?? "");
  const [goal, setGoal] = useState(team.weekly_goal_words);
  const [msg, setMsg] = useState("");

  async function save() {
    const { error } = await supabaseBrowser()
      .from("teams")
      .update({ name, focus_chapter_id: focus || null, weekly_goal_words: goal })
      .eq("id", team.id);
    setMsg(error ? "❌ " + error.message : "✅ Saved");
    router.refresh();
  }

  async function role(user: string, r: "member" | "leader") {
    const { error } = await supabaseBrowser().rpc("set_member_role", { p_user: user, p_role: r });
    setMsg(error ? "❌ " + error.message : "✅ Role changed");
    router.refresh();
  }

  async function remove(user: string, who: string) {
    if (!confirm(`Remove ${who} from the team?`)) return;
    const { error } = await supabaseBrowser().from("team_members").delete().eq("team_id", team.id).eq("user_id", user);
    setMsg(error ? "❌ " + error.message : "✅ Removed");
    router.refresh();
  }

  return (
    <section>
      <h2 className="mb-2 text-xl font-extrabold">Team-Einstellungen · টিম সেটিংস</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card grid gap-3">
          <label>
            <span className="label">Team name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span className="label">Focus chapter (used when no lesson is planned)</span>
            <select className="input" value={focus} onChange={(e) => setFocus(e.target.value)}>
              <option value="">In order, from the first chapter</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Team goal: new words per week (all members together)</span>
            <input type="number" className="input" min={0} value={goal} onChange={(e) => setGoal(Number(e.target.value) || 0)} />
          </label>
          <div className="flex items-center gap-3">
            <button className="btn" onClick={save}>
              Speichern
            </button>
            {msg && <span className="text-sm">{msg}</span>}
          </div>
        </div>
        <div className="card">
          <h3 className="mb-2 font-extrabold">Members and roles</h3>
          <ul className="divide-y divide-line text-sm">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center gap-2 py-2">
                <span className="flex-1 font-bold">
                  {m.avatar_emoji} {m.display_name} <span className="text-muted">({m.role})</span>
                </span>
                {m.role === "member" ? (
                  <button className="btn-ghost px-2 py-1 text-xs" onClick={() => role(m.user_id, "leader")}>
                    Make leader
                  </button>
                ) : (
                  members.filter((x) => x.role === "leader").length > 1 && (
                    <button className="btn-ghost px-2 py-1 text-xs" onClick={() => role(m.user_id, "member")}>
                      Make member
                    </button>
                  )
                )}
                {m.role === "member" && (
                  <button className="btn-ghost px-2 py-1 text-xs text-red" onClick={() => remove(m.user_id, m.display_name)}>
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">New members join with the invite code on the Team page.</p>
        </div>
      </div>
    </section>
  );
}
