import 'server-only'

import type { EntitlementCapability } from './entitlement-shadow-policy'
import { buildCanonicalEntitlementContext } from './entitlement-context'
import { resolveCapabilityEntitlement } from './entitlement-resolver'
import { isP3PreviewEnforcementEnabled } from './p3-enforcement-policy'

export const P3_ENTITLEMENT_POLICY_VERSION = 'MYAQ-ENTITLEMENT-P3-PREVIEW-v0.1' as const

export type P3EntitlementGateResult =
  | {
      enforced: false
      decision: 'not_evaluated'
      reason: 'P3_ENFORCEMENT_DISABLED'
      policyVersion: typeof P3_ENTITLEMENT_POLICY_VERSION
    }
  | {
      enforced: true
      decision: 'allow' | 'deny'
      reason: string
      lifecycle: string
      tier: string | null
      sourceKind: string
      policyVersion: typeof P3_ENTITLEMENT_POLICY_VERSION
    }

function todayPacific(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
  }).format(now)
}

export async function runP3PreviewEntitlementGate({
  clerkUserId,
  capability,
  rawPlan,
  hasPilotAccess,
  authenticatedPatientRecordId,
  now = new Date(),
}: {
  clerkUserId: string
  capability: EntitlementCapability
  rawPlan?: unknown
  hasPilotAccess: boolean
  authenticatedPatientRecordId: string | null
  now?: Date
}): Promise<P3EntitlementGateResult> {
  const enabled = isP3PreviewEnforcementEnabled({
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
    MYAQ_P3_ENFORCEMENT: process.env.MYAQ_P3_ENFORCEMENT,
  })

  if (!enabled) {
    return {
      enforced: false,
      decision: 'not_evaluated',
      reason: 'P3_ENFORCEMENT_DISABLED',
      policyVersion: P3_ENTITLEMENT_POLICY_VERSION,
    }
  }

  const context = await buildCanonicalEntitlementContext({
    subjectId: clerkUserId,
    rawPlan,
    hasPilotAccess,
    authenticatedPatientRecordId,
    now,
  })

  if (!context.record) {
    const result: P3EntitlementGateResult = {
      enforced: true,
      decision: 'deny',
      reason: 'NO_CANONICAL_ENTITLEMENT',
      lifecycle: 'UNRESOLVED',
      tier: null,
      sourceKind: context.sourceKind,
      policyVersion: P3_ENTITLEMENT_POLICY_VERSION,
    }
    console.info('[entitlement-enforcement-preview]', {
      clerkUserId,
      capability,
      ...result,
    })
    return result
  }

  const resolution = resolveCapabilityEntitlement({
    record: context.record,
    capability,
    today: todayPacific(now),
    now,
  })
  const result: P3EntitlementGateResult = {
    enforced: true,
    decision: resolution.decision === 'allow' ? 'allow' : 'deny',
    reason: resolution.reason,
    lifecycle: resolution.lifecycle,
    tier: resolution.effectiveTier,
    sourceKind: context.sourceKind,
    policyVersion: P3_ENTITLEMENT_POLICY_VERSION,
  }

  console.info('[entitlement-enforcement-preview]', {
    clerkUserId,
    capability,
    originalDecision: resolution.decision,
    portalAccess: resolution.portalAccess,
    ...result,
  })
  return result
}
