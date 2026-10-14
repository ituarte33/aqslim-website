export type UsageGatePolicy = {
  dailyLimit: number
  monthlyLimit: number
}

export type UsageGateSnapshot = {
  dailyUsed: number
  monthlyUsed: number
}

export type UsageGateDecision = {
  allowed: boolean
  reason: 'allowed' | 'daily_limit' | 'monthly_limit'
  dailyRemaining: number
  monthlyRemaining: number
}

export function evaluateUsageGate(
  policy: UsageGatePolicy,
  usage: UsageGateSnapshot,
): UsageGateDecision {
  const dailyLimit = Math.max(0, Math.floor(policy.dailyLimit))
  const monthlyLimit = Math.max(0, Math.floor(policy.monthlyLimit))
  const dailyUsed = Math.max(0, Math.floor(usage.dailyUsed))
  const monthlyUsed = Math.max(0, Math.floor(usage.monthlyUsed))
  const dailyRemaining = Math.max(0, dailyLimit - dailyUsed)
  const monthlyRemaining = Math.max(0, monthlyLimit - monthlyUsed)

  if (dailyUsed >= dailyLimit) {
    return { allowed: false, reason: 'daily_limit', dailyRemaining, monthlyRemaining }
  }
  if (monthlyUsed >= monthlyLimit) {
    return { allowed: false, reason: 'monthly_limit', dailyRemaining, monthlyRemaining }
  }
  return { allowed: true, reason: 'allowed', dailyRemaining, monthlyRemaining }
}
