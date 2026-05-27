"use client";

import type React from "react";
import { useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import type { BoardPermissions } from "@/components/swim-lane-board";
import { KanbanColumnHeader } from "@/components/kanban-column-header";
import { TaskCard } from "@/components/task-card";
import { TaskDialog } from "@/components/task-dialog";
import { cn } from "@/lib/utils";
import { getTaskEffortPm } from "@/lib/task-effort";

interface SwimLaneColumnProps {
  projectId: string;
  swimlane: Tables<"swimlanes">;
  tasks: Tables<"tasks">[];
  allTasks: Tables<"tasks">[];
  permissions: BoardPermissions;
  onTaskUpdate: (task: Tables<"tasks">) => void;
  onTaskCreate: (task: Tables<"tasks">) => void;
  onTaskDelete: (taskId: string) => void;
  onSwimlaneUpdate: (lane: Tables<"swimlanes">) => void;
  onDragStart: (taskId: string, swimlaneId: string, swimlaneName?: string) => void;
  onDragOver: (e: React.DragEvent, swimlaneId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDropTarget: boolean;
  isDragging: boolean;
}

export function SwimLaneColumn({
  projectId,
  swimlane,
  tasks,
  allTasks,
  permissions,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  onSwimlaneUpdate,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isDropTarget,
  isDragging,
}: SwimLaneColumnProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Tables<"tasks"> | null>(null);

  const handleTaskClick = (task: Tables<"tasks">) => {
    setSelectedTask(task);
    setIsDialogOpen(true);
  };

  const handleCreateTask = () => {
    if (!permissions.canCreateTask) return;
    setSelectedTask(null);
    setIsDialogOpen(true);
  };

  const totalEffort = tasks.reduce(
    (sum, task) => sum + getTaskEffortPm(task).effortPm,
    0
  );

  const isDone = swimlane.name.toLowerCase() === "done";

  return (
    <>
      <div
        className={cn(
          "group/col flex flex-col w-[280px] shrink-0 max-h-full",
          "bg-[#EBECF0] rounded-[3px]"
        )}
      >
        <KanbanColumnHeader
          projectId={projectId}
          swimlane={swimlane}
          taskCount={tasks.length}
          canManageColumns={permissions.canManageColumns}
          canCreateTask={permissions.canCreateTask}
          onSwimlaneUpdate={onSwimlaneUpdate}
          onCreateTask={handleCreateTask}
        />

        {totalEffort > 0 && (
          <p className="px-3 pb-1 text-[11px] text-[#7A869A]">
            {totalEffort.toFixed(1)} PM estimated
          </p>
        )}

        <div
          className={cn(
            "flex-1 overflow-y-auto kanban-scroll px-2 pb-2 space-y-2 min-h-[120px] rounded-[3px] transition-colors",
            isDropTarget && "bg-[#DEEBFF]/60 ring-2 ring-[#0052CC] ring-inset",
            isDragging && !isDropTarget && "bg-[#DFE1E6]/40"
          )}
          onDragOver={(e) => permissions.canMoveTask && onDragOver(e, swimlane.id)}
          onDragLeave={onDragLeave}
          onDrop={permissions.canMoveTask ? onDrop : undefined}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => handleTaskClick(task)}
              onDragStart={() =>
                onDragStart(task.id, swimlane.id, swimlane.name)
              }
              onDragEnd={onDragEnd}
              isInDoneSwimlane={isDone}
              canDrag={permissions.canMoveTask}
              issueKey={`${projectId.slice(0, 4).toUpperCase()}-${task.position + 1}`}
            />
          ))}

          {tasks.length === 0 && (
            <div className="p-4 rounded-[3px] border border-dashed border-[#C1C7D0] bg-[#F4F5F7]/80 text-center">
              <p className="text-xs text-[#7A869A]">
                {isDragging ? "Drop issue here" : "No issues"}
              </p>
            </div>
          )}
        </div>
      </div>

      <TaskDialog
        projectId={projectId}
        swimlaneId={swimlane.id}
        task={selectedTask}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onTaskUpdate={onTaskUpdate}
        onTaskCreate={onTaskCreate}
        onTaskDelete={onTaskDelete}
        readOnly={!permissions.canEditTask && !!selectedTask}
        canDelete={permissions.canDeleteTask}
      />
    </>
  );
}
