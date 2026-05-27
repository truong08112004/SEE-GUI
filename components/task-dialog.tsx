"use client";

import React, { useState, useEffect } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TaskAssigneePicker } from "@/components/task-assignee-picker";
import { ChinaAttributeSlider } from "@/components/china-attribute-slider";
import { estimateEffortChina, hoursToMonths, CHINA_DESCRIPTORS, getAttributeLabel, type ChinaAttributes } from "@/lib/china-model";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskComments } from "@/components/task-comments";
import { ChinaAttributesGuide } from "@/components/china-attributes-guide";
import { useChinaPrediction, type ChinaPredictionResult } from "@/hooks/use-china-prediction";
import { Users, MessageSquare, Calendar, Clock, BarChart3, Save, HelpCircle, Calculator, TrendingUp, TrendingDown, Loader2, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";

interface TaskAssignment {
  id: string;
  assigned_at: string | null;
  users: Tables<"users"> | null;
}

interface TaskDialogProps {
  projectId: string;
  swimlaneId: string;
  task: Tables<"tasks"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdate?: (task: Tables<"tasks">) => void;
  onTaskCreate?: (task: Tables<"tasks">) => void;
  onTaskDelete?: (taskId: string) => void;
  readOnly?: boolean;
  canDelete?: boolean;
}

export function TaskDialog({
  projectId,
  swimlaneId,
  task,
  open,
  onOpenChange,
  readOnly = false,
  canDelete = false,
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
}: TaskDialogProps) {
  const [mode, setMode] = useState<"view" | "edit" | "create">("create");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attributes, setAttributes] = useState<ChinaAttributes>({
    afp: 200,
    input: 30,
    output: 40,
    enquiry: 20,
    file: 15,
    interface: 10,
    resource: 5,
    duration: 12,
  });
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<TaskAssignment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDoneSwimlane, setIsDoneSwimlane] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [apiPrediction, setApiPrediction] = useState<ChinaPredictionResult | null>(null);
  const { predict, loading: predicting } = useChinaPrediction();

  useEffect(() => {
    // Fetch current user ID and check if swimlane is "Done"
    const fetchCurrentUser = async () => {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data: dbUser } = await supabase
          .from("users")
          .select("id")
          .eq("user_auth_id", authUser.id)
          .single();

        if (dbUser) {
          setCurrentUserId(dbUser.id);
        }
      }
    };

    const checkSwimlane = async () => {
      if (swimlaneId) {
        const supabase = createClient();
        const { data: swimlane } = await supabase
          .from("swimlanes")
          .select("name")
          .eq("id", swimlaneId)
          .single();
        
        if (swimlane) {
          setIsDoneSwimlane(swimlane.name.toLowerCase() === "done");
        }
      }
    };

    fetchCurrentUser();
    checkSwimlane();

    if (task) {
      setMode("view");
      setTitle(task.title);
      setDescription(task.description || "");
      setAttributes({
        afp: task.attr_afp || 200,
        input: task.attr_input || 30,
        output: task.attr_output || 40,
        enquiry: task.attr_enquiry || 20,
        file: task.attr_file || 15,
        interface: task.attr_interface || 10,
        resource: task.attr_resource || 5,
        duration: task.attr_duration || 12,
      });
      fetchAssignments(task.id);
    } else {
      setMode("create");
      setTitle("");
      setDescription("");
      setAttributes({
        afp: 200,
        input: 30,
        output: 40,
        enquiry: 20,
        file: 15,
        interface: 10,
        resource: 5,
        duration: 12,
      });
      setAssignments([]);
      setPendingAssignments([]);
      setApiPrediction(null);
    }
  }, [task, open, swimlaneId]);

  const fetchAssignments = async (taskId: string) => {
    const res = await fetch(
      `/api/projects/${projectId}/tasks/${taskId}/assignments`
    );
    if (res.ok) {
      const data = await res.json();
      setAssignments(data);
    }
  };

  const handleEstimate = async () => {
    try {
      const result = await predict({
        AFP: attributes.afp,
        Input: attributes.input,
        Output: attributes.output,
        Enquiry: attributes.enquiry,
        File: attributes.file,
        Interface: attributes.interface,
        Resource: attributes.resource,
        Duration: attributes.duration,
      });
      setApiPrediction(result);
    } catch (error) {
      console.error("Prediction error:", error);
    }
  };

  const getEstimatedEffortPmForSave = () => {
    if (apiPrediction?.prediction_pm != null) return apiPrediction.prediction_pm;
    return hoursToMonths(estimateEffortChina(attributes));
  };

  const buildTaskPayload = () => {
    return {
      title: title.trim(),
      description: description || null,
      attr_afp: attributes.afp,
      attr_input: attributes.input,
      attr_output: attributes.output,
      attr_enquiry: attributes.enquiry,
      attr_file: attributes.file,
      attr_interface: attributes.interface,
      attr_resource: attributes.resource,
      attr_duration: attributes.duration,
      estimated_effort_pm: getEstimatedEffortPmForSave(),
    };
  };

  const handleUpdate = async () => {
    if (!task || !title.trim() || !onTaskUpdate) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildTaskPayload()),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Update failed");
      }

      const updated = await res.json();
      onTaskUpdate(updated);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !onTaskDelete) return;
    if (!confirm(`Delete task "${task.title}"? This cannot be undone.`)) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Delete failed");
      }

      onTaskDelete(task.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !onTaskCreate) return;

    setIsLoading(true);
    const supabase = createClient();

    try {
      const payload = buildTaskPayload();

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          project_id: projectId,
          swimlane_id: swimlaneId,
          ...payload,
          position: 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Assign pending users after task creation
      if (data && pendingAssignments.length > 0) {
        const assignPromises = pendingAssignments.map((a) =>
          fetch(`/api/projects/${projectId}/tasks/${data.id}/assignments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: a.users?.id }),
          })
        );
        await Promise.all(assignPromises);
      }

      if (data) onTaskCreate(data);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Existing task — view (Details/Comments). Edit is explicit via button.
  if (task && mode === "view") {
    const taskAttributes: ChinaAttributes = {
      afp: task.attr_afp || 200,
      input: task.attr_input || 30,
      output: task.attr_output || 40,
      enquiry: task.attr_enquiry || 20,
      file: task.attr_file || 15,
      interface: task.attr_interface || 10,
      resource: task.attr_resource || 5,
      duration: task.attr_duration || 12,
    };

    const effortHours = estimateEffortChina(taskAttributes);
    const estimatedEffort = task.estimated_effort_pm || hoursToMonths(effortHours);

    // Calculate actual effort if we have dates but no stored value
    // Show actual effort if task is in Done swimlane OR has end_date
    let actualEffort = task.actual_effort_pm;
    const shouldShowActualEffort = isDoneSwimlane || task.end_date;
    
    if (shouldShowActualEffort) {
      if (!actualEffort) {
        // Calculate from dates if not stored
        const endDateValue = task.end_date || (isDoneSwimlane ? new Date().toISOString() : null);
        const startDateValue = task.start_date || task.created_at;
        
        if (endDateValue && startDateValue) {
          const startDate = new Date(startDateValue);
          const endDate = new Date(endDateValue);
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          // Convert days to person-months (assuming 20 working days per month)
          actualEffort = Math.round((diffDays / 20) * 100) / 100;
        }
      }
    }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] sm:!max-w-[95vw] md:!max-w-[95vw] lg:!max-w-[95vw] xl:!max-w-[95vw] max-h-[95vh] flex flex-col p-0 gap-0">
        {/* Jira-style Header */}
        <DialogHeader className="px-6 py-4 border-b bg-slate-50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl font-semibold text-slate-900 mb-1 break-words">
                {task.title}
              </DialogTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                <span className="font-medium">Task</span>
                <span>•</span>
                <span className="font-mono text-xs">{task.id.slice(0, 8)}</span>
              </div>
            </div>
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMode("edit");
                  setApiPrediction(null);
                }}
                className="h-8 shrink-0"
              >
                <Pencil className="size-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Main Content - Two Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column - Main Content */}
          <div className="flex-1 overflow-y-auto p-6 min-w-0">
            <Tabs defaultValue="details" className="flex flex-col h-full">
              <TabsList className="w-fit mb-6">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="comments">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Discussion
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="flex-1 space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
                  <div className="bg-white border border-slate-200 rounded-md p-4 min-h-[100px]">
                    {task.description ? (
                      <p className="text-slate-900 whitespace-pre-wrap">{task.description}</p>
                    ) : (
                      <p className="text-slate-400 italic">No description provided</p>
                    )}
                  </div>
                </div>

                {/* China Dataset Attributes */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      China Dataset Attributes
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowGuide(true)}
                      className="h-7 px-2 text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                    >
                      <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                      How to estimate
                    </Button>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-md p-4 space-y-4">
                    {Object.entries(CHINA_DESCRIPTORS).map(([key, descriptor]) => {
                      const value = taskAttributes[key as keyof ChinaAttributes];
                      const attributeCode = key.toUpperCase();
                      return (
                        <div key={key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-slate-900 flex items-center gap-2">
                              {descriptor.label}
                              <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                {attributeCode}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{descriptor.description}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-slate-100 rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full transition-all"
                                style={{
                                  width: `${((value - descriptor.min) / (descriptor.max - descriptor.min)) * 100}%`,
                                }}
                              />
                            </div>
                            <div className="w-24 text-right">
                              <span className="font-medium text-sm text-slate-900">{value}</span>
                              <span className="text-xs text-slate-500 ml-1">
                                ({getAttributeLabel(value, key as keyof ChinaAttributes)})
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="comments" className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 min-h-0">
                  <TaskComments
                    projectId={projectId}
                    taskId={task.id}
                    currentUserId={currentUserId || undefined}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Metadata Sidebar (Jira-style) */}
          <div className="w-80 border-l border-slate-200 bg-slate-50 overflow-y-auto p-6 shrink-0">
            <div className="space-y-6">
              {/* Assignees */}
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                  Assignees
                </Label>
                <div className="bg-white border border-slate-200 rounded-md p-3">
                  {assignments.length > 0 ? (
                    <div className="space-y-2">
                      {assignments.map((assignment) => (
                        <div key={assignment.id} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-700">
                            {assignment.users?.full_name?.[0] || assignment.users?.email?.[0] || "?"}
                          </div>
                          <span className="text-sm text-slate-900">
                            {assignment.users?.full_name || assignment.users?.email || "Unassigned"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">Unassigned</span>
                  )}
                </div>
              </div>

              {/* Estimated Effort */}
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                  Estimated Effort
                </Label>
                <div className="bg-white border border-slate-200 rounded-md p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-lg font-semibold text-slate-900">
                      {estimatedEffort.toFixed(2)} PM
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Person Months</p>
                </div>
              </div>

              {/* Actual Effort - Show if task is in Done swimlane or has end_date */}
              {shouldShowActualEffort && actualEffort && (
                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                    Actual Effort
                  </Label>
                  <div className="bg-white border border-slate-200 rounded-md p-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-600" />
                      <span className="text-lg font-semibold text-slate-900">
                        {actualEffort.toFixed(2)} PM
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate-500">Person Months</p>
                      {estimatedEffort > 0 && (
                        <span
                          className={`text-xs font-medium ${
                            actualEffort > estimatedEffort
                              ? "text-red-600"
                              : actualEffort < estimatedEffort * 0.9
                              ? "text-green-600"
                              : "text-slate-600"
                          }`}
                        >
                          {actualEffort > estimatedEffort ? "+" : ""}
                          {((actualEffort - estimatedEffort) / estimatedEffort * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    {(task.start_date || task.created_at) && (task.end_date || isDoneSwimlane) && (
                      <p className="text-xs text-slate-400 mt-1">
                        {format(new Date(task.start_date || task.created_at!), "MMM d")} - {format(new Date(task.end_date || new Date()), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Created Date */}
              {task.created_at && (
                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                    Created
                  </Label>
                  <div className="bg-white border border-slate-200 rounded-md p-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-900">
                        {format(new Date(task.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Updated Date */}
              {task.updated_at && (
                <div>
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                    {task.updated_at !== task.created_at ? "Last Updated" : "Updated"}
                  </Label>
                  <div className="bg-white border border-slate-200 rounded-md p-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-900">
                        {format(new Date(task.updated_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <ChinaAttributesGuide open={showGuide} onOpenChange={setShowGuide} />
  </>
  );
  }

  // Existing task — edit mode (only via Edit button)
  if (task && mode === "edit" && !readOnly) {
    return (
      <React.Fragment>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="!max-w-[95vw] !w-[95vw] sm:!max-w-[95vw] md:!max-w-[95vw] lg:!max-w-[95vw] xl:!max-w-[95vw] max-h-[95vh] flex flex-col p-0 gap-0">
            <DialogHeader className="px-6 py-4 border-b bg-slate-50 shrink-0">
              <DialogTitle className="text-2xl font-semibold text-slate-900">
                Edit Task
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6 max-w-2xl w-full mx-auto">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Task Title</Label>
                  <Input
                    id="edit-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="size-4" />
                    Assignees
                  </Label>
                  <TaskAssigneePicker
                    projectId={projectId}
                    taskId={task.id}
                    assignments={assignments}
                    onAssignmentsChange={setAssignments}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">China Dataset Attributes</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowGuide(true)}
                      className="h-6 px-2 text-xs"
                    >
                      <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                      How to estimate
                    </Button>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEstimate}
                      disabled={predicting}
                      className="h-8"
                    >
                      {predicting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Estimating...
                        </>
                      ) : (
                        <>
                          <Calculator className="w-3.5 h-3.5 mr-1.5" />
                          Estimate
                        </>
                      )}
                    </Button>
                  </div>

                  {predicting && (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-indigo-900">Estimating…</div>
                        <Loader2 className="w-4 h-4 text-indigo-700 animate-spin" />
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-indigo-200">
                        <div className="space-y-3">
                          <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
                          <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
                          <div className="h-5 w-28 bg-slate-100 rounded animate-pulse" />
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Running offline effort model (simulating API latency)…
                      </p>
                    </div>
                  )}

                  {apiPrediction && !predicting && (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-3">
                      <div className="text-sm font-semibold text-indigo-900">Rule-based estimate</div>
                      <div className="bg-white rounded-lg p-4 border border-indigo-200">
                        <div className="text-center">
                          <p className="text-xs text-slate-600 mb-1">Estimated Effort</p>
                          <div className="text-3xl font-bold text-indigo-600">
                            {apiPrediction.prediction.toLocaleString()}
                          </div>
                          <p className="text-sm text-slate-700 mt-1">person-hours</p>
                          <Badge variant="secondary" className="mt-2">
                            {apiPrediction.prediction_pm.toFixed(2)} person-months
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                  {Object.entries(CHINA_DESCRIPTORS).map(([key, descriptor]) => (
                    <ChinaAttributeSlider
                      key={key}
                      attribute={key as keyof ChinaAttributes}
                      value={attributes[key as keyof ChinaAttributes]}
                      onChange={(value) =>
                        setAttributes((prev) => ({ ...prev, [key]: value }))
                      }
                      descriptor={descriptor}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-slate-50 flex justify-between gap-2">
              <div>
                {canDelete && (
                  <Button
                    variant="outline"
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="size-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMode("view");
                    setApiPrediction(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={!title.trim() || isLoading}>
                  <Save className="size-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <ChinaAttributesGuide open={showGuide} onOpenChange={setShowGuide} />
      </React.Fragment>
    );
  }

  // For new tasks - create form
  const effortHours = estimateEffortChina(attributes);
  const estimatedEffort = hoursToMonths(effortHours);

  return (
    <React.Fragment>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] sm:!max-w-[95vw] md:!max-w-[95vw] lg:!max-w-[95vw] xl:!max-w-[95vw] max-h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b bg-slate-50 shrink-0">
          <DialogTitle className="text-2xl font-semibold text-slate-900 text-center">
            Create New Task
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6 max-w-2xl w-full mx-auto">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the task..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="size-4" />
                Assignees
              </Label>
              <TaskAssigneePicker
                projectId={projectId}
                assignments={pendingAssignments}
                onAssignmentsChange={setPendingAssignments}
                pendingMode
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">China Dataset Attributes</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGuide(true)}
                    className="h-6 px-2 text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                  >
                    <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                    How to estimate
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEstimate}
                  disabled={predicting}
                  className="h-8"
                >
                  {predicting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Estimating...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-3.5 h-3.5 mr-1.5" />
                      Estimate
                    </>
                  )}
                </Button>
              </div>

              {predicting && (
                <div className="border-2 border-indigo-200 rounded-lg p-4 bg-indigo-50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-semibold text-sm text-indigo-900">Rule-based estimate</h5>
                    <Loader2 className="w-4 h-4 text-indigo-700 animate-spin" />
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-indigo-200">
                    <div className="space-y-3">
                      <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
                      <div className="h-10 w-56 bg-slate-100 rounded animate-pulse" />
                      <div className="h-5 w-28 bg-slate-100 rounded animate-pulse" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-600">
                    Running offline effort model (simulating API latency)…
                  </p>
                </div>
              )}

              {apiPrediction && !predicting && (
                <div className="border-2 border-indigo-200 rounded-lg p-4 bg-indigo-50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-semibold text-sm text-indigo-900">Rule-based estimate</h5>
                    {/* <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-300">
                      {apiPrediction.model_version}
                    </Badge> */}
                  </div>

                  {/* Effort Display */}
                  <div className="bg-white rounded-lg p-4 border border-indigo-200">
                    <div className="text-center">
                      <p className="text-xs text-slate-600 mb-1">Estimated Effort</p>
                      <div className="text-3xl font-bold text-indigo-600">
                        {apiPrediction.prediction.toLocaleString()}
                      </div>
                      <p className="text-sm text-slate-700 mt-1">person-hours</p>
                      <Badge variant="secondary" className="mt-2">
                        {apiPrediction.prediction_pm.toFixed(2)} person-months
                      </Badge>
                    </div>
                  </div>

                  {/* Feature Importance */}
                  <div className="space-y-2">
                    <h6 className="text-xs font-semibold text-indigo-900">Feature Importance</h6>
                    <div className="space-y-1.5">
                      {apiPrediction.feature_importance
                        .sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance))
                        .slice(0, 5)
                        .map((item) => {
                          const isPositive = item.importance > 0;
                          const absValue = Math.abs(item.importance);
                          const maxAbs = Math.max(
                            ...apiPrediction.feature_importance.map((f) => Math.abs(f.importance))
                          );
                          const widthPercent = (absValue / maxAbs) * 100;

                          return (
                            <div key={item.feature} className="bg-white rounded p-2 border border-indigo-100">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-medium text-slate-700">{item.feature}</span>
                                <div className="flex items-center gap-1">
                                  {isPositive ? (
                                    <TrendingUp className="w-3 h-3 text-red-500" />
                                  ) : (
                                    <TrendingDown className="w-3 h-3 text-green-500" />
                                  )}
                                  <span className={isPositive ? "text-red-600" : "text-green-600"}>
                                    {isPositive ? "+" : ""}
                                    {item.importance.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${isPositive ? "bg-red-500" : "bg-green-500"}`}
                                  style={{ width: `${widthPercent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    <p className="text-[10px] text-slate-600 mt-2">
                      Top 5 factors by impact. Red increases effort, green decreases effort.
                    </p>
                  </div>
                </div>
              )}

              {Object.entries(CHINA_DESCRIPTORS).map(([key, descriptor]) => (
                <ChinaAttributeSlider
                  key={key}
                  attribute={key as keyof ChinaAttributes}
                  value={attributes[key as keyof ChinaAttributes]}
                  onChange={(value) =>
                    setAttributes((prev) => ({ ...prev, [key]: value }))
                  }
                  descriptor={descriptor}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={readOnly || !title.trim() || isLoading}>
            <Save className="size-4 mr-2" />
            Create Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <ChinaAttributesGuide open={showGuide} onOpenChange={setShowGuide} />
    </React.Fragment>
  );
}
