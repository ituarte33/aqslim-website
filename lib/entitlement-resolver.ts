import type { EntitlementCapability } from './entitlement-shadow-policy.ts'
import type { CanonicalEntitlementRecord } from './entitlement-record.ts'
import { hasGovernedOverride } from './entitlement-record.ts'
import { resolveClinicLifecycle, type ClinicLifecycle } from './clinic-lifecycle.ts'

export type EffectiveLifecycle = ClinicLifecycle | 'NOT_APPLICABLE'
export type PortalAccessMode = 'full' | 'read_only' | 'none'
export type EntitlementDecision = 'allow' | 'deny' | 'unresolved'

export type CapabilityEntitlementResolution = {
  decision: EntitlementDecision
  lifecycle: EffectiveLifecycle
  portalAccess: PortalAccessMode
  effectiveTier: CanonicalEntitlementRecord['tier']
  reason:
    | 'INTERNAL_PILOT_ALLOWED'
    | 'KENKHO_ALLOWED'
    | 'CLINIC_AI_TRIAL_ACTIVE'
    | 'CLINIC_AI_PAID_ACTIVE'
    | 'CLINIC_INACTIVE'
    | 'CLINIC_LIFECYCLE_UNRESOLVED'
    | 'CLINIC_AI_TRIAL_EXPIRED'
    | 'CLINIC_AI_PAYMENT_UNVERIFIED'
    | 'STATUS_BLOCKED'
    | 'PORTAL_BASIC_NO_AI'
    | 'ACCESS_EXPIRED'
    | 'OVERRIDE_DENY'
    | 'OVERRIDE_ALLOW_NOT_ENABLED'
    | 'CAPABILITY_NOT_INCLUDED'
}

const AI_CAPABILITIES: ReadonlySet<EntitlementCapability> = new Set([
  'buddy:chat',
  'food_scan:analyze',
  'food_scan:reanalyze',
  'food_log:text',
  'fridge_recipe:detect',
  'fridge_recipe:generate',
  'restaurant_menu:analyze',
  'weekly_summary:generate',
])

function parseStartBoundary(value: string | null): number | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = Date.parse(`${value}T00:00:00Z`)
    return Number.isFinite(parsed) ? parsed : null
  }
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseInclusiveEndBoundary(value: string | null): number | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const start = Date.parse(`${value}T00:00:00Z`)
    return Number.isFinite(start) ? start + 86_400_000 : null
  }
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function withinWindow(start: string | null, end: string | null, nowMs: number): boolean {
  const startMs = parseStartBoundary(start)
  const endMs = parseInclusiveEndBoundary(end)
  if (startMs === null || endMs === null || endMs <= startMs) return false
  return nowMs >= startMs && nowMs < endMs
}

function notExpired(value: string | null, nowMs: number): boolean {
  const endMs = parseInclusiveEndBoundary(value)
  return endMs !== null && nowMs < endMs
}

function portalAccessForClinicLifecycle(lifecycle: ClinicLifecycle): PortalAccessMode {
  if (lifecycle === 'ACTIVE' || lifecycle === 'GRACE') return 'full'
  if (lifecycle === 'INACTIVE') return 'read_only'
  return 'none'
}

