"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, FolderOpen, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectSelectorProps {
  currentProject: Tables<"projects"> | null;
  onProjectChange: (project: Tables<"projects">) => void;
  variant?: "default" | "topbar";
}

export function ProjectSelector({
  currentProject,
  onProjectChange,
  variant = "default",
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Tables<"projects">[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [canCreateProject, setCanCreateProject] = useState(false);

  useEffect(() => {
    fetchProjects();
    checkCanCreate();
  }, []);

  const checkCanCreate = async () => {
    const res = await fetch("/api/users/me").catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setCanCreateProject(data.is_admin === true);
    }
  };

  const fetchProjects = async () => {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      setProjects(data);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          description: newDescription,
        }),
      });

      if (res.ok) {
        const project = await res.json();
        setProjects((prev) => [project, ...prev]);
        onProjectChange(project);
        setIsCreateOpen(false);
        setNewName("");
        setNewDescription("");
      } else {
        const error = await res.json();
        alert(error.error);
      }
    } catch (error) {
      console.error("Error creating project:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isTopbar = variant === "topbar";

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentProject?.id || ""}
        onValueChange={(id) => {
          const project = projects.find((p) => p.id === id);
          if (project) onProjectChange(project);
        }}
      >
        <SelectTrigger
          className={cn(
            "w-[180px] h-8 text-sm rounded-[3px] border-0 shadow-none",
            isTopbar
              ? "bg-white/10 text-white hover:bg-white/15 [&_svg]:text-white"
              : "border-2 border-[#DFE1E6] bg-white"
          )}
        >
          <FolderOpen className={cn("size-3.5 mr-1.5", isTopbar && "text-white/80")} />
          <SelectValue placeholder="Project" />
          <ChevronDown className={cn("size-3 opacity-60", isTopbar && "text-white")} />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {canCreateProject && (
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setIsCreateOpen(true)}
          className={cn(
            "rounded-[3px]",
            isTopbar && "text-white hover:bg-white/10"
          )}
        >
          <Plus className="size-4" />
        </Button>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="rounded-[8px]">
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>
              New project with default Kanban columns (Backlog → Done)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name"
                className="border-2 border-[#DFE1E6] rounded-[3px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-desc">Description</Label>
              <Textarea
                id="project-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional"
                rows={3}
                className="border-2 border-[#DFE1E6] rounded-[3px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-[3px]">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || isLoading}
              className="rounded-[3px] bg-[#0052CC]"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
