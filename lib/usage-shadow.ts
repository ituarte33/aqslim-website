import 'server-only'

import type { UsageGateDecision } from './usage-gate'

export function observeUsageShadow({
  clerkUserId,
  capability,
  plan,
  dailyUsed,
  monthlyUsed,
  dailyLimit,
  monthlyLimit,
  decision,
  currentUsageCounted,
}: {
  clerkUserId: string
  capability: string
  plan: string
  dailyUsed: number
  monthlyUsed: number
  dailyLimit: number
  monthlyLimit: number
  decision: UsageGateDecision
  currentUsageCounted: boolean
}) {
  console.info('[usage-shadow]', {
    clerkUserId,
    capability,
    plan,
    dailyUsed,
    monthlyUsed,
    dailyLimit,
    monthlyLimit,
    shadowDecision: decision.allowed ? 'allow' : 'deny',
    reason: decision.reason,
    dailyRemaining: decision.dailyRemaining,
    monthlyRemaining: decision.monthlyRemaining,
    currentUsageCounted,
    enforced: false,
  })
}

export function observeUsageShadowUnavailable({
  clerkUserId,
  capability,
  plan,
  currentUsageCounted,
}: {
  clerkUserId: string
  capability: string
  plan: string
  currentUsageCounted: boolean
}) {
  console.warn('[usage-shadow]', {
    clerkUserId,
    capability,
    plan,
    shadowDecision: 'unavailable',
    reason: 'USAGE_SOURCE_UNAVAILABLE',
    currentUsageCounted,
    enforced: false,
  })
}
