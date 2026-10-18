import Link from "next/link";
import { requireMember, isAdminEmail } from "@/lib/session";
import type { Badge, MyStats } from "@/lib/types";
import { ProfileForm } from "./ProfileForm";
import { PushToggle } from "./PushToggle";
import { SignOut } from "./SignOut";

export default async function ProfilePage() {
  const { supabase, profile, user } = await requireMember();
  const [{ data: stats }, { data: all }] = await Promise.all([supabase.rpc("my_stats"), supabase.from("badges").select("id, emoji, name, bn, description")]);
  const s = stats as MyStats;
  const earned = new Set(s.badges.map((b) => b.id));

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-4">
        <span className="text-6xl" aria-hidden>
          {profile.avatar_emoji}
        </span>
        <div>
          <p className="eyebrow">Profil</p>
          <h1 className="text-3xl font-extrabold">{profile.display_name || "—"}</h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["XP gesamt", s.xp_total],
          ["🔥 Serie", s.streak],
          ["Wörter", s.words_learned],
          ["★ Gemeistert", s.mastered],
        ].map(([l, v]) => (
          <div key={l} className="card py-3 text-center">
            <p className="text-3xl font-extrabold tabular-nums">{v}</p>
            <p className="text-sm text-muted">{l}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-2 text-xl font-extrabold">Abzeichen · ব্যাজ</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {((all ?? []) as (Badge & { description: string })[]).map((b) => (
            <div key={b.id} className={`card py-3 text-center ${earned.has(b.id) ? "border-gold-bg bg-gold-soft" : "opacity-50 grayscale"}`}>
              <p className="text-4xl">{b.emoji}</p>
              <p className="font-bold">{b.name}</p>
              <p className="bn text-sm">{b.bn}</p>
              <p className="text-xs text-muted">{b.description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileForm id={profile.id} name={profile.display_name} emoji={profile.avatar_emoji} />
        <div className="flex flex-col gap-4">
          <PushToggle userId={user.id} />
          <div className="card flex flex-wrap items-center gap-2">
            {isAdminEmail(user.email) && (
              <Link href="/admin" className="btn-ghost">
                ⚙️ Admin: Inhalte importieren
              </Link>
            )}
            <SignOut />
          </div>
        </div>
      </div>
    </div>
  );
}
