"use client"

import type React from "react"
import { useState } from "react"
import type { Tables } from "@/lib/supabase/database.types"

interface DragState {
  draggedTaskId: string | null
  sourceSwimLaneId: string | null
  sourceSwimLaneName: string | null
  targetSwimLaneId: string | null
}

export function useTaskDragDrop(projectId: string, canMove = true) {
  const [dragState, setDragState] = useState<DragState>({
    draggedTaskId: null,
    sourceSwimLaneId: null,
    sourceSwimLaneName: null,
    targetSwimLaneId: null,
  })

  const handleDragStart = (taskId: string, swimlaneId: string, swimlaneName?: string) => {
    if (!canMove) return
    setDragState({
      draggedTaskId: taskId,
      sourceSwimLaneId: swimlaneId,
      sourceSwimLaneName: swimlaneName || null,
      targetSwimLaneId: null,
    })
  }

  const handleDragOver = (e: React.DragEvent, swimlaneId: string) => {
    if (!canMove) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragState((prev) => ({
      ...prev,
      targetSwimLaneId: swimlaneId,
    }))
  }

  const handleDragLeave = () => {
    setDragState((prev) => ({
      ...prev,
      targetSwimLaneId: null,
    }))
  }

  const handleDrop = async (
    e: React.DragEvent,
    targetSwimLaneId: string,
    targetSwimLaneName: string,
    tasks: Tables<"tasks">[],
    allTasks: Tables<"tasks">[],
    onTasksReorder: (tasks: Tables<"tasks">[]) => void,
  ) => {
    e.preventDefault()
    if (!canMove) return

    const { draggedTaskId, sourceSwimLaneId } = dragState
    if (!draggedTaskId) return

    const draggedTask = allTasks.find((t) => t.id === draggedTaskId)
    if (!draggedTask) return

    const targetTasks = tasks.filter((t) => t.id !== draggedTaskId)
    const dropPosition = targetTasks.length

    const updatedTask = {
      ...draggedTask,
      swimlane_id: targetSwimLaneId,
      position: dropPosition,
    }

    const optimisticTasks = allTasks.map((t) =>
      t.id === draggedTaskId ? updatedTask : t
    )
    onTasksReorder(optimisticTasks)

    const reorderedTaskIds = [...targetTasks.map((t) => t.id), draggedTaskId]

    try {
      const response = await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskIds: reorderedTaskIds,
          swimlaneId: targetSwimLaneId,
          targetSwimlaneName: targetSwimLaneName,
          sourceSwimlaneName: dragState.sourceSwimLaneName,
          projectId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to reorder tasks")
      }

      const { tasks: updatedTasks } = await response.json()
      const finalTasks = allTasks.map((t) => {
        const serverTask = updatedTasks.find(
          (ut: Tables<"tasks">) => ut.id === t.id
        )
        return serverTask || t
      })
      onTasksReorder(finalTasks)
    } catch (error) {
      console.error("Error persisting task reorder:", error)
      onTasksReorder(allTasks)
    }

    setDragState({
      draggedTaskId: null,
      sourceSwimLaneId: null,
      sourceSwimLaneName: null,
      targetSwimLaneId: null,
    })
  }

  const handleDragEnd = () => {
    setDragState({
      draggedTaskId: null,
      sourceSwimLaneId: null,
      sourceSwimLaneName: null,
      targetSwimLaneId: null,
    })
  }

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  }
}
