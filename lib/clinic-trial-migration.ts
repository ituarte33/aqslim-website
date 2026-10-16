import type { CanonicalEntitlementRecord } from './entitlement-record.ts'
import { pendingPatientSubjectId } from './p4-provisioning-policy.ts'

export const AUTHORIZED_TRIAL_MIGRATION_REASON = 'MYAQ_CLINIC_001_AUTHORIZED_TRIAL_MIGRATION' as const
export const AUTHORIZED_CLINIC_TRIAL_CANARY = {
  patientId: 'recVF3zCGu95AhKnU',
  entitlementRecordId: 'recunW4Za6YVgIgVW',
  subjectId: 'canary_clinic_ai_romtest_v1',
} as const

export function isExactAuthorizedClinicTrial(
  record: CanonicalEntitlementRecord,
  clerkUserId: string,
): boolean {
  return record.subjectId === clerkUserId
    && record.tier === 'clinic_ai'
    && record.status === 'trial'
    && record.source === 'clinic_ai_trial'
    && !record.entitlementReason.includes('P5_FOUNDER_REAL_USER_CANARY')
    && record.paidThrough === null
    && record.squareSubscriptionId === null
}

export function isAuthorizedClinicTrialStoredSubject({
  storedSubjectId,
  clerkUserId,
  patientId,
  entitlementRecordId,
}: {
  storedSubjectId: string
  clerkUserId: string
  patientId: string
  entitlementRecordId: string
}): boolean {
  return storedSubjectId === clerkUserId
    || storedSubjectId === pendingPatientSubjectId(patientId)
    || (patientId === AUTHORIZED_CLINIC_TRIAL_CANARY.patientId
      && entitlementRecordId === AUTHORIZED_CLINIC_TRIAL_CANARY.entitlementRecordId
      && storedSubjectId === AUTHORIZED_CLINIC_TRIAL_CANARY.subjectId)
}

function auditValue(value: string | null): string {
  return value?.replace(/\s+/g, ' ').trim().slice(0, 1000) || 'none'
}

export function authorizedTrialMigrationAuditReason(
  record: CanonicalEntitlementRecord,
  fingerprint: string,
  originalStoredSubjectId: string,
): string {
  return [
    AUTHORIZED_TRIAL_MIGRATION_REASON,
    `fingerprint=${fingerprint}`,
    `original_subject=${auditValue(originalStoredSubjectId)}`,
    `original_tier=${record.tier}`,
    `original_status=${record.status}`,
    `original_source=${record.source}`,
    `original_trial_starts=${auditValue(record.trialStarts)}`,
    `original_trial_ends=${auditValue(record.trialEnds)}`,
    `original_last_access_change=${auditValue(record.lastAccessChange)}`,
    `original_reason=${auditValue(record.entitlementReason)}`,
  ].join('; ')
}
