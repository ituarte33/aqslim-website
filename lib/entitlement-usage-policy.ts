import type { AccessTier } from './entitlement-record.ts'
import type { UsageGatePolicy } from './usage-gate.ts'

export type EntitlementUsageMeter = 'food_scan'

const FOOD_SCAN_LIMITS: Record<AccessTier, UsageGatePolicy> = {
  portal_basic: { dailyLimit: 0, monthlyLimit: 0 },
  clinic_ai: { dailyLimit: 3, monthlyLimit: 90 },
  kenkho_start: { dailyLimit: 3, monthlyLimit: 90 },
  kenkho_plus: { dailyLimit: 10, monthlyLimit: 300 },
  kenkho_elite: { dailyLimit: 15, monthlyLimit: 450 },
  internal_pilot: { dailyLimit: 15, monthlyLimit: 450 },
}

export function usagePolicyForEntitlementTier(
  tier: AccessTier,
  meter: EntitlementUsageMeter,
): UsageGatePolicy {
  if (meter === 'food_scan') return FOOD_SCAN_LIMITS[tier]
  return { dailyLimit: 0, monthlyLimit: 0 }
}
