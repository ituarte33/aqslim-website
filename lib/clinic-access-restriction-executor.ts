import 'server-only'

import {
  PREVIEW_ENTITLEMENTS_TABLE,
  PREVIEW_ENTITLEMENT_FIELDS,
  getPreviewEntitlementSourceRecordByPatientRecordId,
} from './preview-entitlement-store'

export type ClinicAccessRestrictionAction = 'suspend' | 'restore'

const RESTRICTION_REASON = 'MYAQ_CLINIC_MANUAL_ACCESS_RESTRICTION'
const RESTORE_REASON = 'MYAQ_CLINIC_MANUAL_ACCESS_RESTORED'

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

export async function executeClinicAccessRestriction({
  patientId,
  clerkUserId,
  action,
  actorEmail,
  now = new Date(),
}: {
  patientId: string
  clerkUserId: string
  action: ClinicAccessRestrictionAction
  actorEmail: string
  now?: Date
}) {
  const source = await getPreviewEntitlementSourceRecordByPatientRecordId({
    patientRecordId: patientId,
    canonicalSubjectId: clerkUserId,
  })
  if (!source) throw new Error('ENTITLEMENT_NOT_FOUND')

  const before = source.record
  const suspended = action === 'suspend'
  const expectedStatus = suspended ? 'suspended' : 'active'
  const expectedOverride = suspended ? 'deny' : null
  const auditReason = suspended
    ? `${RESTRICTION_REASON}; actor=${actorEmail}; previous_status=${before.status}`
    : `${RESTORE_REASON}; actor=${actorEmail}; previous_status=${before.status}`

  if (before.status === expectedStatus && before.override === expectedOverride) {
    return {
      state: suspended ? 'already_suspended' as const : 'already_active' as const,
      status: before.status,
      verified: true,
    }
  }

  const response = await fetch(airtableUrl(), {
    method: 'PATCH',
    headers: headers(),
    cache: 'no-store',
    body: JSON.stringify({
      records: [{
        id: source.airtableRecordId,
        fields: {
          [PREVIEW_ENTITLEMENT_FIELDS.STATUS]: expectedStatus,
          [PREVIEW_ENTITLEMENT_FIELDS.REASON]: auditReason,
          [PREVIEW_ENTITLEMENT_FIELDS.LAST_ACCESS_CHANGE]: now.toISOString(),
          [PREVIEW_ENTITLEMENT_FIELDS.OVERRIDE]: expectedOverride,
          [PREVIEW_ENTITLEMENT_FIELDS.OVERRIDE_REASON]: suspended ? auditReason : null,
        },
      }],
    }),
  })
  if (!response.ok) throw new Error('ENTITLEMENT_WRITE_FAILED')

  const verified = await getPreviewEntitlementSourceRecordByPatientRecordId({
    patientRecordId: patientId,
    canonicalSubjectId: clerkUserId,
  })
  if (!verified
    || verified.airtableRecordId !== source.airtableRecordId
    || verified.record.status !== expectedStatus
    || verified.record.override !== expectedOverride) {
    throw new Error('POST_WRITE_VERIFICATION_FAILED')
  }

  return {
    state: suspended ? 'suspended' as const : 'restored' as const,
    status: verified.record.status,
    verified: true,
  }
}
