import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pushToUsers } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Evening reminder (Vercel Cron, 8 PM Dhaka). Everyone who has not finished
 * today's mission gets a push, with how many teammates are already done.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = supabaseAdmin();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
  const [{ data: members }, { data: done }] = await Promise.all([
    admin.from("team_members").select("team_id, user_id"),
    admin.from("mission_progress").select("user_id").eq("day", today).not("completed_at", "is", null),
  ]);
  const doneSet = new Set((done ?? []).map((d) => d.user_id));
  const byTeam = new Map<string, string[]>();
  for (const m of members ?? []) byTeam.set(m.team_id, [...(byTeam.get(m.team_id) ?? []), m.user_id]);

  let sent = 0;
  for (const users of byTeam.values()) {
    const missing = users.filter((u) => !doneSet.has(u));
    const finished = users.length - missing.length;
    const r = await pushToUsers(missing, {
      title: "Deine Mission wartet! ⏰",
      body: `${finished}/${users.length} im Team sind schon fertig. আজকের মিশনটা শেষ করো, স্ট্রিক বাঁচাও! 🔥`,
      url: "/mission",
      tag: "daily-reminder",
    });
    sent += r.sent;
  }
  return NextResponse.json({ ok: true, sent });
}
