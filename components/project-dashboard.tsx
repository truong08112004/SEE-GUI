"use client";

import { useState, useEffect } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { SwimLaneBoard, type BoardPermissions } from "@/components/swim-lane-board";
import { ProjectHeader } from "@/components/project-header";
import { SEEInsightsPanel } from "@/components/see-insights-panel";
import { TeamView } from "@/components/views/team-view";
import { ProjectSelector } from "@/components/project-selector";
import { Button } from "@/components/ui/button";
import { Lozenge } from "@/components/ui/lozenge";
import { ROLE_LABELS, type ProjectRole } from "@/lib/permissions";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  ChevronLeft,
  ChevronRight,
  PieChart,
} from "lucide-react";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";

interface TaskWithAssignments extends Tables<"tasks"> {
  task_assignments?: {
    id: string;
    users: {
      id: string;
      email: string;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  }[];
}

export interface ProjectPermissions extends BoardPermissions {
  role: ProjectRole;
  canManageMembers: boolean;
  canChangeRoles: boolean;
  canCreateAccounts: boolean;
  accountCreationAvailable: boolean;
}

interface ProjectDashboardProps {
  project: Tables<"projects"> | null;
  initialSwimlanes: Tables<"swimlanes">[];
  initialTasks: TaskWithAssignments[];
  user: User;
  permissions: ProjectPermissions | null;
}

type DashboardView = "board" | "team" | "reports";

export function ProjectDashboard({
  project: initialProject,
  initialSwimlanes,
  initialTasks,
  user,
  permissions: initialPermissions,
}: ProjectDashboardProps) {
  const [project, setProject] = useState(initialProject);
  const [swimlanes, setSwimlanes] = useState(initialSwimlanes);
  const [tasks, setTasks] = useState<TaskWithAssignments[]>(initialTasks);
  const [permissions, setPermissions] = useState(initialPermissions);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<DashboardView>("board");

  useEffect(() => {
    if (initialProject) {
      loadProjectData(initialProject.id).then(() => setIsInitialLoad(false));
    } else {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, []);

  const loadPermissions = async (projectId: string) => {
    const res = await fetch(`/api/projects/${projectId}/me`);
    if (res.ok) {
      const data = await res.json();
      setPermissions({
        role: data.role,
        canCreateTask: data.permissions.canCreateTask,
        canEditTask: data.permissions.canEditTask,
        canDeleteTask: data.permissions.canDeleteTask,
        canMoveTask: data.permissions.canMoveTask,
        canManageColumns: data.permissions.canManageColumns,
        canManageMembers: data.permissions.canManageMembers,
        canChangeRoles: data.permissions.canChangeRoles,
        canCreateAccounts: data.permissions.canCreateAccounts,
        accountCreationAvailable:
          data.permissions.accountCreationAvailable ?? false,
      });
    }
  };

  const loadProjectData = async (projectId: string) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const [swimlanesRes, tasksRes] = await Promise.all([
        supabase
          .from("swimlanes")
          .select("*")
          .eq("project_id", projectId)
          .order("position"),
        fetch(`/api/projects/${projectId}/tasks`).then((res) => res.json()),
        loadPermissions(projectId),
      ]);

      setSwimlanes(swimlanesRes.data || []);
      setTasks(tasksRes || []);
    } catch (error) {
      console.error("Error loading project data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectChange = async (newProject: Tables<"projects">) => {
    setProject(newProject);
    await loadProjectData(newProject.id);
  };

  const handleTaskUpdate = (updatedTask: Tables<"tasks">) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
    );
  };

  const handleTaskCreate = (newTask: Tables<"tasks">) => {
    setTasks((prev) => [...prev, newTask as TaskWithAssignments]);
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleTasksReorder = (reorderedTasks: Tables<"tasks">[]) => {
    setTasks(reorderedTasks as TaskWithAssignments[]);
  };

  const boardPermissions: BoardPermissions = permissions ?? {
    canCreateTask: false,
    canEditTask: false,
    canDeleteTask: false,
    canMoveTask: false,
    canManageColumns: false,
    canCreateAccounts: false,
  };

  const NavItem = ({
    view,
    icon: Icon,
    label,
  }: {
    view: DashboardView;
    icon: LucideIcon;
    label: string;
  }) => (
    <Button
      variant="ghost"
      onClick={() => setCurrentView(view)}
      className={cn(
        "w-full justify-start h-9 rounded-[3px] hover:text-white hover:bg-white/10 cursor-pointer",
        currentView === view
          ? "bg-white/15 text-white font-medium"
          : "text-white/75"
      )}
    >
      {currentView === view && (
        <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#4C9AFF] rounded-r" />
      )}
      <Icon className="w-4 h-4 shrink-0" />
      {isSidebarOpen && <span className="ml-3 text-sm">{label}</span>}
    </Button>
  );

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F5F7]">
        <div className="text-center space-y-4 max-w-md p-8 bg-white rounded-[3px] border border-[#DFE1E6] ads-raised">
          <div className="w-12 h-12 bg-[#DEEBFF] text-[#0052CC] rounded-[3px] flex items-center justify-center mx-auto">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-[#172B4D]">
            Welcome to Velociti
          </h2>
          <p className="text-sm text-[#5E6C84]">
            Create or select a project to open your Jira-style board.
          </p>
          <ProjectSelector
            currentProject={null}
            onProjectChange={handleProjectChange}
          />
        </div>
      </div>
    );
  }

