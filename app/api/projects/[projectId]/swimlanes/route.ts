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
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("swimlanes")
    .select("*")
    .eq("project_id", projectId)
    .order("position");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const ctx = await getProjectAuth(projectId);

  if (!ctx || !can(ctx.role, "board:manage_columns", ctx.isGlobalAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, position } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Column name is required" }, { status: 400 });
  }

  const supabase = await createClient();

  let pos = position;
  if (pos === undefined) {
    const { data: last } = await supabase
      .from("swimlanes")
      .select("position")
      .eq("project_id", projectId)
      .order("position", { ascending: false })
      .limit(1)
      .single();
    pos = (last?.position ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from("swimlanes")
    .insert({ project_id: projectId, name: name.trim(), position: pos })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const ctx = await getProjectAuth(projectId);

  if (!ctx || !can(ctx.role, "board:manage_columns", ctx.isGlobalAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { columns } = body as {
    columns: { id: string; name?: string; position: number }[];
  };

  if (!columns?.length) {
    return NextResponse.json({ error: "Invalid columns" }, { status: 400 });
  }

  const supabase = await createClient();
  const updates = columns.map((col) =>
    supabase
      .from("swimlanes")
      .update({
        ...(col.name !== undefined ? { name: col.name } : {}),
        position: col.position,
      })
      .eq("id", col.id)
      .eq("project_id", projectId)
  );

  const results = await Promise.all(updates);
  const err = results.find((r) => r.error);
  if (err?.error) {
    return NextResponse.json({ error: err.error.message }, { status: 500 });
  }

  const { data } = await supabase
    .from("swimlanes")
    .select("*")
    .eq("project_id", projectId)
    .order("position");

  return NextResponse.json(data);
}
