import 'server-only'

import { runEntitlementGateShadow } from './entitlement-gate'
import { runP3PreviewEntitlementGate, type P3EntitlementGateResult } from './p3-entitlement-gate'
import type { EntitlementCapability } from './entitlement-shadow-policy'
import type { PilotFeature } from './pilot-policy'

export type AiEntitlementAccessResult = {
  allowed: boolean
  currentAccessAllowed: boolean
  p3Gate: P3EntitlementGateResult
}

export async function evaluateAiEntitlementAccess({
  clerkUserId,
  capability,
  currentAccessAllowed,
  rawPlan,
  hasPilotAccess,
  pilotFeatures,
  authenticatedPatientRecordId,
}: {
  clerkUserId: string
  capability: EntitlementCapability
  currentAccessAllowed: boolean
  rawPlan?: unknown
  hasPilotAccess: boolean
  pilotFeatures?: ReadonlySet<PilotFeature> | readonly PilotFeature[]
  authenticatedPatientRecordId: string | null
}): Promise<AiEntitlementAccessResult> {
  runEntitlementGateShadow({
    clerkUserId,
    capability,
    currentAccessAllowed,
    rawPlan,
    hasPilotAccess,
    pilotFeatures,
  })

  const p3Gate = await runP3PreviewEntitlementGate({
    clerkUserId,
    capability,
    rawPlan,
    hasPilotAccess,
    authenticatedPatientRecordId,
  })

  return {
    currentAccessAllowed,
    p3Gate,
    allowed: p3Gate.enforced
      ? p3Gate.decision === 'allow'
      : currentAccessAllowed,
  }
}
