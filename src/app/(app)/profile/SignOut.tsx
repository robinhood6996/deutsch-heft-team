"use client";
import { useAppRouter } from "@/lib/progress";
import { LoadingButton } from "@/components/LoadingButton";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SignOut() {
  const router = useAppRouter();
  return (
    <LoadingButton
      loading={router.pending}
      loadingText="Abmelden …"
      className="btn-ghost text-red"
      onClick={async () => {
        await supabaseBrowser().auth.signOut();
        router.replace("/login");
      }}
    >
      Abmelden · সাইন আউট
    </LoadingButton>
  );
}
