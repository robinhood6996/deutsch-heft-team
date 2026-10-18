import { notFound } from "next/navigation";
import { requireMember } from "@/lib/session";
import type { Exam } from "@/lib/types";
import { ExamRunner } from "./ExamRunner";

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireMember();
  const [{ data: exam }, { data: attempt }] = await Promise.all([
    supabase.from("exams").select("*").eq("id", id).maybeSingle(),
    supabase.from("exam_attempts").select("id, submitted_at").eq("exam_id", id).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!exam) notFound();
  return <ExamRunner exam={exam as Exam} existing={attempt as { id: string; submitted_at: string | null } | null} />;
}
