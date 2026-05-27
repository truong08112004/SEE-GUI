"use client"

import type { Tables } from "@/lib/supabase/database.types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { calculateEAF, getEffortColorClass } from "@/lib/see-model"
import { TrendingUp, TrendingDown, AlertCircle, BarChart3 } from "lucide-react"
import { getTaskEffortPm } from "@/lib/task-effort"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts"

type TaskWithAssignments = Tables<"tasks"> & {
  task_assignments?: {
    id: string
    assigned_at?: string | null
    users: { id: string; email?: string; full_name?: string | null; avatar_url?: string | null } | null
  }[]
}

interface SEEInsightsPanelProps {
  tasks: TaskWithAssignments[]
  swimlanes: Tables<"swimlanes">[]
}

const PIE_COLORS = ["#0052CC", "#4C9AFF", "#36B37E", "#FFAB00", "#FF5630", "#6554C0"]

export function SEEInsightsPanel({ tasks, swimlanes }: SEEInsightsPanelProps) {
  const swimlaneNameById = new Map(swimlanes.map((s) => [s.id, s.name]))

  const tasksWithDerivedEffort = tasks.map((t) => {
    const { effortPm, source } = getTaskEffortPm(t)

    return {
      task: t,
      effortPm,
      isStored: source === "stored",
    }
  })

  const tasksWithEffort = tasksWithDerivedEffort.filter((t) => Number.isFinite(t.effortPm) && t.effortPm > 0)
  const storedEffortCount = tasksWithDerivedEffort.filter((t) => t.isStored).length
  const coveragePct = tasks.length > 0 ? Math.round((storedEffortCount / tasks.length) * 100) : 0

  const totalEstimatedEffort = tasksWithEffort.reduce((sum, item) => sum + item.effortPm, 0)

  const averageComplexity =
    tasksWithEffort.length > 0
      ? tasksWithEffort.reduce((sum, item) => sum + (item.task.attr_cplx || 1.0), 0) / tasksWithEffort.length
      : 1.0

  const highComplexityTasks = tasksWithEffort.filter((t) => (t.task.attr_cplx || 1.0) > 1.2)

  const averageEAF =
    tasksWithEffort.length > 0
      ? tasksWithEffort.reduce((sum, item) => {
          return (
            sum +
            calculateEAF({
              rely: item.task.attr_rely || 1.0,
              cplx: item.task.attr_cplx || 1.0,
              acap: item.task.attr_acap || 1.0,
              pcap: item.task.attr_pcap || 1.0,
              tool: item.task.attr_tool || 1.0,
              sced: item.task.attr_sced || 1.0,
            })
          )
        }, 0) / tasksWithEffort.length
      : 1.0

  const effortByAssigneeMap = new Map<
    string,
    {
      id: string
      label: string
      email: string
      avatar_url: string | null
      tasks: number
      effortPm: number
    }
  >()

  for (const item of tasksWithEffort) {
    const assignments = item.task.task_assignments ?? []
    const assignees = assignments.map((a) => a.users).filter((u): u is NonNullable<typeof u> => Boolean(u?.id))
    if (assignees.length === 0) continue

    const share = item.effortPm / assignees.length
    for (const u of assignees) {
      const prev = effortByAssigneeMap.get(u.id)
      const label = (u.full_name && u.full_name.trim()) || u.email || u.id.slice(0, 8)
      const email = u.email || ""
      const avatar_url = u.avatar_url ?? null
      if (!prev) {
        effortByAssigneeMap.set(u.id, {
          id: u.id,
          label,
          email,
          avatar_url,
          tasks: 1,
          effortPm: share,
        })
      } else {
        effortByAssigneeMap.set(u.id, {
          ...prev,
          tasks: prev.tasks + 1,
          effortPm: prev.effortPm + share,
        })
      }
    }
  }

  const effortByAssignee = [...effortByAssigneeMap.values()]
    .map((x) => ({ ...x, effortPm: parseFloat(x.effortPm.toFixed(2)) }))
    .sort((a, b) => b.effortPm - a.effortPm)

  const topAssigneesForChart = effortByAssignee.slice(0, 10).reverse()

  const headcount = effortByAssignee.length
  const avgEffortPerPerson = headcount > 0 ? totalEstimatedEffort / headcount : 0

  const getInitials = (nameOrEmail: string) =>
    nameOrEmail
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0] ?? "")
      .join("")
      .toUpperCase()

  const effortBySwimlane = swimlanes
    .map((s) => {
      const items = tasksWithEffort.filter((t) => t.task.swimlane_id === s.id)
      return {
        name: s.name,
        tasks: items.length,
        effortPm: parseFloat(items.reduce((sum, t) => sum + t.effortPm, 0).toFixed(2)),
      }
    })
    .filter((x) => x.tasks > 0)

  const tasksBySwimlane = effortBySwimlane.map((x) => ({ name: x.name, value: x.tasks }))

  const effortBuckets = [
    { label: "< 1", min: 0, max: 1 },
    { label: "1–3", min: 1, max: 3 },
    { label: "3–6", min: 3, max: 6 },
    { label: "6–10", min: 6, max: 10 },
    { label: "10+", min: 10, max: Number.POSITIVE_INFINITY },
  ].map((b) => ({
    label: b.label,
    tasks: tasksWithEffort.filter((t) => t.effortPm >= b.min && t.effortPm < b.max).length,
  }))

  return (
    <div className="w-full">
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">SEE Insights</h2>
            <p className="text-sm text-muted-foreground">Real-time effort estimation analytics</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="size-4" />
                Total Effort
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {totalEstimatedEffort.toFixed(1)}
                <span className="text-sm font-normal text-muted-foreground ml-2">PM</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {tasksWithEffort.length} tasks (stored coverage {coveragePct}%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="size-4" />
                Average Complexity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageComplexity.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {averageComplexity > 1.2
                  ? "High complexity detected"
                  : averageComplexity > 1.0
                    ? "Moderate complexity"
                    : "Low complexity"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="size-4" />
                Effort Adjustment Factor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageEAF.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">Average EAF across project</p>
            </CardContent>
          </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Effort by Column</CardTitle>
              </CardHeader>
              <CardContent className="h-[220px]">
                {effortBySwimlane.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={effortBySwimlane}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="effortPm" fill="#0052CC" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground">No tasks yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Workload Split</CardTitle>
              </CardHeader>
              <CardContent className="h-[220px]">
                {tasksBySwimlane.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={tasksBySwimlane} dataKey="value" nameKey="name" outerRadius={80} label>
                        {tasksBySwimlane.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground">No tasks yet</p>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Effort by Person</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Headcount: <span className="font-medium text-foreground">{headcount}</span>
                  </span>
                  <span>
                    Avg:{" "}
                    <span className="font-medium text-foreground">
                      {avgEffortPerPerson.toFixed(1)} PM/person
                    </span>
                  </span>
                  <span title="If tasks have multiple assignees, effort is split evenly across them.">
                    Allocation: <span className="font-medium text-foreground">split</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="h-[260px]">
                    {topAssigneesForChart.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topAssigneesForChart}
                          layout="vertical"
                          margin={{ left: 56, right: 12, top: 8, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tick={{ fontSize: 12 }} />
                          <YAxis
                            type="category"
                            dataKey="label"
                            tick={{ fontSize: 12 }}
                            width={180}
                            interval={0}
                          />
                          <Tooltip />
                          <Bar dataKey="effortPm" fill="#36B37E" radius={[0, 3, 3, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-xs text-muted-foreground">No assigned tasks yet</p>
                    )}
                  </div>

                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {effortByAssignee.length > 0 ? (
                      effortByAssignee.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between gap-3 text-xs p-2 rounded bg-card border"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="size-6">
                              <AvatarImage src={u.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {getInitials(u.label || u.email || u.id.slice(0, 2))}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{u.label}</div>
                              {u.email && <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className={getEffortColorClass(u.effortPm)}>
                              {u.effortPm.toFixed(1)} PM
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{u.tasks} tasks</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No assigned tasks yet</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {highComplexityTasks.length > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2 text-orange-900">
                    <AlertCircle className="size-4" />
                    High Complexity Alert
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-orange-800 mb-3">
                    {highComplexityTasks.length} task(s) marked as high complexity
                  </p>
                  <div className="space-y-2">
                    {highComplexityTasks.slice(0, 3).map((item) => (
                      <div key={item.task.id} className="text-xs bg-white p-2 rounded border border-orange-200">
                        <div className="font-medium text-orange-900 line-clamp-1">{item.task.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-orange-700 bg-orange-100 border-orange-300">
                            CPLX: {item.task.attr_cplx?.toFixed(2)}
                          </Badge>
                          <span className="text-orange-600">{item.effortPm.toFixed(1)} PM</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Effort Histogram</CardTitle>
              </CardHeader>
              <CardContent>
                {tasksWithEffort.length > 0 ? (
                  <div className="space-y-3">
                    <div className="h-[160px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={effortBuckets}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="tasks" fill="#4C9AFF" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2">
                      {tasksWithEffort
                        .sort((a, b) => b.effortPm - a.effortPm)
                        .slice(0, 5)
                        .map((item) => (
                          <div key={item.task.id} className="flex items-center justify-between text-xs p-2 rounded bg-card border">
                            <span className="font-medium truncate flex-1 mr-2">
                              {item.task.title}
                              <span className="text-muted-foreground ml-2">
                                ({swimlaneNameById.get(item.task.swimlane_id ?? "") ?? "Unassigned"})
                              </span>
                            </span>
                            <Badge variant="outline" className={getEffortColorClass(item.effortPm)}>
                              {item.effortPm.toFixed(1)} PM
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No tasks with effort estimates yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
