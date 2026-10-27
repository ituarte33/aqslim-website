import 'server-only'

import { runEntitlementGateShadow } from './entitlement-gate'
import { runP3PreviewEntitlementGate, type P3EntitlementGateResult } from './p3-entitlement-gate'
import type { EntitlementCapability } from './entitlement-shadow-policy'
import type { PilotFeature } from './pilot-policy'
import { getPortalAccessRecordByPatientRecordId } from './preview-entitlement-store'
import { resolveCapabilityEntitlement } from './entitlement-resolver'

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

  let p3Gate = await runP3PreviewEntitlementGate({
    clerkUserId,
    capability,
    rawPlan,
    hasPilotAccess,
    authenticatedPatientRecordId,
  })

  // Live onboarded clients use their governed grant even when the historical
  // Preview-only P3 flag is off. A basic portal grant never creates AI access.
  if (authenticatedPatientRecordId) {
    const source = await getPortalAccessRecordByPatientRecordId({
      patientRecordId: authenticatedPatientRecordId, canonicalSubjectId: clerkUserId,
    })
    if (source?.isOperational) {
      const now = new Date()
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(now)
      const result = resolveCapabilityEntitlement({ record: source.record, capability, today, now })
      p3Gate = { enforced: true, decision: result.decision === 'allow' ? 'allow' : 'deny',
        reason: result.reason, lifecycle: result.lifecycle, tier: result.effectiveTier,
        sourceKind: 'clinic_live_store', policyVersion: p3Gate.policyVersion }
    }
  }

  return {
    currentAccessAllowed,
    p3Gate,
    allowed: p3Gate.enforced
      ? p3Gate.decision === 'allow'
      : currentAccessAllowed,
  }
}
