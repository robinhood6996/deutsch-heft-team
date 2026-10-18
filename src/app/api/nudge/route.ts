import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { pushToUsers } from "@/lib/push";

/** Send a nudge (checked by the database as the signed-in user), then push it to the teammate's phone. */
export async function POST(req: NextRequest) {
  const { to, message } = (await req.json()) as { to: string; message: string };
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const { error } = await supabase.rpc("send_nudge", { p_to: to, p_message: message ?? "" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data: me } = await supabase.from("profiles").select("display_name, avatar_emoji").eq("id", user.id).single();
  try {
    await pushToUsers([to], {
      title: `${me?.avatar_emoji ?? "👋"} ${me?.display_name ?? "Dein Team"} stupst dich an!`,
      body: message || "Los geht's! আজকের মিশনটা করে ফেলো।",
      url: "/mission",
      tag: "nudge",
    });
  } catch {
    // Push is best effort; the nudge itself is saved.
  }
  return NextResponse.json({ ok: true });
}
