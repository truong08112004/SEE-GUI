import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProjectAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { taskIds, swimlaneId, targetSwimlaneName, sourceSwimlaneName, projectId } =
      body;

    if (!taskIds || !Array.isArray(taskIds) || !swimlaneId) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { data: swimlaneRow } = await supabase
      .from("swimlanes")
      .select("project_id, name")
      .eq("id", swimlaneId)
      .single();

    const resolvedProjectId = projectId || swimlaneRow?.project_id;
    if (!resolvedProjectId) {
      return NextResponse.json({ error: "Project not found" }, { status: 400 });
    }

    const ctx = await getProjectAuth(resolvedProjectId);
    if (!ctx || !can(ctx.role, "task:move", ctx.isGlobalAdmin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetName =
      targetSwimlaneName || swimlaneRow?.name?.toLowerCase() || "";
    const sourceName = sourceSwimlaneName?.toLowerCase() || "";
    const now = new Date().toISOString();

    const updatePromises = taskIds.map(async (taskId: string, index: number) => {
      const { data: currentTask } = await supabase
        .from("tasks")
        .select("start_date, end_date, swimlane_id, created_at")
        .eq("id", taskId)
        .single();

      const updates: Record<string, unknown> = {
        position: index,
        swimlane_id: swimlaneId,
        updated_at: now,
      };

      if (targetName.includes("progress") && !currentTask?.start_date) {
        updates.start_date = now;
      }

      if (targetName === "done" && !currentTask?.end_date) {
        updates.end_date = now;
        const startDateValue =
          currentTask?.start_date || currentTask?.created_at;
        if (startDateValue) {
          const startDate = new Date(startDateValue);
          const endDate = new Date(now);
          const diffDays =
            Math.abs(endDate.getTime() - startDate.getTime()) /
            (1000 * 60 * 60 * 24);
          updates.actual_effort_pm = Math.round((diffDays / 20) * 100) / 100;
        }
      }

      if (sourceName === "done" && targetName !== "done" && currentTask?.end_date) {
        updates.end_date = null;
        updates.actual_effort_pm = null;
      }

      return supabase.from("tasks").update(updates).eq("id", taskId);
    });

    const results = await Promise.all(updatePromises);
    const updateError = results.find((r) => r.error);
    if (updateError?.error) {
      return NextResponse.json(
        { error: updateError.error.message },
        { status: 500 }
      );
    }

    const { data: updatedTasks, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .in("id", taskIds)
      .order("position");

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ tasks: updatedTasks });
  } catch (error) {
    console.error("[reorder] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
