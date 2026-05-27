import { getProjectAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";
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

  return NextResponse.json({
    userId: ctx.userId,
    role: ctx.role,
    isGlobalAdmin: ctx.isGlobalAdmin,
    permissions: {
      canCreateTask: can(ctx.role, "task:create", ctx.isGlobalAdmin),
      canEditTask: can(ctx.role, "task:edit", ctx.isGlobalAdmin),
      canDeleteTask: can(ctx.role, "task:delete", ctx.isGlobalAdmin),
      canMoveTask: can(ctx.role, "task:move", ctx.isGlobalAdmin),
      canManageColumns: can(ctx.role, "board:manage_columns", ctx.isGlobalAdmin),
      canManageMembers: can(ctx.role, "member:add", ctx.isGlobalAdmin),
      canChangeRoles: can(ctx.role, "member:change_role", ctx.isGlobalAdmin),
      canCreateAccounts: can(
        ctx.role,
        "member:create_account",
        ctx.isGlobalAdmin
      ),
      accountCreationAvailable:
        isServiceRoleConfigured() &&
        can(ctx.role, "member:create_account", ctx.isGlobalAdmin),
    },
  });
}
