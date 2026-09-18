import 'server-only'

import { clerkClient } from '@clerk/nextjs/server'
import { ACTIVE_PILOT_FEATURES, PILOT_COHORT_ID, pilotAccessFromMetadata } from './pilot-policy'
import { withAqslimPatientBinding } from './patient-binding'
import {
  ENTITLEMENT_RECORD_VERSION,
  type CanonicalEntitlementRecord,
} from './entitlement-record'
import {
  PREVIEW_ENTITLEMENTS_TABLE,
  PREVIEW_ENTITLEMENT_FIELDS,
  getPreviewEntitlementSourceRecordByPatientRecordId,
} from './preview-entitlement-store'

const ACTIVATION_REASON = 'MYAQ_CLINIC_001_FOUNDER_PREVIEW_ACTIVATION'

function headers(): HeadersInit {
  const pat = process.env.AIRTABLE_PAT
  if (!pat) throw new Error('EXECUTION_NOT_CONFIGURED')
  return { Authorization: `Bearer ${pat}`, 'Content-Type': 'application/json' }
}

function airtableUrl(): string {
  const baseId = process.env.AIRTABLE_BASE_ID
  if (!baseId) throw new Error('EXECUTION_NOT_CONFIGURED')
  return `https://api.airtable.com/v0/${baseId}/${PREVIEW_ENTITLEMENTS_TABLE}`
}

function isExactEntitlement(record: CanonicalEntitlementRecord, clerkUserId: string): boolean {
  return record.subjectId === clerkUserId
    && record.tier === 'internal_pilot'
    && record.status === 'active'
    && record.source === 'internal_pilot'
    && record.paidThrough === null
    && record.squareSubscriptionId === null
}

async function upsertEntitlement({
  patientId,
  clerkUserId,
  fingerprint,
  now,
}: {
  patientId: string
  clerkUserId: string
  fingerprint: string
  now: Date
}): Promise<string> {
  const response = await fetch(airtableUrl(), {
    method: 'POST',
    headers: headers(),
    cache: 'no-store',
    body: JSON.stringify({
      performUpsert: { fieldsToMergeOn: [PREVIEW_ENTITLEMENT_FIELDS.PATIENT_RECORD_ID] },
      records: [{
        fields: {
          [PREVIEW_ENTITLEMENT_FIELDS.SUBJECT_ID]: clerkUserId,
          [PREVIEW_ENTITLEMENT_FIELDS.PATIENT_RECORD_ID]: patientId,
          [PREVIEW_ENTITLEMENT_FIELDS.TIER]: 'internal_pilot',
          [PREVIEW_ENTITLEMENT_FIELDS.STATUS]: 'active',
          [PREVIEW_ENTITLEMENT_FIELDS.SOURCE]: 'internal_pilot',
          [PREVIEW_ENTITLEMENT_FIELDS.TRIAL_STARTS]: null,
          [PREVIEW_ENTITLEMENT_FIELDS.TRIAL_ENDS]: null,
          [PREVIEW_ENTITLEMENT_FIELDS.PAID_THROUGH]: null,
          [PREVIEW_ENTITLEMENT_FIELDS.LAST_COMPLETED_VISIT]: null,
          [PREVIEW_ENTITLEMENT_FIELDS.GRACE_ENDS]: null,
          [PREVIEW_ENTITLEMENT_FIELDS.ACCESS_EXPIRES]: null,
          [PREVIEW_ENTITLEMENT_FIELDS.SQUARE_SUBSCRIPTION_ID]: null,
          [PREVIEW_ENTITLEMENT_FIELDS.REASON]: `${ACTIVATION_REASON}; fingerprint=${fingerprint}`,
          [PREVIEW_ENTITLEMENT_FIELDS.LAST_ACCESS_CHANGE]: now.toISOString(),
          [PREVIEW_ENTITLEMENT_FIELDS.OVERRIDE]: null,
          [PREVIEW_ENTITLEMENT_FIELDS.OVERRIDE_REASON]: null,
          [PREVIEW_ENTITLEMENT_FIELDS.RECORD_VERSION]: ENTITLEMENT_RECORD_VERSION,
          [PREVIEW_ENTITLEMENT_FIELDS.PREVIEW_ONLY]: true,
        },
      }],
    }),
  })
  if (!response.ok) throw new Error('ENTITLEMENT_WRITE_FAILED')
  const payload = await response.json() as { records?: Array<{ id?: string }> }
  const recordId = payload.records?.[0]?.id
  if (!recordId) throw new Error('ENTITLEMENT_WRITE_UNVERIFIED')
  return recordId
}

function activatedPrivateMetadata(current: Record<string, unknown>, patientId: string) {
  return {
    ...withAqslimPatientBinding(current, patientId),
    pilot: {
      enabled: true,
      cohort: PILOT_COHORT_ID,
      role: 'founder',
      language: 'es',
      features: [...ACTIVE_PILOT_FEATURES],
      scope: 'preview_only',
      source: ACTIVATION_REASON,
    },
  }
}

export async function executeClinicAccessActivation({
  patientId,
  clerkUserId,
  fingerprint,
  now = new Date(),
}: {
  patientId: string
  clerkUserId: string
  fingerprint: string
  now?: Date
}) {
  const before = await getPreviewEntitlementSourceRecordByPatientRecordId({
    patientRecordId: patientId,
    canonicalSubjectId: clerkUserId,
  })
  if (before && (!isExactEntitlement(before.record, clerkUserId) || before.storedSubjectId !== clerkUserId)) {
    throw new Error('ENTITLEMENT_CONFLICT')
  }

  const entitlementRecordId = before?.airtableRecordId ?? await upsertEntitlement({
    patientId,
    clerkUserId,
    fingerprint,
    now,
  })

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(clerkUserId)
  const alreadyBound = user.privateMetadata?.aqslimPatientId === patientId
  const alreadyPilot = pilotAccessFromMetadata(user.privateMetadata) !== null
  if (!alreadyBound || !alreadyPilot) {
    await clerk.users.updateUserMetadata(clerkUserId, {
      privateMetadata: activatedPrivateMetadata(user.privateMetadata, patientId),
    })
  }

  const [verifiedEntitlement, verifiedUser] = await Promise.all([
    getPreviewEntitlementSourceRecordByPatientRecordId({
      patientRecordId: patientId,
      canonicalSubjectId: clerkUserId,
    }),
    clerk.users.getUser(clerkUserId),
  ])
  const entitlementVerified = Boolean(
    verifiedEntitlement
    && verifiedEntitlement.airtableRecordId === entitlementRecordId
    && verifiedEntitlement.storedSubjectId === clerkUserId
    && isExactEntitlement(verifiedEntitlement.record, clerkUserId),
  )
  const accountVerified = verifiedUser.privateMetadata?.aqslimPatientId === patientId
    && pilotAccessFromMetadata(verifiedUser.privateMetadata) !== null
  if (!entitlementVerified || !accountVerified) throw new Error('POST_WRITE_VERIFICATION_FAILED')

  return {
    state: before && alreadyBound && alreadyPilot ? 'already_active' as const : 'activated' as const,
    fingerprint,
    entitlementRecordId,
    entitlementVerified,
    accountVerified,
  }
}
