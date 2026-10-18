import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/session";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { importBundle, type Bundle } from "@/lib/importContent";

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "Admins only" }, { status: 403 });
  let bundle: Bundle;
  try {
    bundle = (await req.json()) as Bundle;
  } catch {
    return NextResponse.json({ error: "That is not valid JSON" }, { status: 400 });
  }
  try {
    const log = await importBundle(supabaseAdmin(), bundle);
    return NextResponse.json({ ok: true, log });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
