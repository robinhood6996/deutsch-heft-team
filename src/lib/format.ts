export const minutes = (s: number) => `${Math.round((s || 0) / 60)} min`;

export function ago(iso: string | null) {
  if (!iso) return "never";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export const FEED_TEXT: Record<string, (m: Record<string, unknown>, xp: number) => string> = {
  mission: () => "finished today's mission ✅",
  streak_bonus: (m) => `reached a ${m.streak}-day streak 🔥`,
  badge: (m) => `earned a badge ${m.emoji ?? "🏅"} ${m.name ?? ""}`,
  exam: (m) => `scored ${m.score}/${m.total} in “${m.title}” 📝`,
  team_bonus: () => "Whole team finished the day! +20 XP each 🎉",
};
