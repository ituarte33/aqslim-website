import 'server-only'

import { clerkClient } from '@clerk/nextjs/server'
import { ACTIVE_PILOT_FEATURES, PILOT_COHORT_ID, pilotAccessFromMetadata } from './pilot-policy'
import {
  clinicAccessPilotRoleForOperation,
  type ClinicAccessExecutionOperation,
} from './clinic-access-execution-policy'
import { withAqslimPatientBinding } from './patient-binding'
import {
  ENTITLEMENT_RECORD_VERSION,
  type CanonicalEntitlementRecord,
} from './entitlement-record'
import {
  P5_FOUNDER_ENTITLEMENT_RECORD_ID,
  P5_FOUNDER_PATIENT_RECORD_ID,
  isExactP5FounderCanary,
  p5MigrationAuditReason,
} from './clinic-p5-migration'
import {
  authorizedTrialMigrationAuditReason,
  isAuthorizedClinicTrialStoredSubject,
  isExactAuthorizedClinicTrial,
} from './clinic-trial-migration'
import {
  PREVIEW_ENTITLEMENTS_TABLE,
  PREVIEW_ENTITLEMENT_FIELDS,
  getPreviewEntitlementSourceRecordByPatientRecordId,
} from './preview-entitlement-store'

const ACTIVATION_REASON = 'MYAQ_CLINIC_001_PREVIEW_PILOT_ACTIVATION'

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

function logActivationFailure(stage: string, status?: number) {
  console.error(JSON.stringify({
    level: 'error',
    message: 'clinic_access_activation_failed',
    stage,
    ...(status ? { status } : {}),
  }))
}