  if (isInitialLoad) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F5F7]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#DEEBFF] border-t-[#0052CC] rounded-full animate-spin" />
          <p className="text-sm text-[#5E6C84]">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F4F5F7] text-[#172B4D]">
      <aside
        className={cn(
          "bg-[#0747A6] text-white flex flex-col transition-all duration-200 relative z-20 shrink-0",
          isSidebarOpen ? "w-[240px]" : "w-14"
        )}
      >
        <div className="h-14 flex items-center px-3 border-b border-white/10 shrink-0">
          <div className="w-8 h-8 rounded-[3px] bg-[#0052CC] flex items-center justify-center shrink-0">
            <span className="font-bold text-sm">V</span>
          </div>
          {isSidebarOpen && (
            <span className="ml-2.5 font-semibold text-sm truncate">
              Velociti
            </span>
          )}
        </div>

        <div className="flex-1 py-4 overflow-y-auto px-2">
          <nav className="space-y-0.5 relative">
            <NavItem view="board" icon={LayoutDashboard} label="Board" />
            <NavItem view="team" icon={Users} label="People" />
            <NavItem view="reports" icon={PieChart} label="Reports" />
          </nav>
        </div>

        <div className="p-3 border-t border-white/10 shrink-0">
          {permissions && isSidebarOpen && (
            <div className="mb-2 px-1">
              <Lozenge variant="info" className="text-[10px] normal-case">
                {ROLE_LABELS[permissions.role]}
              </Lozenge>
            </div>
          )}
          {isSidebarOpen ? (
            <UserMenu user={user} showName side="top" />
          ) : (
            <div className="flex justify-center">
              <UserMenu user={user} showName={false} side="right" />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-16 bg-white border border-[#DFE1E6] rounded-full p-0.5 text-[#5E6C84] hover:text-[#0052CC] shadow-sm z-30 cursor-pointer"
        >
          {isSidebarOpen ? (
            <ChevronLeft className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="h-14 bg-[#0052CC] text-white flex items-center px-4 shrink-0">
          <ProjectHeader
            project={project}
            tasks={tasks}
            user={user}
            onProjectChange={handleProjectChange}
            permissions={permissions}
          />
        </div>

        <div className="flex flex-1 overflow-hidden">
          {currentView === "board" && (
            <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[#5E6C84] text-sm animate-pulse">
                    Loading board...
                  </p>
                </div>
              ) : (
                <SwimLaneBoard
                  projectId={project.id}
                  swimlanes={swimlanes}
                  tasks={tasks}
                  permissions={boardPermissions}
                  onTaskUpdate={handleTaskUpdate}
                  onTaskCreate={handleTaskCreate}
                  onTaskDelete={handleTaskDelete}
                  onTasksReorder={handleTasksReorder}
                  onSwimlanesChange={setSwimlanes}
                />
              )}
            </div>
          )}

          {currentView === "team" && (
            <div className="flex-1 overflow-y-auto bg-[#F4F5F7] p-6">
              <TeamView
                projectId={project.id}
                canManageMembers={permissions?.canManageMembers ?? false}
                canChangeRoles={permissions?.canChangeRoles ?? false}
                canCreateAccounts={permissions?.canCreateAccounts ?? false}
                accountCreationAvailable={
                  permissions?.accountCreationAvailable ?? false
                }
              />
            </div>
          )}

          {currentView === "reports" && (
            <div className="flex-1 overflow-y-auto bg-[#F4F5F7] p-6">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-xl font-semibold text-[#172B4D] mb-1">
                  Reports
                </h2>
                <p className="text-sm text-[#5E6C84] mb-6">
                  Effort estimation and project metrics
                </p>
                <div className="bg-white rounded-[3px] border border-[#DFE1E6] ads-raised">
                  <SEEInsightsPanel tasks={tasks} swimlanes={swimlanes} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
