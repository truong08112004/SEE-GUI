import { createClient } from "@/lib/supabase/server";
import { getProjectAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const ctx = await getProjectAuth(projectId);

  if (!ctx || !can(ctx.role, "member:view", ctx.isGlobalAdmin)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("project_members")
    .select(
      `
      id,
      role,
      joined_at,
      users (id, email, full_name, avatar_url)
    `
    )
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(members);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const ctx = await getProjectAuth(projectId);

  if (!ctx || !can(ctx.role, "member:add", ctx.isGlobalAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { user_id, role = "member" } = body;

  if (!user_id) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", user_id)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "User is already a member" },
      { status: 400 }
    );
  }

  const { data: member, error } = await supabase
    .from("project_members")
    .insert({ project_id: projectId, user_id, role })
    .select(
      `
      id,
      role,
      joined_at,
      users (id, email, full_name, avatar_url)
    `
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(member, { status: 201 });
}
