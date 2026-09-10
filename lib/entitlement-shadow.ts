import 'server-only'

import {
  evaluateEntitlementShadow,
  type EntitlementCapability,
  type EntitlementShadowDecision,
} from '@/lib/entitlement-shadow-policy'
import type { PilotFeature } from '@/lib/pilot-policy'

export type ObserveEntitlementShadowInput = {
  clerkUserId: string
  capability: EntitlementCapability
  currentAccessAllowed: boolean
  rawPlan?: unknown
  hasPilotAccess?: boolean
  pilotFeatures?: ReadonlySet<PilotFeature> | readonly PilotFeature[]
}

export type EntitlementShadowComparison = 'MATCH' | 'MISMATCH' | 'REVIEW'

export function compareEntitlementShadow(
  currentAccessAllowed: boolean,
  decision: EntitlementShadowDecision['decision'],
): EntitlementShadowComparison {
  if (decision === 'unresolved') return 'REVIEW'
  return currentAccessAllowed === (decision === 'allow') ? 'MATCH' : 'MISMATCH'
}

export function observeEntitlementShadow(
  input: ObserveEntitlementShadowInput,
): EntitlementShadowDecision {
  const decision = evaluateEntitlementShadow({
    capability: input.capability,
    rawPlan: input.rawPlan,
    hasPilotAccess: input.hasPilotAccess,
    pilotFeatures: input.pilotFeatures,
  })
  const comparison = compareEntitlementShadow(input.currentAccessAllowed, decision.decision)

  console.info('[entitlement-shadow]', {
    clerkUserId: input.clerkUserId,
    capability: input.capability,
    currentAccessAllowed: input.currentAccessAllowed,
    shadowDecision: decision.decision,
    comparison,
    shadowTier: decision.tier,
    shadowLifecycle: decision.lifecycle,
    policyBasis: decision.policyBasis,
    reason: decision.reason,
    policyVersion: decision.policyVersion,
    enforced: decision.enforced,
  })

  return decision
}
