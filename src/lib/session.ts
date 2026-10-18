import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";

export type Profile = { id: string; display_name: string; avatar_emoji: string };

/** Signed-in user who belongs to a team; redirects otherwise. */
export async function requireMember() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) redirect("/onboarding");
  const { data: profile } = await supabase.from("profiles").select("id, display_name, avatar_emoji").eq("id", user.id).single();
  return {
    supabase,
    user,
    teamId: membership.team_id as string,
    isLeader: membership.role === "leader",
    profile: (profile ?? { id: user.id, display_name: "", avatar_emoji: "🙂" }) as Profile,
  };
}

export function isAdminEmail(email: string | undefined | null) {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email && list.includes(email.toLowerCase()));
}
