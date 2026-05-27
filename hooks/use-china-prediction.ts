import { useState } from "react"
import { predictChinaEffortRuleBased } from "@/lib/china-rule-based"

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

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function useChinaPrediction() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ChinaPredictionResult | null>(null)

  const predict = async (input: ChinaDatasetInput) => {
    setLoading(true)
    setError(null)

    try {
      // Local/offline prediction (rule-based). Small delay keeps UX consistent.
      await sleep(220)
      const explanation = predictChinaEffortRuleBased(input)
      setResult(explanation)
      return explanation
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get prediction"
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    predict,
    loading,
    error,
    result,
  }
}
