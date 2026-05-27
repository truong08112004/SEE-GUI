import type { Tables } from "@/lib/supabase/database.types"
import { estimateEffortChina, hoursToMonths } from "@/lib/china-model"

function hasAnyChinaAttrs(task: Tables<"tasks">) {
  return (
    task.attr_afp != null ||
    task.attr_input != null ||
    task.attr_output != null ||
    task.attr_enquiry != null ||
    task.attr_file != null ||
    task.attr_interface != null ||
    task.attr_resource != null ||
    task.attr_duration != null
  )
}

export function getTaskEffortPm(task: Tables<"tasks">) {
  // Prefer derived effort so UI stays consistent even when stored values are stale
  // (e.g. after model calibration changes or legacy seed data).
  if (hasAnyChinaAttrs(task)) {
    const hours = estimateEffortChina({
      afp: task.attr_afp ?? 200,
      input: task.attr_input ?? 30,
      output: task.attr_output ?? 40,
      enquiry: task.attr_enquiry ?? 20,
      file: task.attr_file ?? 15,
      interface: task.attr_interface ?? 10,
      resource: task.attr_resource ?? 5,
      duration: task.attr_duration ?? 12,
    })
    return {
      effortPm: hoursToMonths(hours),
      source: "derived" as const,
    }
  }

  if (task.estimated_effort_pm != null) {
    return {
      effortPm: task.estimated_effort_pm,
      source: "stored" as const,
    }
  }

  return {
    effortPm: 0,
    source: "none" as const,
  }
}

