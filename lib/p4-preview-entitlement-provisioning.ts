import 'server-only'

import {
  ENTITLEMENT_P4_PREVIEW_BRANCH,
  SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID,
} from './nutrition/synthetic-preview-policy'
import {
  ENTITLEMENT_RECORD_VERSION,
  type CanonicalEntitlementRecord,
} from './entitlement-record'
import { clinicGraceEndDate } from './entitlement-windows'
import {
  PREVIEW_ENTITLEMENTS_TABLE,
  PREVIEW_ENTITLEMENT_FIELDS,
  getPreviewEntitlementSourceRecordByPatientRecordId,
} from './preview-entitlement-store'
import {
  pendingPatientSubjectId,
  provisioningPlanForClinicVisit,
  type P4ProvisioningAction,
} from './p4-provisioning-policy'

export type P4ProvisioningResult = {
  action: P4ProvisioningAction
  write: 'none' | 'created' | 'updated'
  patientRecordId: string
  entitlementRecordId: string | null
  reason: string
}

function isP4ProvisioningEnabled(): boolean {
  return process.env.VERCEL_ENV === 'preview'
    && process.env.VERCEL_GIT_COMMIT_REF === ENTITLEMENT_P4_PREVIEW_BRANCH
    && process.env.AIRTABLE_BASE_ID === SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID
    && Boolean(process.env.AIRTABLE_PAT)
}

function normalizedVisitDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) throw new Error('Invalid completed clinic visit date')
  const date = `${match[1]}-${match[2]}-${match[3]}`
  if (!Number.isFinite(Date.parse(`${date}T00:00:00Z`))) throw new Error('Invalid completed clinic visit date')
  return date
}

function completedAtFromVisitDate(value: string): Date {
  return new Date(`${normalizedVisitDate(value)}T00:00:00.000Z`)
}

function airtableHeaders(): HeadersInit {
  const pat = process.env.AIRTABLE_PAT
  if (!pat) throw new Error('AIRTABLE_PAT is not configured')
  return {
    Authorization: `Bearer ${pat}`,
    'Content-Type': 'application/json',
  }
}

function airtableUrl(path = ''): string {
  const baseId = process.env.AIRTABLE_BASE_ID
  if (!baseId) throw new Error('AIRTABLE_BASE_ID is not configured')
  return `https://api.airtable.com/v0/${baseId}/${PREVIEW_ENTITLEMENTS_TABLE}${path}`
}

async function writeEntitlement({
  recordId,
  fields,
}: {
  recordId: string | null
  fields: Record<string, unknown>
}): Promise<{ id: string }> {
  const response = await fetch(airtableUrl(recordId ? `/${recordId}` : ''), {
    method: recordId ? 'PATCH' : 'POST',
    headers: airtableHeaders(),
    cache: 'no-store',
    body: JSON.stringify({ fields }),
  })
  if (!response.ok) {
    console.error('[p4-entitlement-provisioning] airtable_write_failed', {
      status: response.status,
      operation: recordId ? 'update' : 'create',
    })
    throw new Error('Preview entitlement provisioning write failed')
  }
  return response.json() as Promise<{ id: string }>
}

function snapshotFields({
  visitDate,
  reason,
  now,
}: {
  visitDate: string
  reason: string
  now: Date
}): Record<string, unknown> {
  const normalizedDate = normalizedVisitDate(visitDate)
  return {
    [PREVIEW_ENTITLEMENT_FIELDS.LAST_COMPLETED_VISIT]: normalizedDate,
    [PREVIEW_ENTITLEMENT_FIELDS.GRACE_ENDS]: clinicGraceEndDate(normalizedDate),
    [PREVIEW_ENTITLEMENT_FIELDS.REASON]: reason,
    [PREVIEW_ENTITLEMENT_FIELDS.LAST_ACCESS_CHANGE]: now.toISOString(),
    [PREVIEW_ENTITLEMENT_FIELDS.RECORD_VERSION]: ENTITLEMENT_RECORD_VERSION,
    [PREVIEW_ENTITLEMENT_FIELDS.PREVIEW_ONLY]: true,
  }
}

function existingIsPaidClinicAi(record: CanonicalEntitlementRecord | null): boolean {
  return Boolean(record && record.tier === 'clinic_ai' && record.source === 'clinic_ai_paid')
}

