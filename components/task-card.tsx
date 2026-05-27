"use client";

import type React from "react";
import { useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getEffortColorClass } from "@/lib/see-model";
import { Zap, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTaskEffortPm } from "@/lib/task-effort";

interface TaskAssignment {
  id: string;
  users: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface TaskCardProps {
  task: Tables<"tasks"> & { task_assignments?: TaskAssignment[] };
  onClick: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isInDoneSwimlane?: boolean;
  canDrag?: boolean;
  issueKey?: string;
}

export function TaskCard({
  task,
  onClick,
  onDragStart,
  onDragEnd,
  isInDoneSwimlane = false,
  canDrag = true,
  issueKey,
}: TaskCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { effortPm } = getTaskEffortPm(task);
  const effortColorClass = effortPm ? getEffortColorClass(effortPm) : "";

  const draggable = canDrag;

  const handleDragStart = (e: React.DragEvent) => {
    if (!draggable) {
      e.preventDefault();
      return;
    }
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
    onDragStart?.();
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd?.();
  };

  const getInitials = (name: string | null, email: string) => {
    if (name)
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    return email[0].toUpperCase();
  };

  const assignments = task.task_assignments || [];

  return (
    <div
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn(
        "bg-white rounded-[3px] border border-[#DFE1E6] p-3 ads-raised transition-all",
        "hover:border-[#0052CC]/40 hover:ads-overlay group min-h-[48px]",
        draggable && "cursor-grab active:cursor-grabbing",
        !draggable && "cursor-pointer",
        isDragging && "opacity-50 rotate-1",
        isInDoneSwimlane && "opacity-90"
      )}
      onClick={(e) => {
        if (!isDragging) onClick();
      }}
    >
      <div className="flex items-start gap-1.5 mb-1.5">
        {draggable && (
          <GripVertical className="size-3.5 text-[#C1C7D0] group-hover:text-[#7A869A] shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
        <div className="flex-1 min-w-0">
          {issueKey && (
            <span className="text-[11px] font-mono text-[#5E6C84] block mb-0.5">
              {issueKey}
            </span>
          )}
          <p
            className={cn(
              "text-sm text-[#172B4D] leading-snug line-clamp-2",
              isInDoneSwimlane && "line-through text-[#5E6C84]"
            )}
          >
            {task.title}
          </p>
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-[#5E6C84] line-clamp-2 mb-2 pl-5">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 pl-5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {effortPm > 0 && (
            <Badge
              variant="outline"
              className={cn(
                "rounded-[3px] text-[10px] h-5 border-[#DFE1E6]",
                effortColorClass
              )}
            >
              <Zap className="size-2.5 mr-0.5" />
              {effortPm.toFixed(1)} PM
            </Badge>
          )}
        </div>

        {assignments.length > 0 && (
          <div className="flex -space-x-1.5">
            {assignments.slice(0, 3).map((assignment) => (
              <Avatar
                key={assignment.id}
                className="size-6 border-2 border-white rounded-full"
              >
                <AvatarImage
                  src={assignment.users?.avatar_url || undefined}
                />
                <AvatarFallback className="text-[9px] bg-[#0052CC] text-white">
                  {getInitials(
                    assignment.users?.full_name || null,
                    assignment.users?.email || ""
                  )}
                </AvatarFallback>
              </Avatar>
            ))}
            {assignments.length > 3 && (
              <div className="size-6 rounded-full bg-[#DFE1E6] border-2 border-white flex items-center justify-center">
                <span className="text-[9px] text-[#5E6C84]">
                  +{assignments.length - 3}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
