"use client";

import { useState, useRef, useEffect } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lozenge, swimlaneLozengeVariant } from "@/components/ui/lozenge";
import { Check, Pencil, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface KanbanColumnHeaderProps {
  projectId: string;
  swimlane: Tables<"swimlanes">;
  taskCount: number;
  canManageColumns: boolean;
  canCreateTask: boolean;
  onSwimlaneUpdate: (lane: Tables<"swimlanes">) => void;
  onCreateTask: () => void;
}

export function KanbanColumnHeader({
  projectId,
  swimlane,
  taskCount,
  canManageColumns,
  canCreateTask,
  onSwimlaneUpdate,
  onCreateTask,
}: KanbanColumnHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(swimlane.name);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setEditName(swimlane.name);
  }, [swimlane.name, isEditing]);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const saveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === swimlane.name) {
      setIsEditing(false);
      setEditName(swimlane.name);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/swimlanes/${swimlane.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        }
      );
      if (res.ok) {
        const updated = await res.json();
        onSwimlaneUpdate(updated);
        setIsEditing(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to rename column");
        setEditName(swimlane.name);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditName(swimlane.name);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between px-3 py-2.5 shrink-0 gap-1">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isEditing ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <Input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") cancelEdit();
              }}
              disabled={isSaving}
              className="h-7 text-xs border-2 border-[#0052CC] rounded-[3px] flex-1 min-w-0"
            />
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={saveName}
              disabled={isSaving}
              className="size-7 text-[#00875A] shrink-0"
            >
              <Check className="size-3.5" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={cancelEdit}
              className="size-7 text-[#5E6C84] shrink-0"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <>
            <Lozenge variant={swimlaneLozengeVariant(swimlane.name)}>
              {swimlane.name}
            </Lozenge>
            <span className="text-xs font-medium text-[#5E6C84] bg-[#DFE1E6] rounded-full px-1.5 min-w-[20px] text-center">
              {taskCount}
            </span>
            {canManageColumns && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-1 rounded-[3px] text-[#7A869A] hover:text-[#0052CC] hover:bg-[#DEEBFF] shrink-0"
                title="Rename column"
              >
                <Pencil className="size-3" />
              </button>
            )}
          </>
        )}
      </div>
      {canCreateTask && !isEditing && (
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onCreateTask}
          className="size-7 text-[#5E6C84] hover:text-[#172B4D] hover:bg-[#DFE1E6] rounded-[3px] shrink-0"
        >
          <Plus className="size-4" />
        </Button>
      )}
    </div>
  );
}
