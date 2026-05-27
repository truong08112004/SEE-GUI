import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_SWIMLANES = [
  { name: "Backlog", position: 0 },
  { name: "To Do", position: 1 },
  { name: "In Progress", position: 2 },
  { name: "Done", position: 3 },
];

export async function GET() {
  const supabase = await createClient();
  const auth = await getAuthContext();

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (auth.isGlobalAdmin) {
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(projects);
  }

  const { data: memberships, error } = await supabase
    .from("project_members")
    .select("projects(*)")
    .eq("user_id", auth.userId)
    .order("joined_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const projects = memberships
    ?.map((m) => m.projects)
    .filter(Boolean) ?? [];

  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { name, description, creator_user_id } = body;

  if (!name) {
    return NextResponse.json(
      { error: "Project name is required" },
      { status: 400 }
    );
  }

  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (creator_user_id && creator_user_id !== auth.userId) {
    return NextResponse.json({ error: "Invalid creator" }, { status: 403 });
  }

  if (!auth.isGlobalAdmin) {
    return NextResponse.json(
      { error: "Only global admins can create projects" },
      { status: 403 }
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({ name, description })
    .select()
    .single();

  if (projectError) {
    return NextResponse.json({ error: projectError.message }, { status: 500 });
  }

  const swimlanesData = DEFAULT_SWIMLANES.map((s) => ({
    ...s,
    project_id: project.id,
  }));

  await supabase.from("swimlanes").insert(swimlanesData);

  await supabase.from("project_members").insert({
    project_id: project.id,
    user_id: auth.userId,
    role: "owner",
  });

  return NextResponse.json(project, { status: 201 });
}
