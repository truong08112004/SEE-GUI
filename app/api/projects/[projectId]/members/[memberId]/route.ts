import { createClient } from "@/lib/supabase/server";
import { getProjectAuth } from "@/lib/auth";
import { can, canManageRole, normalizeRole } from "@/lib/permissions";
import type { ProjectRole } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; memberId: string }> }
) {
  const { projectId, memberId } = await params;
  const ctx = await getProjectAuth(projectId);

  if (!ctx || !can(ctx.role, "member:change_role", ctx.isGlobalAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { role } = body as { role: ProjectRole };

  const supabase = await createClient();

  const { data: target } = await supabase
    .from("project_members")
    .select("role, user_id")
    .eq("id", memberId)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (target.user_id === ctx.userId && role !== ctx.role) {
    return NextResponse.json(
      { error: "Cannot change your own role" },
      { status: 403 }
    );
  }

  const targetRole = normalizeRole(target.role);
  if (!canManageRole(ctx.role, targetRole) || !canManageRole(ctx.role, role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { data: member, error } = await supabase
    .from("project_members")
    .update({ role })
    .eq("id", memberId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(member);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; memberId: string }> }
) {
  const { projectId, memberId } = await params;
  const ctx = await getProjectAuth(projectId);

  if (!ctx || !can(ctx.role, "member:remove", ctx.isGlobalAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: target } = await supabase
    .from("project_members")
    .select("role, user_id")
    .eq("id", memberId)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (normalizeRole(target.role) === "owner") {
    return NextResponse.json(
      { error: "Cannot remove project owner" },
      { status: 403 }
    );
  }

  if (target.user_id === ctx.userId) {
    return NextResponse.json(
      { error: "Cannot remove yourself" },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Member removed" });
}
