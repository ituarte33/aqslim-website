import 'server-only'

import {
  observeEntitlementShadow,
  type EntitlementShadowComparison,
  type ObserveEntitlementShadowInput,
} from './entitlement-shadow'
import type { EntitlementShadowDecision } from './entitlement-shadow-policy'

export type EntitlementGateResult = {
  mode: 'shadow'
  enforced: false
  currentAccessAllowed: boolean
  shadowDecision: EntitlementShadowDecision['decision']
  comparison: EntitlementShadowComparison
  policyVersion: EntitlementShadowDecision['policyVersion']
  reason: EntitlementShadowDecision['reason']
}

function compareCurrentToShadow(
  currentAccessAllowed: boolean,
  shadowDecision: EntitlementShadowDecision['decision'],
): EntitlementShadowComparison {
  if (shadowDecision === 'unresolved') return 'REVIEW'
  return currentAccessAllowed === (shadowDecision === 'allow') ? 'MATCH' : 'MISMATCH'
}

export function runEntitlementGateShadow(
  input: ObserveEntitlementShadowInput,
): EntitlementGateResult {
  const shadow = observeEntitlementShadow(input)
  return {
    mode: 'shadow',
    enforced: false,
    currentAccessAllowed: input.currentAccessAllowed,
    shadowDecision: shadow.decision,
    comparison: compareCurrentToShadow(input.currentAccessAllowed, shadow.decision),
    policyVersion: shadow.policyVersion,
    reason: shadow.reason,
  }
}
