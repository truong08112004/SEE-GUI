import { estimateEffortChina, type ChinaAttributes } from "@/lib/china-model"

export interface ChinaDatasetInput {
  AFP: number // Adjusted Function Points
  Input: number // Number of inputs
  Output: number // Number of outputs
  Enquiry: number // Number of enquiries
  File: number // Number of files
  Interface: number // Number of interfaces
  Resource: number // Resource constraints
  Duration: number // Project duration (months)
}

export interface FeatureImportance {
  feature: string
  importance: number
}

export interface ChinaPredictionResult {
  feature_importance: FeatureImportance[]
  prediction: number // Person-hours
  prediction_pm: number // Person-months
  model_version: string
  dataset: string
}

const COEFFICIENTS: Record<keyof ChinaDatasetInput, number> = {
  AFP: -1.041,
  Input: -2.293,
  Output: 0.674,
  Enquiry: -0.344,
  File: 1.247,
  Interface: 2.156,
  Resource: 3.892,
  Duration: 8.467,
}

function clampNumber(n: unknown, fallback: number) {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback
}

function calculateFeatureImportance(input: ChinaDatasetInput): FeatureImportance[] {
  // Keep the same “shape” as the previous API so UI stays consistent.
  return (Object.keys(COEFFICIENTS) as (keyof ChinaDatasetInput)[]).map((feature) => ({
    feature,
    importance: parseFloat((COEFFICIENTS[feature] * input[feature]).toFixed(2)),
  }))
}

function inputToAttributes(input: ChinaDatasetInput): ChinaAttributes {
  return {
    afp: input.AFP,
    input: input.Input,
    output: input.Output,
    enquiry: input.Enquiry,
    file: input.File,
    interface: input.Interface,
    resource: input.Resource,
    duration: input.Duration,
  }
}

function predictEffortHours(input: ChinaDatasetInput): number {
  return estimateEffortChina(inputToAttributes(input))
}

export function predictChinaEffortRuleBased(rawInput: ChinaDatasetInput): ChinaPredictionResult {
  const input: ChinaDatasetInput = {
    AFP: clampNumber(rawInput.AFP, 200),
    Input: clampNumber(rawInput.Input, 30),
    Output: clampNumber(rawInput.Output, 40),
    Enquiry: clampNumber(rawInput.Enquiry, 20),
    File: clampNumber(rawInput.File, 15),
    Interface: clampNumber(rawInput.Interface, 10),
    Resource: clampNumber(rawInput.Resource, 5),
    Duration: clampNumber(rawInput.Duration, 12),
  }

  const prediction = predictEffortHours(input)
  const featureImportance = calculateFeatureImportance(input)

  return {
    feature_importance: featureImportance,
    prediction,
    prediction_pm: parseFloat((prediction / 160).toFixed(2)),
    model_version: "rule-based-v1.0",
    dataset: "China-like offline heuristic",
  }
}

