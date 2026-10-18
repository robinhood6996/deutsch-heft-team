import { redirect } from "next/navigation";
import { requireMember, isAdminEmail } from "@/lib/session";
import { ImportForm } from "./ImportForm";

export default async function AdminPage() {
  const { supabase, user } = await requireMember();
  if (!isAdminEmail(user.email)) redirect("/");
  const [{ count: words }, { count: lessons }, { data: chapters }] = await Promise.all([
    supabase.from("words").select("id", { count: "exact", head: true }),
    supabase.from("lessons").select("id", { count: "exact", head: true }),
    supabase.from("chapters").select("id, title").order("sort"),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="eyebrow">Admin</p>
        <h1 className="text-3xl font-extrabold">Inhalte importieren · কনটেন্ট যোগ করো</h1>
        <p className="text-muted">
          Now: {chapters?.length ?? 0} chapters ({chapters?.map((c) => c.title).join(", ")}), {lessons} lessons, {words} words.
        </p>
      </header>
      <ImportForm />
    </div>
  );
}
