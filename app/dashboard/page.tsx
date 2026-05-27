import { createClient } from "@/lib/supabase/server";
import { ProjectDashboard } from "@/components/project-dashboard";
import { getAuthContext, getProjectAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const auth = await getAuthContext();

  let project = null;
  if (auth) {
    if (auth.isGlobalAdmin) {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      project = data;
    } else {
      const { data: membership } = await supabase
        .from("project_members")
        .select("projects(*)")
        .eq("user_id", auth.userId)
        .order("joined_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      project = membership?.projects ?? null;
    }
  }

  const projectId = project?.id ?? "";

  const { data: swimlanes } = projectId
    ? await supabase
        .from("swimlanes")
        .select("*")
        .eq("project_id", projectId)
        .order("position")
    : { data: [] };

  const { data: tasks } = projectId
    ? await supabase
        .from("tasks")
        .select(
          `
      *,
      task_assignments (
        id,
        assigned_at,
        users (id, email, full_name, avatar_url)
      )
    `
        )
        .eq("project_id", projectId)
        .order("position")
    : { data: [] };

  const projectAuth = projectId ? await getProjectAuth(projectId) : null;

  const permissions = projectAuth
    ? {
        role: projectAuth.role,
        canCreateTask: can(projectAuth.role, "task:create", projectAuth.isGlobalAdmin),
        canEditTask: can(projectAuth.role, "task:edit", projectAuth.isGlobalAdmin),
        canDeleteTask: can(projectAuth.role, "task:delete", projectAuth.isGlobalAdmin),
        canMoveTask: can(projectAuth.role, "task:move", projectAuth.isGlobalAdmin),
        canManageColumns: can(
          projectAuth.role,
          "board:manage_columns",
          projectAuth.isGlobalAdmin
        ),
        canManageMembers: can(
          projectAuth.role,
          "member:add",
          projectAuth.isGlobalAdmin
        ),
        canChangeRoles: can(
          projectAuth.role,
          "member:change_role",
          projectAuth.isGlobalAdmin
        ),
        canCreateAccounts: can(
          projectAuth.role,
          "member:create_account",
          projectAuth.isGlobalAdmin
        ),
        accountCreationAvailable:
          isServiceRoleConfigured() &&
          can(
            projectAuth.role,
            "member:create_account",
            projectAuth.isGlobalAdmin
          ),
      }
    : null;

  return (
    <main className="min-h-screen bg-[#F4F5F7]">
      <ProjectDashboard
        project={project}
        initialSwimlanes={swimlanes || []}
        initialTasks={tasks || []}
        user={user!}
        permissions={permissions}
      />
    </main>
  );
}
