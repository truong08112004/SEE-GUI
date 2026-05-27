import { createClient } from "@/lib/supabase/server";
import { getProjectAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ projectId: string; swimlaneId: string }> }
) {
  const { projectId, swimlaneId } = await params;
  const ctx = await getProjectAuth(projectId);

  if (!ctx || !can(ctx.role, "board:manage_columns", ctx.isGlobalAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("swimlanes")
    .update(body)
    .eq("id", swimlaneId)
    .eq("project_id", projectId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  {
    params,
  }: { params: Promise<{ projectId: string; swimlaneId: string }> }
) {
  const { projectId, swimlaneId } = await params;
  const ctx = await getProjectAuth(projectId);

  if (!ctx || !can(ctx.role, "board:manage_columns", ctx.isGlobalAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();

  const { count } = await supabase
    .from("swimlanes")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  if ((count ?? 0) <= 1) {
    return NextResponse.json(
      { error: "Cannot delete the last column" },
      { status: 400 }
    );
  }

  const { data: firstLane } = await supabase
    .from("swimlanes")
    .select("id")
    .eq("project_id", projectId)
    .neq("id", swimlaneId)
    .order("position")
    .limit(1)
    .single();

  if (firstLane) {
    await supabase
      .from("tasks")
      .update({ swimlane_id: firstLane.id })
      .eq("swimlane_id", swimlaneId);
  }

  const { error } = await supabase
    .from("swimlanes")
    .delete()
    .eq("id", swimlaneId)
    .eq("project_id", projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Column deleted" });
}
