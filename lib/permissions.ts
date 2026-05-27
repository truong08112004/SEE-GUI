/** Vai trò trong project (Jira-style) */
export type ProjectRole = "owner" | "admin" | "member" | "viewer";

export const PROJECT_ROLES: ProjectRole[] = [
  "owner",
  "admin",
  "member",
  "viewer",
];

export const ROLE_LABELS: Record<ProjectRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export type Permission =
  | "project:view"
  | "task:create"
  | "task:edit"
  | "task:delete"
  | "task:move"
  | "board:manage_columns"
  | "member:view"
  | "member:add"
  | "member:remove"
  | "member:change_role"
  | "member:create_account"
  | "project:create";

const ROLE_PERMISSIONS: Record<ProjectRole, Permission[]> = {
  viewer: ["project:view", "member:view"],
  member: [
    "project:view",
    "member:view",
    "task:create",
    "task:edit",
    "task:delete",
    "task:move",
  ],
  admin: [
    "project:view",
    "member:view",
    "member:add",
    "member:remove",
    "member:change_role",
    "member:create_account",
    "task:create",
    "task:edit",
    "task:delete",
    "task:move",
    "board:manage_columns",
  ],
  owner: [
    "project:view",
    "member:view",
    "member:add",
    "member:remove",
    "member:change_role",
    "member:create_account",
    "task:create",
    "task:edit",
    "task:delete",
    "task:move",
    "board:manage_columns",
  ],
};

export function normalizeRole(role: string | null | undefined): ProjectRole {
  if (role && PROJECT_ROLES.includes(role as ProjectRole)) {
    return role as ProjectRole;
  }
  return "member";
}

export function can(
  role: ProjectRole | null | undefined,
  permission: Permission,
  isGlobalAdmin = false
): boolean {
  if (isGlobalAdmin) return true;
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canManageRole(
  actorRole: ProjectRole,
  targetRole: ProjectRole
): boolean {
  if (actorRole === "owner") return targetRole !== "owner";
  if (actorRole === "admin") {
    return targetRole === "member" || targetRole === "viewer";
  }
  return false;
}

export function roleRank(role: ProjectRole): number {
  const ranks: Record<ProjectRole, number> = {
    viewer: 0,
    member: 1,
    admin: 2,
    owner: 3,
  };
  return ranks[role];
}
