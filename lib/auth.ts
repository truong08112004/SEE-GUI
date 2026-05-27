import { createClient } from "@/lib/supabase/server";
import type { ProjectRole } from "@/lib/permissions";
import { normalizeRole } from "@/lib/permissions";

export interface AuthContext {
  authUserId: string;
  userId: string;
  isGlobalAdmin: boolean;
}

export interface ProjectAuthContext extends AuthContext {
  projectId: string;
  role: ProjectRole;
  membershipId: string;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: dbUser, error } = await supabase
    .from("users")
    .select("id, is_admin")
    .eq("user_auth_id", authUser.id)
    .single();

  if (error || !dbUser) return null;

  return {
    authUserId: authUser.id,
    userId: dbUser.id,
    isGlobalAdmin: dbUser.is_admin === true,
  };
}

export async function getProjectAuth(
  projectId: string
): Promise<ProjectAuthContext | null> {
  const auth = await getAuthContext();
  if (!auth) return null;

  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("project_members")
    .select("id, role")
    .eq("project_id", projectId)
    .eq("user_id", auth.userId)
    .single();

  if (!membership && !auth.isGlobalAdmin) return null;

  return {
    ...auth,
    projectId,
    role: membership
      ? normalizeRole(membership.role)
      : "admin",
    membershipId: membership?.id ?? "",
  };
}
