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
  type PreviewEntitlementSourceRecord,
} from './preview-entitlement-store'
import { pendingPatientSubjectId } from './p4-provisioning-policy'
import { claimPendingPreviewEntitlementSubject } from './p4-preview-entitlement-provisioning'
import {
  isP5FounderCanaryEnvironment,
  isP5FounderCanaryRecord,
} from './p5-founder-canary-policy'

export type CanonicalEntitlementContext = {
  record: CanonicalEntitlementRecord | null
  sourceKind: 'internal_pilot' | 'preview_store' | 'founder_canary_preview_store' | 'legacy_kenkho_signal' | 'none'
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
  useStoredLifecycleSnapshot = false,
}: {
  record: CanonicalEntitlementRecord
  sourcePatientRecordId: string | null
  authenticatedPatientRecordId: string | null
  useStoredLifecycleSnapshot?: boolean
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

  // P5 uses an explicitly synthetic lifecycle anchor stored only in the Preview entitlement
  // record. This lets the Founder exercise the real clinic_ai experience without inserting a
  // fake clinical visit into Consultas. P3/P4 already validate Consultas as lifecycle authority.
  if (useStoredLifecycleSnapshot) return record

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

async function getP5FounderCanarySource({
  subjectId,
  authenticatedPatientRecordId,
}: {
  subjectId: string
  authenticatedPatientRecordId: string | null
}): Promise<PreviewEntitlementSourceRecord | null> {
  const enabled = isP5FounderCanaryEnvironment({
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
    MYAQ_P5_FOUNDER_CANARY: process.env.MYAQ_P5_FOUNDER_CANARY,
  })
  if (!enabled) return null

  // A claimed P5 entitlement is already bound to the authenticated Clerk subject.
  // Resolve that exact binding before consulting patient metadata so routes such as Food Scan
  // do not fall back to internal_pilot merely because Clerk lacks aqslimPatientId metadata.
  const bySubject = await getPreviewEntitlementSourceRecord(subjectId)
  if (bySubject && isP5FounderCanaryRecord(bySubject.record)) return bySubject

  if (!authenticatedPatientRecordId) return null

  const byPatient = await getPreviewEntitlementSourceRecordByPatientRecordId({
    patientRecordId: authenticatedPatientRecordId,
    canonicalSubjectId: subjectId,
  })
  if (byPatient && isP5FounderCanaryRecord(byPatient.record)) return byPatient

  return null
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
  const founderCanarySource = await getP5FounderCanarySource({
    subjectId,
    authenticatedPatientRecordId,
  })
  if (founderCanarySource) {
    // If the entitlement was found by exact authenticated subject, its stored patient record is
    // the governed binding for this isolated P5 canary. This does not modify Clerk metadata and
    // applies only to the P5-marked Preview record.
    const founderPatientRecordId = authenticatedPatientRecordId ?? founderCanarySource.patientRecordId
    return {
      sourceKind: 'founder_canary_preview_store',
      record: await hydrateClinicLifecycleAuthority({
        record: founderCanarySource.record,
        sourcePatientRecordId: founderCanarySource.patientRecordId,
        authenticatedPatientRecordId: founderPatientRecordId,
        useStoredLifecycleSnapshot: true,
      }),
    }
  }

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
