"use client";
import { useAppRouter } from "@/lib/progress";
import { LoadingButton } from "@/components/LoadingButton";
import { supabaseBrowser } from "@/lib/supabase/client";

export function DeleteExam({ id, title }: { id: string; title: string }) {
  const router = useAppRouter();
  return (
    <LoadingButton
      loading={router.pending}
      className="btn-ghost px-2 py-1 text-xs text-red"
      onClick={async () => {
        if (!confirm(`Delete “${title}” and all its results?`)) return;
        await supabaseBrowser().from("exams").delete().eq("id", id);
        router.refresh();
      }}
    >
      Löschen
    </LoadingButton>
  );
}
