import { requireMember } from "@/lib/session";
import { appToday } from "@/lib/german";
import type { Word } from "@/lib/types";
import { ReviewHub } from "./ReviewHub";

export default async function ReviewPage() {
  const { supabase, user } = await requireMember();
  const { data } = await supabase
    .from("user_words")
    .select("word_id, due, interval_days, words(*)")
    .eq("user_id", user.id)
    .order("due")
    .limit(1000);
  const rows = (data ?? []) as unknown as { word_id: string; due: string; interval_days: number; words: Word }[];
  const today = appToday();
  const due = rows.filter((r) => r.due <= today).map((r) => r.words);
  const learned = rows.map((r) => r.words);
  const weak = rows.filter((r) => r.interval_days <= 1).map((r) => r.words);
  return <ReviewHub due={due} learned={learned} weak={weak} />;
}
