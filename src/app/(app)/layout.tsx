import { NavBar } from "@/components/NavBar";
import { requireMember } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, isLeader } = await requireMember();
  const { data: stats } = await supabase.rpc("my_stats");
  return (
    <>
      <NavBar isLeader={isLeader} xpWeek={stats?.xp_week ?? 0} streak={stats?.streak ?? 0} />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 lg:pb-12">{children}</main>
    </>
  );
}
