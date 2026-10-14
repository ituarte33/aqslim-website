import {
  clinicAiTrialWindowForEligibleVisit,
  isEligibleClinicAiTrialVisitType,
} from './clinic-ai-trial-policy.ts'
import { isQualifyingClinicVisitType } from './clinic-visit-policy.ts'
import type { CanonicalEntitlementRecord } from './entitlement-record.ts'

export type P4ProvisioningAction =
  | 'none'
  | 'create_portal_basic'
  | 'start_or_renew_trial'
  | 'refresh_existing'
  | 'preserve_protected'

export type P4ProvisioningPlan = {
  action: P4ProvisioningAction
  trialStarts: string | null
  trialEnds: string | null
  reason: string
}

function isProtectedExistingEntitlement(record: CanonicalEntitlementRecord | null): boolean {
  if (!record) return false
  if (
    record.tier === 'internal_pilot'
    || record.tier === 'kenkho_start'
    || record.tier === 'kenkho_plus'
    || record.tier === 'kenkho_elite'
  ) return true
  if (record.source === 'clinic_ai_paid' || record.source === 'administrative') return true
  return false
}

export function pendingPatientSubjectId(patientRecordId: string): string {
  if (!/^rec[A-Za-z0-9]{14}$/.test(patientRecordId)) throw new Error('Invalid patient record ID')
  return `patient:${patientRecordId}`
}

export function provisioningPlanForClinicVisit({
  visitType,
  completedAt,
  existingRecord,
}: {
  visitType: unknown
  completedAt: Date
  existingRecord: CanonicalEntitlementRecord | null
}): P4ProvisioningPlan {
  if (!isQualifyingClinicVisitType(visitType)) {
    return {
      action: 'none',
      trialStarts: null,
      trialEnds: null,
      reason: 'NON_QUALIFYING_CLINIC_VISIT',
    }
  }

  if (isProtectedExistingEntitlement(existingRecord)) {
    return {
      action: 'preserve_protected',
      trialStarts: null,
      trialEnds: null,
      reason: 'PROTECTED_EXISTING_ENTITLEMENT',
    }
  }

  if (isEligibleClinicAiTrialVisitType(visitType)) {
    const window = clinicAiTrialWindowForEligibleVisit({ visitType, completedAt })
    if (!window) throw new Error('Eligible clinic AI trial visit produced no trial window')
    return {
      action: 'start_or_renew_trial',
      ...window,
      reason: existingRecord
        ? 'ELIGIBLE_VISIT_RENEWS_CLINIC_AI_TRIAL'
        : 'ELIGIBLE_VISIT_STARTS_CLINIC_AI_TRIAL',
    }
  }

  if (!existingRecord) {
    return {
      action: 'create_portal_basic',
      trialStarts: null,
      trialEnds: null,
      reason: 'QUALIFYING_SUBSEQUENT_VISIT_CREATES_PORTAL_BASIC',
    }
  }

  return {
    action: 'refresh_existing',
    trialStarts: existingRecord.trialStarts,
    trialEnds: existingRecord.trialEnds,
    reason: 'QUALIFYING_SUBSEQUENT_VISIT_REFRESHES_LIFECYCLE_ONLY',
  }
}
