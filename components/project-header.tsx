"use client";

import { useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { ProjectSelector } from "@/components/project-selector";
import { MemberManager } from "@/components/member-manager";
import type { ProjectPermissions } from "@/components/project-dashboard";
import { Users } from "lucide-react";
import { getTaskEffortPm } from "@/lib/task-effort";

interface ProjectHeaderProps {
  project: Tables<"projects">;
  tasks: (Tables<"tasks"> & {
    task_assignments?: { id: string; users: { id: string } | null }[];
  })[];
  user: User;
  onProjectChange?: (project: Tables<"projects">) => void;
  permissions: ProjectPermissions | null;
}

export function ProjectHeader({
  project,
  tasks,
  onProjectChange,
  permissions,
}: ProjectHeaderProps) {
  const [isMemberManagerOpen, setIsMemberManagerOpen] = useState(false);

  const totalTasks = tasks.length;
  const totalEffort = tasks.reduce(
    (sum, task) => sum + getTaskEffortPm(task).effortPm,
    0
  );
  const uniqueAssignees = new Set(
    tasks
      .flatMap((t) => t.task_assignments ?? [])
      .map((a) => a.users?.id)
      .filter((id): id is string => Boolean(id))
  );
  const headcount = uniqueAssignees.size;
  const effortPerPerson = headcount > 0 ? totalEffort / headcount : 0;

  return (
    <>
      <div className="flex items-center justify-between w-full gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {onProjectChange && (
            <ProjectSelector
              currentProject={project}
              onProjectChange={onProjectChange}
              variant="topbar"
            />
          )}
          <span className="text-white/60 text-xs hidden sm:inline">/</span>
          <span className="text-sm font-medium text-white truncate">
            {project.name}
          </span>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden md:flex items-center gap-4 text-xs text-white/80">
            <span>
              <strong className="text-white">{totalTasks}</strong> issues
            </span>
            <span>
              <strong className="text-white">{totalEffort.toFixed(1)}</strong>{" "}
              PM
            </span>
            {headcount > 0 && (
              <span title="Total effort divided by assigned people">
                <strong className="text-white">{effortPerPerson.toFixed(1)}</strong>{" "}
                PM/person
              </span>
            )}
          </div>

          {(permissions?.canManageMembers || permissions?.canCreateAccounts) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMemberManagerOpen(true)}
              className="h-8 text-white hover:bg-white/10 rounded-[3px] text-sm"
            >
              <Users className="size-3.5" />
              <span className="hidden sm:inline ml-1">People</span>
            </Button>
          )}
        </div>
      </div>

      {(permissions?.canManageMembers || permissions?.canCreateAccounts) && (
        <MemberManager
          projectId={project.id}
          open={isMemberManagerOpen}
          onOpenChange={setIsMemberManagerOpen}
          canChangeRoles={permissions.canChangeRoles}
          canManageMembers={permissions.canManageMembers}
          canCreateAccounts={permissions.canCreateAccounts}
          accountCreationAvailable={permissions.accountCreationAvailable}
        />
      )}
    </>
  );
}
