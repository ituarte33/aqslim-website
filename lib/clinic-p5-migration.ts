import type { CanonicalEntitlementRecord } from './entitlement-record.ts'

export const P5_FOUNDER_CANARY_MARKER = 'P5_FOUNDER_REAL_USER_CANARY' as const
export const P5_MIGRATION_REASON = 'MYAQ_CLINIC_001_P5_CANARY_MIGRATION' as const
export const P5_FOUNDER_PATIENT_RECORD_ID = 'recRdIkniEv0MB4gT' as const
export const P5_FOUNDER_ENTITLEMENT_RECORD_ID = 'recGI5DeJmXkUm1r8' as const

export function isExactP5FounderCanary(
  record: CanonicalEntitlementRecord,
  clerkUserId: string,
): boolean {
  return record.subjectId === clerkUserId
    && record.tier === 'clinic_ai'
    && record.status === 'trial'
    && record.source === 'clinic_ai_trial'
    && record.entitlementReason.includes(P5_FOUNDER_CANARY_MARKER)
    && record.paidThrough === null
    && record.squareSubscriptionId === null
}

function auditValue(value: string | null): string {
  return value?.replace(/\s+/g, ' ').trim().slice(0, 1000) || 'none'
}

export function p5MigrationAuditReason(
  record: CanonicalEntitlementRecord,
  fingerprint: string,
): string {
  return [
    P5_MIGRATION_REASON,
    `fingerprint=${fingerprint}`,
    `original_tier=${record.tier}`,
    `original_status=${record.status}`,
    `original_source=${record.source}`,
    `original_trial_starts=${auditValue(record.trialStarts)}`,
    `original_trial_ends=${auditValue(record.trialEnds)}`,
    `original_last_access_change=${auditValue(record.lastAccessChange)}`,
    `original_reason=${auditValue(record.entitlementReason)}`,
  ].join('; ')
}
