"use client";
import Link, { useLinkStatus } from "next/link";
import { Spinner } from "./Spinner";

/** Small spinner inside a nav link while that page is loading. */
function Pending({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner className="h-[1.1em] w-[1.1em]" /> : <>{children}</>;
}
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; bn: string; icon: string };

export function NavBar({ isLeader, xpWeek, streak }: { isLeader: boolean; xpWeek: number; streak: number }) {
  const path = usePathname();
  const items: Item[] = [
    { href: "/", label: "Heute", bn: "আজ", icon: "☀️" },
    { href: "/learn", label: "Lernen", bn: "শেখা", icon: "📘" },
    { href: "/review", label: "Wiederholen", bn: "রিভিশন", icon: "🔁" },
    { href: "/team", label: "Team", bn: "টিম", icon: "👥" },
    { href: "/leaderboard", label: "Rangliste", bn: "র‍্যাংক", icon: "🏆" },
    { href: "/exams", label: "Prüfungen", bn: "পরীক্ষা", icon: "📝" },
    ...(isLeader ? [{ href: "/leader", label: "Leiter", bn: "লিডার", icon: "🧭" }] : []),
    { href: "/profile", label: "Profil", bn: "প্রোফাইল", icon: "🙂" },
  ];
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const mobile = items.filter((i) => ["/", "/learn", "/review", "/team", "/exams"].includes(i.href));

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2">
            <span aria-hidden className="flex h-6 w-2.5 flex-col overflow-hidden rounded-sm">
              <i className="flex-1 bg-[#1a1a1a]" />
              <i className="flex-1 bg-[#dd0000]" />
              <i className="flex-1 bg-[#ffce00]" />
            </span>
            <span className="font-display text-xl font-extrabold">Deutsch-Heft</span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-bold ${active(i.href) ? "bg-blue-soft text-blue" : "text-muted hover:text-ink"}`}
              >
                <Pending>{null}</Pending>
                {i.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm tabular-nums">
            <span className="flex items-center gap-1 font-bold" title="Streak · টানা দিন">
              🔥 {streak}
            </span>
            <span className="flex items-center gap-1 font-bold" title="XP this week">
              ⭐ {xpWeek}
            </span>
            <Link href="/profile" className="lg:hidden" aria-label="Profile">
              🙂
            </Link>
          </div>
        </div>
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Main"
      >
        {mobile.map((i) => (
          <Link key={i.href} href={i.href} className={`flex flex-col items-center py-2 text-[11px] font-bold ${active(i.href) ? "text-blue" : "text-muted"}`}>
            <span className="grid h-6 place-items-center text-lg leading-none">
              <Pending>{i.icon}</Pending>
            </span>
            {i.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
