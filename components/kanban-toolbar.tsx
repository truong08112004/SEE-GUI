"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Columns3, Plus, Search } from "lucide-react";
interface KanbanToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCreateIssue: () => void;
  onManageColumns?: () => void;
  canCreateTask: boolean;
  canManageColumns: boolean;
  totalTasks: number;
}

export function KanbanToolbar({
  searchQuery,
  onSearchChange,
  onCreateIssue,
  onManageColumns,
  canCreateTask,
  canManageColumns,
  totalTasks,
}: KanbanToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-[#FFFFFF] border-b border-[#DFE1E6] shrink-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-[#172B4D] whitespace-nowrap">
          Board
        </h2>
        <span className="text-xs text-[#5E6C84]">{totalTasks} issues</span>
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-[#7A869A]" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search issues..."
            className="h-8 pl-8 text-sm border-2 border-[#DFE1E6] rounded-[3px] bg-[#FAFBFC] focus-visible:border-[#0052CC]"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {canManageColumns && onManageColumns && (
          <Button
            variant="outline"
            size="sm"
            onClick={onManageColumns}
            className="h-8 rounded-[3px] border-2 border-[#DFE1E6] text-[#42526E] hover:bg-[#F4F5F7]"
          >
            <Columns3 className="size-3.5" />
            Edit columns
          </Button>
        )}
        {canCreateTask && (
          <Button
            size="sm"
            onClick={onCreateIssue}
            className="h-8 rounded-[3px] bg-[#0052CC] hover:bg-[#0065FF] text-white font-medium"
          >
            <Plus className="size-3.5" />
            Create issue
          </Button>
        )}
      </div>
    </div>
  );
}