export function resolveCapabilityEntitlement({
  record,
  capability,
  today,
  now = new Date(),
}: {
  record: CanonicalEntitlementRecord
  capability: EntitlementCapability
  today: string
  now?: Date
}): CapabilityEntitlementResolution {
  const nowMs = now.getTime()
  const capabilityIncluded = AI_CAPABILITIES.has(capability)

  if (hasGovernedOverride(record) && record.override === 'deny') {
    const lifecycle = record.tier === 'portal_basic' || record.tier === 'clinic_ai'
      ? resolveClinicLifecycle(record.lastCompletedVisit, today).lifecycle
      : 'NOT_APPLICABLE'
    return {
      decision: 'deny',
      lifecycle,
      portalAccess: lifecycle === 'NOT_APPLICABLE' ? 'none' : portalAccessForClinicLifecycle(lifecycle),
      effectiveTier: record.tier,
      reason: 'OVERRIDE_DENY',
    }
  }

  // P3 deliberately does not allow an administrative ALLOW override to bypass
  // lifecycle or commercial state. That requires separate override governance.
  if (hasGovernedOverride(record) && record.override === 'allow') {
    const lifecycle = record.tier === 'portal_basic' || record.tier === 'clinic_ai'
      ? resolveClinicLifecycle(record.lastCompletedVisit, today).lifecycle
      : 'NOT_APPLICABLE'
    return {
      decision: 'unresolved',
      lifecycle,
      portalAccess: lifecycle === 'NOT_APPLICABLE' ? 'none' : portalAccessForClinicLifecycle(lifecycle),
      effectiveTier: record.tier,
      reason: 'OVERRIDE_ALLOW_NOT_ENABLED',
    }
  }

  if (record.accessExpires && !notExpired(record.accessExpires, nowMs)) {
    const lifecycle = record.tier === 'portal_basic' || record.tier === 'clinic_ai'
      ? resolveClinicLifecycle(record.lastCompletedVisit, today).lifecycle
      : 'NOT_APPLICABLE'
    return {
      decision: 'deny',
      lifecycle,
      portalAccess: lifecycle === 'NOT_APPLICABLE' ? 'none' : portalAccessForClinicLifecycle(lifecycle),
      effectiveTier: record.tier,
      reason: 'ACCESS_EXPIRED',
    }
  }

  if (record.status === 'suspended' || record.status === 'expired' || record.status === 'canceled') {
    const lifecycle = record.tier === 'portal_basic' || record.tier === 'clinic_ai'
      ? resolveClinicLifecycle(record.lastCompletedVisit, today).lifecycle
      : 'NOT_APPLICABLE'
    return {
      decision: 'deny',
      lifecycle,
      portalAccess: lifecycle === 'NOT_APPLICABLE' ? 'none' : portalAccessForClinicLifecycle(lifecycle),
      effectiveTier: record.tier,
      reason: 'STATUS_BLOCKED',
    }
  }

  if (!capabilityIncluded) {
    return {
      decision: 'deny',
      lifecycle: 'NOT_APPLICABLE',
      portalAccess: 'none',
      effectiveTier: record.tier,
      reason: 'CAPABILITY_NOT_INCLUDED',
    }
  }

  if (record.tier === 'internal_pilot') {
    return {
      decision: 'allow',
      lifecycle: 'NOT_APPLICABLE',
      portalAccess: 'full',
      effectiveTier: record.tier,
      reason: 'INTERNAL_PILOT_ALLOWED',
    }
  }

  if (
    record.tier === 'kenkho_start'
    || record.tier === 'kenkho_plus'
    || record.tier === 'kenkho_elite'
  ) {
    return {
      decision: 'allow',
      lifecycle: 'NOT_APPLICABLE',
      portalAccess: 'full',
      effectiveTier: record.tier,
      reason: 'KENKHO_ALLOWED',
    }
  }

  const clinic = resolveClinicLifecycle(record.lastCompletedVisit, today)
  const portalAccess = portalAccessForClinicLifecycle(clinic.lifecycle)

  if (record.tier === 'portal_basic') {
    return {
      decision: 'deny',
      lifecycle: clinic.lifecycle,
      portalAccess,
      effectiveTier: record.tier,
      reason: clinic.lifecycle === 'UNRESOLVED'
        ? 'CLINIC_LIFECYCLE_UNRESOLVED'
        : 'PORTAL_BASIC_NO_AI',
    }
  }

  if (clinic.lifecycle === 'UNRESOLVED') {
    return {
      decision: 'unresolved',
      lifecycle: clinic.lifecycle,
      portalAccess,
      effectiveTier: record.tier,
      reason: 'CLINIC_LIFECYCLE_UNRESOLVED',
    }
  }

  if (clinic.lifecycle === 'INACTIVE') {
    return {
      decision: 'deny',
      lifecycle: clinic.lifecycle,
      portalAccess,
      effectiveTier: record.tier,
      reason: 'CLINIC_INACTIVE',
    }
  }

  if (record.status === 'trial') {
    return withinWindow(record.trialStarts, record.trialEnds, nowMs)
      ? {
          decision: 'allow',
          lifecycle: clinic.lifecycle,
          portalAccess,
          effectiveTier: record.tier,
          reason: 'CLINIC_AI_TRIAL_ACTIVE',
        }
      : {
          decision: 'deny',
          lifecycle: clinic.lifecycle,
          portalAccess,
          effectiveTier: record.tier,
          reason: 'CLINIC_AI_TRIAL_EXPIRED',
        }
  }

  if (record.status === 'active' || record.status === 'grace') {
    return notExpired(record.paidThrough, nowMs)
      ? {
          decision: 'allow',
          lifecycle: clinic.lifecycle,
          portalAccess,
          effectiveTier: record.tier,
          reason: 'CLINIC_AI_PAID_ACTIVE',
        }
      : {
          decision: 'unresolved',
          lifecycle: clinic.lifecycle,
          portalAccess,
          effectiveTier: record.tier,
          reason: 'CLINIC_AI_PAYMENT_UNVERIFIED',
        }
  }

  return {
    decision: 'deny',
    lifecycle: clinic.lifecycle,
    portalAccess,
    effectiveTier: record.tier,
    reason: 'STATUS_BLOCKED',
  }
}
