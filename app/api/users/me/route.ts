import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, email, full_name, avatar_url, is_admin")
    .eq("id", auth.userId)
    .single();

  return NextResponse.json({
    ...user,
    is_admin: auth.isGlobalAdmin,
  });
}