async function createEntitlement({
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
  const fields = {
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
  }
  const response = await fetch(airtableUrl(), {
    method: 'POST',
    headers: headers(),
    cache: 'no-store',
    body: JSON.stringify({ fields }),
  })
  if (!response.ok) {
    logActivationFailure('entitlement_create', response.status)
    throw new Error('ENTITLEMENT_WRITE_FAILED')
  }
  const payload = await response.json() as { id?: string }
  const recordId = payload.id
  if (!recordId) throw new Error('ENTITLEMENT_WRITE_UNVERIFIED')
  return recordId
}

async function migrateTrialEntitlement({
  recordId,
  clerkUserId,
  before,
  fingerprint,
  now,
  reason,
}: {
  recordId: string
  clerkUserId: string
  before: CanonicalEntitlementRecord
  fingerprint: string
  now: Date
  reason: string
}): Promise<string> {
  const response = await fetch(airtableUrl(), {
    method: 'PATCH',
    headers: headers(),
    cache: 'no-store',
    body: JSON.stringify({
      records: [{
        id: recordId,
        fields: {
          [PREVIEW_ENTITLEMENT_FIELDS.SUBJECT_ID]: clerkUserId,
          [PREVIEW_ENTITLEMENT_FIELDS.TIER]: 'internal_pilot',
          [PREVIEW_ENTITLEMENT_FIELDS.STATUS]: 'active',
          [PREVIEW_ENTITLEMENT_FIELDS.SOURCE]: 'internal_pilot',
          [PREVIEW_ENTITLEMENT_FIELDS.TRIAL_STARTS]: null,
          [PREVIEW_ENTITLEMENT_FIELDS.TRIAL_ENDS]: null,
          [PREVIEW_ENTITLEMENT_FIELDS.PAID_THROUGH]: null,
          [PREVIEW_ENTITLEMENT_FIELDS.ACCESS_EXPIRES]: null,
          [PREVIEW_ENTITLEMENT_FIELDS.SQUARE_SUBSCRIPTION_ID]: null,
          [PREVIEW_ENTITLEMENT_FIELDS.REASON]: reason,
          [PREVIEW_ENTITLEMENT_FIELDS.LAST_ACCESS_CHANGE]: now.toISOString(),
          [PREVIEW_ENTITLEMENT_FIELDS.OVERRIDE]: null,
          [PREVIEW_ENTITLEMENT_FIELDS.OVERRIDE_REASON]: null,
          [PREVIEW_ENTITLEMENT_FIELDS.RECORD_VERSION]: ENTITLEMENT_RECORD_VERSION,
          [PREVIEW_ENTITLEMENT_FIELDS.PREVIEW_ONLY]: true,
        },
      }],
    }),
  })
  if (!response.ok) throw new Error('ENTITLEMENT_MIGRATION_FAILED')
  const payload = await response.json() as { records?: Array<{ id?: string }> }
  if (payload.records?.[0]?.id !== recordId) throw new Error('ENTITLEMENT_WRITE_UNVERIFIED')
  return recordId
}

function activatedPrivateMetadata(
  current: Record<string, unknown>,
  patientId: string,
  role: ReturnType<typeof clinicAccessPilotRoleForOperation>,
) {
  return {
    ...withAqslimPatientBinding(current, patientId),
    pilot: {
      enabled: true,
      cohort: PILOT_COHORT_ID,
      role,
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
  operation,
  now = new Date(),
}: {
  patientId: string
  clerkUserId: string
  fingerprint: string
  operation: ClinicAccessExecutionOperation
  now?: Date
}) {
  const before = await getPreviewEntitlementSourceRecordByPatientRecordId({
    patientRecordId: patientId,
    canonicalSubjectId: clerkUserId,
  })
  const migratingP5 = operation === 'migrate_p5_canary'
  const migratingClinicTrial = operation === 'migrate_clinic_trial'
  const migrating = migratingP5 || migratingClinicTrial
  const pilotRole = clinicAccessPilotRoleForOperation(operation)
  if (migratingP5) {
    if (patientId !== P5_FOUNDER_PATIENT_RECORD_ID
      || !before
      || before.airtableRecordId !== P5_FOUNDER_ENTITLEMENT_RECORD_ID
      || before.storedSubjectId !== clerkUserId
      || !isExactP5FounderCanary(before.record, clerkUserId)) {
      throw new Error('P5_MIGRATION_CONFLICT')
    }
  } else if (migratingClinicTrial) {
    if (!before
      || !isAuthorizedClinicTrialStoredSubject({
        storedSubjectId: before.storedSubjectId,
        clerkUserId,
        patientId,
        entitlementRecordId: before.airtableRecordId,
      })
      || !isExactAuthorizedClinicTrial(before.record, clerkUserId)) {
      throw new Error('CLINIC_TRIAL_MIGRATION_CONFLICT')
    }
  } else if (before && (!isExactEntitlement(before.record, clerkUserId) || before.storedSubjectId !== clerkUserId)) {
    throw new Error('ENTITLEMENT_CONFLICT')
  }

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(clerkUserId)
  const originalPrivateMetadata = user.privateMetadata
  const alreadyBound = user.privateMetadata?.aqslimPatientId === patientId
  const alreadyPilot = pilotAccessFromMetadata(user.privateMetadata)?.role === pilotRole
  const metadataChanged = !alreadyBound || !alreadyPilot
  if (!alreadyBound || !alreadyPilot) {
    await clerk.users.updateUserMetadata(clerkUserId, {
      privateMetadata: activatedPrivateMetadata(user.privateMetadata, patientId, pilotRole),
    })
  }

  let entitlementRecordId: string
  try {
    entitlementRecordId = migrating
      ? await migrateTrialEntitlement({
          recordId: before!.airtableRecordId,
          clerkUserId,
          before: before!.record,
          fingerprint,
          now,
          reason: migratingP5
            ? p5MigrationAuditReason(before!.record, fingerprint)
            : authorizedTrialMigrationAuditReason(
                before!.record,
                fingerprint,
                before!.storedSubjectId,
              ),
        })
      : before?.airtableRecordId ?? await createEntitlement({
          patientId,
          clerkUserId,
          fingerprint,
          now,
        })
  } catch (error) {
    if (metadataChanged) {
      try {
        await clerk.users.updateUserMetadata(clerkUserId, {
          privateMetadata: {
            ...activatedPrivateMetadata(originalPrivateMetadata, patientId, pilotRole),
            aqslimPatientId: originalPrivateMetadata?.aqslimPatientId ?? null,
            pilot: originalPrivateMetadata?.pilot ?? null,
          },
        })
      } catch {
        throw new Error('PARTIAL_EXECUTION_REQUIRES_REVIEW')
      }
    }
    throw error
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
    && pilotAccessFromMetadata(verifiedUser.privateMetadata)?.role === pilotRole
  if (!entitlementVerified || !accountVerified) throw new Error('POST_WRITE_VERIFICATION_FAILED')

  return {
    state: migrating
      ? 'migrated' as const
      : before && alreadyBound && alreadyPilot
        ? 'already_active' as const
        : 'activated' as const,
    operation,
    fingerprint,
    entitlementRecordId,
    entitlementVerified,
    accountVerified,
  }
}