export async function provisionClinicEntitlementForCompletedVisit({
  patientRecordId,
  visitType,
  visitDate,
  now = new Date(),
}: {
  patientRecordId: string
  visitType: string
  visitDate: string
  now?: Date
}): Promise<P4ProvisioningResult> {
  if (!isP4ProvisioningEnabled()) {
    return {
      action: 'none',
      write: 'none',
      patientRecordId,
      entitlementRecordId: null,
      reason: 'P4_PROVISIONING_DISABLED',
    }
  }
  if (!/^rec[A-Za-z0-9]{14}$/.test(patientRecordId)) throw new Error('Invalid patient record ID')

  const pendingSubject = pendingPatientSubjectId(patientRecordId)
  const existingSource = await getPreviewEntitlementSourceRecordByPatientRecordId({
    patientRecordId,
    canonicalSubjectId: pendingSubject,
  })
  const existingRecord = existingSource?.record ?? null
  const plan = provisioningPlanForClinicVisit({
    visitType,
    completedAt: completedAtFromVisitDate(visitDate),
    existingRecord,
  })

  if (plan.action === 'none' || plan.action === 'preserve_protected') {
    return {
      action: plan.action,
      write: 'none',
      patientRecordId,
      entitlementRecordId: existingSource?.airtableRecordId ?? null,
      reason: plan.reason,
    }
  }

  const fields: Record<string, unknown> = snapshotFields({
    visitDate,
    reason: `P4 ${plan.reason}; visit=${visitType}`,
    now,
  })

  if (!existingSource) {
    fields[PREVIEW_ENTITLEMENT_FIELDS.SUBJECT_ID] = pendingSubject
    fields[PREVIEW_ENTITLEMENT_FIELDS.PATIENT_RECORD_ID] = patientRecordId
  }

  if (plan.action === 'start_or_renew_trial') {
    fields[PREVIEW_ENTITLEMENT_FIELDS.TIER] = 'clinic_ai'
    fields[PREVIEW_ENTITLEMENT_FIELDS.STATUS] = 'trial'
    fields[PREVIEW_ENTITLEMENT_FIELDS.SOURCE] = 'clinic_ai_trial'
    fields[PREVIEW_ENTITLEMENT_FIELDS.TRIAL_STARTS] = plan.trialStarts
    fields[PREVIEW_ENTITLEMENT_FIELDS.TRIAL_ENDS] = plan.trialEnds
    // Never manufacture payment evidence when starting or renewing a trial.
    fields[PREVIEW_ENTITLEMENT_FIELDS.PAID_THROUGH] = null
    fields[PREVIEW_ENTITLEMENT_FIELDS.SQUARE_SUBSCRIPTION_ID] = null
  } else if (plan.action === 'create_portal_basic') {
    fields[PREVIEW_ENTITLEMENT_FIELDS.TIER] = 'portal_basic'
    fields[PREVIEW_ENTITLEMENT_FIELDS.STATUS] = 'active'
    fields[PREVIEW_ENTITLEMENT_FIELDS.SOURCE] = 'clinic_visit'
    fields[PREVIEW_ENTITLEMENT_FIELDS.TRIAL_STARTS] = null
    fields[PREVIEW_ENTITLEMENT_FIELDS.TRIAL_ENDS] = null
    fields[PREVIEW_ENTITLEMENT_FIELDS.PAID_THROUGH] = null
    fields[PREVIEW_ENTITLEMENT_FIELDS.SQUARE_SUBSCRIPTION_ID] = null
  } else if (plan.action === 'refresh_existing') {
    // Preserve the commercial/AI state exactly. Only the audit snapshot is refreshed;
    // runtime lifecycle remains authoritative from linked Consultas under D11.
    if (existingIsPaidClinicAi(existingRecord)) {
      throw new Error('Paid clinic AI should have been protected before refresh')
    }
  }

  const written = await writeEntitlement({
    recordId: existingSource?.airtableRecordId ?? null,
    fields,
  })

  return {
    action: plan.action,
    write: existingSource ? 'updated' : 'created',
    patientRecordId,
    entitlementRecordId: written.id,
    reason: plan.reason,
  }
}

export async function claimPendingPreviewEntitlementSubject({
  patientRecordId,
  clerkUserId,
  now = new Date(),
}: {
  patientRecordId: string
  clerkUserId: string
  now?: Date
}): Promise<'disabled' | 'none' | 'already_claimed' | 'claimed'> {
  if (!isP4ProvisioningEnabled()) return 'disabled'
  if (!/^rec[A-Za-z0-9]{14}$/.test(patientRecordId)) return 'none'
  if (!clerkUserId.trim()) return 'none'

  const source = await getPreviewEntitlementSourceRecordByPatientRecordId({
    patientRecordId,
    canonicalSubjectId: clerkUserId,
  })
  if (!source) return 'none'
  if (source.storedSubjectId === clerkUserId) return 'already_claimed'
  if (source.storedSubjectId !== pendingPatientSubjectId(patientRecordId)) {
    throw new Error('Preview entitlement is already bound to a different subject')
  }

  await writeEntitlement({
    recordId: source.airtableRecordId,
    fields: {
      [PREVIEW_ENTITLEMENT_FIELDS.SUBJECT_ID]: clerkUserId,
      [PREVIEW_ENTITLEMENT_FIELDS.LAST_ACCESS_CHANGE]: now.toISOString(),
      [PREVIEW_ENTITLEMENT_FIELDS.REASON]: `${source.record.entitlementReason}; claimed by authenticated patient subject`,
      [PREVIEW_ENTITLEMENT_FIELDS.RECORD_VERSION]: ENTITLEMENT_RECORD_VERSION,
      [PREVIEW_ENTITLEMENT_FIELDS.PREVIEW_ONLY]: true,
    },
  })
  return 'claimed'
}
