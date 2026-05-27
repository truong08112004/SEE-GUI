"use client";

import { useRef, useState, useMemo } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { SwimLaneColumn } from "@/components/swim-lane-column";
import { KanbanToolbar } from "@/components/kanban-toolbar";
import { BoardColumnManager } from "@/components/board-column-manager";
import { TaskDialog } from "@/components/task-dialog";
import { useTaskDragDrop } from "@/hooks/use-task-drag-drop";

export interface BoardPermissions {
  canCreateTask: boolean;
  canEditTask: boolean;
  canDeleteTask: boolean;
  canMoveTask: boolean;
  canManageColumns: boolean;
}

interface SwimLaneBoardProps {
  projectId: string;
  swimlanes: Tables<"swimlanes">[];
  tasks: Tables<"tasks">[];
  permissions: BoardPermissions;
  onTaskUpdate: (task: Tables<"tasks">) => void;
  onTaskCreate: (task: Tables<"tasks">) => void;
  onTaskDelete: (taskId: string) => void;
  onTasksReorder?: (tasks: Tables<"tasks">[]) => void;
  onSwimlanesChange: (lanes: Tables<"swimlanes">[]) => void;
}

export function SwimLaneBoard({
  projectId,
  swimlanes,
  tasks,
  permissions,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  onTasksReorder,
  onSwimlanesChange,
}: SwimLaneBoardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [defaultSwimlaneId, setDefaultSwimlaneId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef<{
    active: boolean;
    startX: number;
    startScrollLeft: number;
  }>({ active: false, startX: 0, startScrollLeft: 0 });

  const {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  } = useTaskDragDrop(projectId, permissions.canMoveTask);

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    );
  }, [tasks, searchQuery]);

  const handleTasksReorder = (updatedTasks: Tables<"tasks">[]) => {
    onTasksReorder?.(updatedTasks);
  };

  const handleSwimlaneUpdate = (updated: Tables<"swimlanes">) => {
    onSwimlanesChange(
      swimlanes.map((s) => (s.id === updated.id ? updated : s))
    );
  };

  const openCreateIssue = () => {
    const backlog =
      swimlanes.find((s) => s.name.toLowerCase().includes("backlog")) ||
      swimlanes.find((s) => s.name.toLowerCase().includes("to do")) ||
      swimlanes[0];
    setDefaultSwimlaneId(backlog?.id ?? swimlanes[0]?.id ?? null);
    setCreateDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden bg-[#F4F5F7]">
      <KanbanToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreateIssue={openCreateIssue}
        onManageColumns={() => setColumnManagerOpen(true)}
        canCreateTask={permissions.canCreateTask}
        canManageColumns={permissions.canManageColumns}
        totalTasks={filteredTasks.length}
      />

      <div
        ref={scrollRef}
        className="flex-1 w-full max-w-full overflow-x-scroll overflow-y-hidden kanban-scroll overscroll-x-contain touch-pan-x"
        onWheel={(e) => {
          // Many mice only have vertical wheel; map it to horizontal scrolling for Kanban.
          // Keep default behavior for trackpads (deltaX) and Shift+wheel.
          const el = scrollRef.current;
          if (!el) return;
          if (e.shiftKey) return;
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
          if (e.deltaY === 0) return;
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }}
        onMouseDown={(e) => {
          // Drag-to-pan only when dragging empty board background (avoid interfering with cards/controls).
          if (e.button !== 0) return;
          if (e.target !== e.currentTarget) return;
          const el = scrollRef.current;
          if (!el) return;
          panRef.current = {
            active: true,
            startX: e.clientX,
            startScrollLeft: el.scrollLeft,
          };
        }}
        onMouseMove={(e) => {
          const el = scrollRef.current;
          if (!el) return;
          if (!panRef.current.active) return;
          const dx = e.clientX - panRef.current.startX;
          el.scrollLeft = panRef.current.startScrollLeft - dx;
        }}
        onMouseUp={() => {
          panRef.current.active = false;
        }}
        onMouseLeave={() => {
          panRef.current.active = false;
        }}
      >
        <div className="flex gap-3 p-4 h-full min-w-max">
          {swimlanes.map((swimlane) => {
            const swimlaneTasks = filteredTasks
              .filter((task) => task.swimlane_id === swimlane.id)
              .sort((a, b) => a.position - b.position);
            const isDropTarget = dragState.targetSwimLaneId === swimlane.id;

            return (
              <SwimLaneColumn
                key={swimlane.id}
                projectId={projectId}
                swimlane={swimlane}
                tasks={swimlaneTasks}
                allTasks={tasks}
                permissions={permissions}
                onTaskUpdate={onTaskUpdate}
                onTaskCreate={onTaskCreate}
                onTaskDelete={onTaskDelete}
                onSwimlaneUpdate={handleSwimlaneUpdate}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) =>
                  handleDrop(
                    e,
                    swimlane.id,
                    swimlane.name,
                    swimlaneTasks,
                    tasks,
                    handleTasksReorder
                  )
                }
                onDragEnd={handleDragEnd}
                isDropTarget={isDropTarget}
                isDragging={!!dragState.draggedTaskId}
              />
            );
          })}
        </div>
      </div>

      <BoardColumnManager
        projectId={projectId}
        swimlanes={swimlanes}
        open={columnManagerOpen}
        onOpenChange={setColumnManagerOpen}
        onSwimlanesChange={onSwimlanesChange}
      />

      {defaultSwimlaneId && (
        <TaskDialog
          projectId={projectId}
          swimlaneId={defaultSwimlaneId}
          task={null}
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onTaskUpdate={onTaskUpdate}
          onTaskCreate={onTaskCreate}
          onTaskDelete={onTaskDelete}
          readOnly={!permissions.canCreateTask}
        />
      )}
    </div>
  );
}
