export const REANALYSIS_LIMIT_PER_MEAL = 2

export type ReanalysisDecision = {
  allowed: boolean
  used: number
  limit: typeof REANALYSIS_LIMIT_PER_MEAL
  remaining: number
}

export function evaluateReanalysisUsage(usedInput: number): ReanalysisDecision {
  const used = Math.max(0, Math.floor(Number.isFinite(usedInput) ? usedInput : 0))
  const remaining = Math.max(0, REANALYSIS_LIMIT_PER_MEAL - used)
  return {
    allowed: used < REANALYSIS_LIMIT_PER_MEAL,
    used,
    limit: REANALYSIS_LIMIT_PER_MEAL,
    remaining,
  }
}
