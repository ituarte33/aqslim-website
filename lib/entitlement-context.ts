import 'server-only'

import { getClienteById } from './airtable'
import { getLinkedClinicConsultationsByPatientId } from './clinic-consultation-source'
import { lastCompletedVisitFromConsultations } from './clinic-visit-policy'
import { clinicGraceEndDate } from './entitlement-windows'
import {
  createCanonicalEntitlementRecord,
  type AccessTier,
  type CanonicalEntitlementRecord,
} from './entitlement-record'
import {
  getPreviewEntitlementSourceRecord,
  getPreviewEntitlementSourceRecordByPatientRecordId,
} from './preview-entitlement-store'
import { pendingPatientSubjectId } from './p4-provisioning-policy'
import { claimPendingPreviewEntitlementSubject } from './p4-preview-entitlement-provisioning'

export type CanonicalEntitlementContext = {
  record: CanonicalEntitlementRecord | null
  sourceKind: 'internal_pilot' | 'preview_store' | 'legacy_kenkho_signal' | 'none'
}

function kenKhoTierFromPlan(value: unknown): AccessTier | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'start' || normalized === 'mid' || normalized === 'regular') return 'kenkho_start'
  if (normalized === 'plus') return 'kenkho_plus'
  if (normalized === 'elite' || normalized === 'top') return 'kenkho_elite'
  return null
}

async function hydrateClinicLifecycleAuthority({
  record,
  sourcePatientRecordId,
  authenticatedPatientRecordId,
}: {
  record: CanonicalEntitlementRecord
  sourcePatientRecordId: string | null
  authenticatedPatientRecordId: string | null
}): Promise<CanonicalEntitlementRecord> {
  if (record.tier !== 'portal_basic' && record.tier !== 'clinic_ai') return record

  if (
    !sourcePatientRecordId
    || !authenticatedPatientRecordId
    || sourcePatientRecordId !== authenticatedPatientRecordId
  ) {
    return {
      ...record,
      lastCompletedVisit: null,
      graceEnds: null,
      entitlementReason: `${record.entitlementReason}; clinic patient binding unresolved`,
    }
  }

  const patient = await getClienteById(authenticatedPatientRecordId)
  if (!patient) {
    return {
      ...record,
      lastCompletedVisit: null,
      graceEnds: null,
      entitlementReason: `${record.entitlementReason}; clinic patient record unavailable`,
    }
  }

  const consultations = await getLinkedClinicConsultationsByPatientId(authenticatedPatientRecordId)
  const lastCompletedVisit = lastCompletedVisitFromConsultations(consultations)

  return {
    ...record,
    lastCompletedVisit,
    graceEnds: lastCompletedVisit ? clinicGraceEndDate(lastCompletedVisit) : null,
  }
}

export async function buildCanonicalEntitlementContext({
  subjectId,
  rawPlan,
  hasPilotAccess,
  authenticatedPatientRecordId,
  now = new Date(),
}: {
  subjectId: string
  rawPlan?: unknown
  hasPilotAccess: boolean
  authenticatedPatientRecordId: string | null
  now?: Date
}): Promise<CanonicalEntitlementContext> {
  if (hasPilotAccess) {
    return {
      sourceKind: 'internal_pilot',
      record: createCanonicalEntitlementRecord({
        subjectId,
        tier: 'internal_pilot',
        status: 'active',
        source: 'internal_pilot',
        trialStarts: null,
        trialEnds: null,
        paidThrough: null,
        lastCompletedVisit: null,
        graceEnds: null,
        accessExpires: null,
        squareSubscriptionId: null,
        entitlementReason: 'Existing governed internal pilot access',
        lastAccessChange: now.toISOString(),
        override: null,
        overrideReason: null,
      }),
    }
  }

  let previewSource = await getPreviewEntitlementSourceRecord(subjectId)
  if (!previewSource && authenticatedPatientRecordId) {
    const patientSource = await getPreviewEntitlementSourceRecordByPatientRecordId({
      patientRecordId: authenticatedPatientRecordId,
      canonicalSubjectId: subjectId,
    })

    if (patientSource) {
      const pendingSubject = pendingPatientSubjectId(authenticatedPatientRecordId)
      if (
        patientSource.storedSubjectId !== pendingSubject
        && patientSource.storedSubjectId !== subjectId
      ) {
        // The patient record has an entitlement already claimed by another identity.
        // Never bypass that binding through email/patient fallback.
        previewSource = null
      } else {
        previewSource = patientSource
        if (patientSource.storedSubjectId === pendingSubject) {
          try {
            const claim = await claimPendingPreviewEntitlementSubject({
              patientRecordId: authenticatedPatientRecordId,
              clerkUserId: subjectId,
              now,
            })
            console.info('[p4-entitlement-claim]', {
              patientRecordId: authenticatedPatientRecordId,
              subjectId,
              result: claim,
            })
          } catch (error) {
            // The entitlement remains resolvable by the authenticated patient record for this
            // request. Log the failed audit binding rather than converting a valid login into
            // a false clinical denial after the identity match already passed.
            console.error('[p4-entitlement-claim] failed', {
              patientRecordId: authenticatedPatientRecordId,
              subjectId,
              error: error instanceof Error ? error.message : 'unknown',
            })
          }
        }
      }
    }
  }

  if (previewSource) {
    return {
      sourceKind: 'preview_store',
      record: await hydrateClinicLifecycleAuthority({
        record: previewSource.record,
        sourcePatientRecordId: previewSource.patientRecordId,
        authenticatedPatientRecordId,
      }),
    }
  }

  const kenKhoTier = kenKhoTierFromPlan(rawPlan)
  if (kenKhoTier) {
    return {
      sourceKind: 'legacy_kenkho_signal',
      record: createCanonicalEntitlementRecord({
        subjectId,
        tier: kenKhoTier,
        status: 'active',
        source: 'kenkho_path',
        trialStarts: null,
        trialEnds: null,
        paidThrough: null,
        lastCompletedVisit: null,
        graceEnds: null,
        accessExpires: null,
        squareSubscriptionId: null,
        entitlementReason: 'Existing Kenkho plan metadata signal in Preview; no new billing created',
        lastAccessChange: now.toISOString(),
        override: null,
        overrideReason: null,
      }),
    }
  }

  return { record: null, sourceKind: 'none' }
}
