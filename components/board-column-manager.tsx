"use client";

import { useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDown, ArrowUp, Check, GripVertical, Plus, Trash2 } from "lucide-react";

interface BoardColumnManagerProps {
  projectId: string;
  swimlanes: Tables<"swimlanes">[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwimlanesChange: (lanes: Tables<"swimlanes">[]) => void;
}

export function BoardColumnManager({
  projectId,
  swimlanes,
  open,
  onOpenChange,
  onSwimlanesChange,
}: BoardColumnManagerProps) {
  const [lanes, setLanes] = useState(swimlanes);
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const syncFromProps = () => setLanes(swimlanes);

  const handleOpen = (v: boolean) => {
    if (v) syncFromProps();
    onOpenChange(v);
  };

  const addColumn = async () => {
    if (!newName.trim()) return;
    const res = await fetch(`/api/projects/${projectId}/swimlanes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const col = await res.json();
      const updated = [...lanes, col];
      setLanes(updated);
      onSwimlanesChange(updated);
      setNewName("");
    } else {
      const err = await res.json();
      alert(err.error || "Failed to add column");
    }
  };

  const deleteColumn = async (id: string) => {
    if (lanes.length <= 1) return;
    if (!confirm("Delete this column? Tasks will move to the first column.")) return;
    const res = await fetch(
      `/api/projects/${projectId}/swimlanes/${id}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      const updated = lanes.filter((l) => l.id !== id);
      setLanes(updated);
      onSwimlanesChange(updated);
    } else {
      const err = await res.json();
      alert(err.error || "Failed to delete column");
    }
  };

  const renameColumn = (id: string, name: string) => {
    setLanes((prev) =>
      prev.map((l) => (l.id === id ? { ...l, name } : l))
    );
  };

  const saveOneColumn = async (lane: Tables<"swimlanes">) => {
    const original = swimlanes.find((s) => s.id === lane.id);
    if (!original || original.name === lane.name.trim()) return;

    setSavingId(lane.id);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/swimlanes/${lane.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: lane.name.trim() }),
        }
      );
      if (res.ok) {
        const updated = await res.json();
        const next = lanes.map((l) => (l.id === lane.id ? updated : l));
        setLanes(next);
        onSwimlanesChange(next);
      }
    } finally {
      setSavingId(null);
    }
  };

  const saveAll = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/swimlanes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columns: lanes.map((l, i) => ({
            id: l.id,
            name: l.name.trim(),
            position: i,
          })),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onSwimlanesChange(updated);
        onOpenChange(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save columns");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const moveColumn = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= lanes.length) return;
    const next = [...lanes];
    [next[index], next[target]] = [next[target], next[index]];
    setLanes(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="rounded-[8px] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#172B4D]">Edit board columns</DialogTitle>
          <DialogDescription className="text-[#5E6C84]">
            Rename, reorder, add or remove columns. Use ✓ to save a single name, or Save all for order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2 max-h-[360px] overflow-y-auto">
          {lanes.map((lane, index) => (
            <div
              key={lane.id}
              className="flex items-center gap-1.5 p-2 rounded-[3px] border border-[#DFE1E6] bg-[#FAFBFC]"
            >
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => moveColumn(index, -1)}
                  disabled={index === 0}
                  className="p-0.5 text-[#7A869A] hover:text-[#172B4D] disabled:opacity-30"
                  title="Move up"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveColumn(index, 1)}
                  disabled={index === lanes.length - 1}
                  className="p-0.5 text-[#7A869A] hover:text-[#172B4D] disabled:opacity-30"
                  title="Move down"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </div>
              <GripVertical className="size-4 text-[#C1C7D0] shrink-0" />
              <Input
                value={lane.name}
                onChange={(e) => renameColumn(lane.id, e.target.value)}
                onBlur={() => saveOneColumn(lane)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveOneColumn(lane);
                }}
                className="h-8 flex-1 border-2 border-[#DFE1E6] rounded-[3px] text-sm"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => saveOneColumn(lane)}
                disabled={savingId === lane.id}
                className="text-[#00875A] hover:bg-[#E3FCEF] shrink-0"
                title="Save name"
              >
                <Check className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => deleteColumn(lane.id)}
                disabled={lanes.length <= 1}
                className="text-[#DE350B] hover:bg-[#FFEBE6] shrink-0"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New column name..."
            className="h-8 border-2 border-[#DFE1E6] rounded-[3px]"
            onKeyDown={(e) => e.key === "Enter" && addColumn()}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addColumn}
            disabled={!newName.trim()}
            className="shrink-0 rounded-[3px]"
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-[3px]">
            Cancel
          </Button>
          <Button onClick={saveAll} disabled={isSaving} className="rounded-[3px] bg-[#0052CC]">
            {isSaving ? "Saving..." : "Save order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
