import { redirect } from "next/navigation";
import { requireMember } from "@/lib/session";
import type { Lesson, Sentence, TodayMission, Word } from "@/lib/types";
import { MissionRunner } from "./MissionRunner";

export default async function MissionPage() {
  const { supabase } = await requireMember();
  const { data } = await supabase.rpc("get_today_mission");
  const today = data as TodayMission | null;
  if (!today) redirect("/");

  const ids = [...today.due_word_ids, ...today.new_word_ids];
  const lessonId = today.learn_lesson_id;
  const [{ data: words }, { data: lesson }, { data: sentences }, { data: poolLinks }] = await Promise.all([
    ids.length ? supabase.from("words").select("*").in("id", ids) : Promise.resolve({ data: [] as Word[] }),
    lessonId ? supabase.from("lessons").select("*").eq("id", lessonId).single() : Promise.resolve({ data: null }),
    lessonId ? supabase.from("sentences").select("*").eq("lesson_id", lessonId).order("idx") : Promise.resolve({ data: [] as Sentence[] }),
    lessonId ? supabase.from("word_lessons").select("words(*)").eq("lesson_id", lessonId) : Promise.resolve({ data: [] }),
  ]);
  const byId = new Map((words ?? []).map((w: Word) => [w.id, w]));
  const pool = ((poolLinks ?? []) as unknown as { words: Word }[]).map((r) => r.words).filter(Boolean);

  return (
    <MissionRunner
      today={today}
      due={today.due_word_ids.map((id) => byId.get(id)).filter(Boolean) as Word[]}
      fresh={today.new_word_ids.map((id) => byId.get(id)).filter(Boolean) as Word[]}
      lesson={lesson as Lesson | null}
      sentences={(sentences ?? []) as Sentence[]}
      pool={pool}
    />
  );
}
