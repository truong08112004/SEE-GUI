import { createClient } from "@/lib/supabase/server";
import { getProjectAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
  const { projectId, taskId } = await params;
  const ctx = await getProjectAuth(projectId);

  if (!ctx || !can(ctx.role, "project:view", ctx.isGlobalAdmin)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .select(
      `
      *,
      swimlanes (id, name),
      task_assignments (
        id,
        assigned_at,
        users (id, email, full_name, avatar_url)
      )
    `
    )
    .eq("id", taskId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
  const { projectId, taskId } = await params;
  const ctx = await getProjectAuth(projectId);

  if (!ctx || !can(ctx.role, "task:edit", ctx.isGlobalAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const body = await request.json();

  const { data: task, error } = await supabase
    .from("tasks")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("project_id", projectId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(task);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
  const { projectId, taskId } = await params;
  const ctx = await getProjectAuth(projectId);

  if (!ctx || !can(ctx.role, "task:delete", ctx.isGlobalAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Task deleted" });
}
