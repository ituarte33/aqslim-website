import 'server-only'

import {
  isEntitlementEnforcementPreviewBranch,
  SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID,
} from './nutrition/synthetic-preview-policy'
import {
  createCanonicalEntitlementRecord,
  ENTITLEMENT_RECORD_VERSION,
  type AccessStatus,
  type AccessTier,
  type CanonicalEntitlementRecord,
  type EntitlementOverride,
  type EntitlementSource,
} from './entitlement-record'

export const PREVIEW_ENTITLEMENTS_TABLE = 'tblkAuEOcCA5sek4n'

export const PREVIEW_ENTITLEMENT_FIELDS = {
  SUBJECT_ID: 'fld0AFNM2RZBMbapg',
  PATIENT_RECORD_ID: 'fld0KoazUqb9iLMLV',
  TIER: 'fldnqcayvpmGUbCVE',
  STATUS: 'fldfKBi7AWefar9z8',
  SOURCE: 'fldmIsMMZgDZoHg4N',
  TRIAL_STARTS: 'fldGdKZfX2v9cQ1Le',
  TRIAL_ENDS: 'fld2QirxutYpjS375',
  PAID_THROUGH: 'fldmGlJM58Oyxa27v',
  LAST_COMPLETED_VISIT: 'fldXRA24vqK3CyAVs',
  GRACE_ENDS: 'fldkPzGNLvSQq9ZHv',
  ACCESS_EXPIRES: 'fldllONIETpRlRd67',
  SQUARE_SUBSCRIPTION_ID: 'fldKEBc1FVfMwurUN',
  REASON: 'fldDAfr6AMVtIFW6k',
  LAST_ACCESS_CHANGE: 'fldfc6JmExwqrod7T',
  OVERRIDE: 'fldq1pTi5ZkRoSBHE',
  OVERRIDE_REASON: 'fldF9a5MKDIgioEhS',
  RECORD_VERSION: 'fld9gFZKu2UQtXUWa',
  PREVIEW_ONLY: 'fldhAlvQ6KNwba6V1',
} as const

const TIERS = new Set<AccessTier>([
  'portal_basic',
  'clinic_ai',
  'kenkho_start',
  'kenkho_plus',
  'kenkho_elite',
  'internal_pilot',
])

const STATUSES = new Set<AccessStatus>([
  'trial',
  'active',
  'grace',
  'suspended',
  'expired',
  'canceled',
])

const SOURCES = new Set<EntitlementSource>([
  'internal_pilot',
  'clinic_visit',
  'clinic_ai_trial',
  'clinic_ai_paid',
  'kenkho_path',
  'administrative',
  'unresolved',
])

export type PreviewEntitlementSourceRecord = {
  record: CanonicalEntitlementRecord
  patientRecordId: string | null
  airtableRecordId: string
  storedSubjectId: string
}

type AirtableEntitlementRecord = {
  id: string
  fields: Record<string, unknown>
}

function isPreviewStoreEnabled(): boolean {
  return process.env.VERCEL_ENV === 'preview'
    && isEntitlementEnforcementPreviewBranch(process.env.VERCEL_GIT_COMMIT_REF)
    && process.env.AIRTABLE_BASE_ID === SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID
    && Boolean(process.env.AIRTABLE_PAT)
}

function text(fields: Record<string, unknown>, fieldId: string): string | null {
  const value = fields[fieldId]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function tier(value: string | null): AccessTier | null {
  return value && TIERS.has(value as AccessTier) ? value as AccessTier : null
}

function status(value: string | null): AccessStatus | null {
  return value && STATUSES.has(value as AccessStatus) ? value as AccessStatus : null
}

function source(value: string | null): EntitlementSource | null {
  return value && SOURCES.has(value as EntitlementSource) ? value as EntitlementSource : null
}

function override(value: string | null): EntitlementOverride {
  return value === 'allow' || value === 'deny' ? value : null
}

function escapeFormulaString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

async function queryPreviewEntitlementRecords(filterByFormula: string): Promise<AirtableEntitlementRecord[]> {
  if (!isPreviewStoreEnabled()) return []

  const baseId = process.env.AIRTABLE_BASE_ID as string
  const pat = process.env.AIRTABLE_PAT as string
  const params = new URLSearchParams({
    maxRecords: '2',
    returnFieldsByFieldId: 'true',
    filterByFormula,
  })
  Object.values(PREVIEW_ENTITLEMENT_FIELDS).forEach(fieldId => params.append('fields[]', fieldId))

  const response = await fetch(
    `https://api.airtable.com/v0/${baseId}/${PREVIEW_ENTITLEMENTS_TABLE}?${params}`,
    {
      headers: { Authorization: `Bearer ${pat}` },
      cache: 'no-store',
    },
  )
  if (!response.ok) throw new Error('Preview entitlement source unavailable')

  const payload = await response.json() as { records?: AirtableEntitlementRecord[] }
  return payload.records ?? []
}

function parsePreviewEntitlementRecord({
  airtableRecord,
  canonicalSubjectId,
  expectedStoredSubjectId,
  expectedPatientRecordId,
}: {
  airtableRecord: AirtableEntitlementRecord
  canonicalSubjectId: string
  expectedStoredSubjectId?: string
  expectedPatientRecordId?: string
}): PreviewEntitlementSourceRecord {
  const fields = airtableRecord.fields
  const storedSubjectId = text(fields, PREVIEW_ENTITLEMENT_FIELDS.SUBJECT_ID)
  const patientRecordId = text(fields, PREVIEW_ENTITLEMENT_FIELDS.PATIENT_RECORD_ID)
  const storedTier = tier(text(fields, PREVIEW_ENTITLEMENT_FIELDS.TIER))
  const storedStatus = status(text(fields, PREVIEW_ENTITLEMENT_FIELDS.STATUS))
  const storedSource = source(text(fields, PREVIEW_ENTITLEMENT_FIELDS.SOURCE))
  const recordVersion = text(fields, PREVIEW_ENTITLEMENT_FIELDS.RECORD_VERSION)

  if (
    !storedSubjectId
    || (expectedStoredSubjectId && storedSubjectId !== expectedStoredSubjectId)
    || (expectedPatientRecordId && patientRecordId !== expectedPatientRecordId)
    || !storedTier
    || !storedStatus
    || !storedSource
    || recordVersion !== ENTITLEMENT_RECORD_VERSION
    || fields[PREVIEW_ENTITLEMENT_FIELDS.PREVIEW_ONLY] !== true
  ) {
    throw new Error('Invalid Preview entitlement source record')
  }

  const lastAccessChange = text(fields, PREVIEW_ENTITLEMENT_FIELDS.LAST_ACCESS_CHANGE)
  if (!lastAccessChange) throw new Error('Preview entitlement source missing Last Access Change')

  return {
    airtableRecordId: airtableRecord.id,
    storedSubjectId,
    patientRecordId,
    record: createCanonicalEntitlementRecord({
      subjectId: canonicalSubjectId,
      tier: storedTier,
      status: storedStatus,
      source: storedSource,
      trialStarts: text(fields, PREVIEW_ENTITLEMENT_FIELDS.TRIAL_STARTS),
      trialEnds: text(fields, PREVIEW_ENTITLEMENT_FIELDS.TRIAL_ENDS),
      paidThrough: text(fields, PREVIEW_ENTITLEMENT_FIELDS.PAID_THROUGH),
      lastCompletedVisit: text(fields, PREVIEW_ENTITLEMENT_FIELDS.LAST_COMPLETED_VISIT),
      graceEnds: text(fields, PREVIEW_ENTITLEMENT_FIELDS.GRACE_ENDS),
      accessExpires: text(fields, PREVIEW_ENTITLEMENT_FIELDS.ACCESS_EXPIRES),
      squareSubscriptionId: text(fields, PREVIEW_ENTITLEMENT_FIELDS.SQUARE_SUBSCRIPTION_ID),
      entitlementReason: text(fields, PREVIEW_ENTITLEMENT_FIELDS.REASON) ?? 'Preview entitlement source',
      lastAccessChange,
      override: override(text(fields, PREVIEW_ENTITLEMENT_FIELDS.OVERRIDE)),
      overrideReason: text(fields, PREVIEW_ENTITLEMENT_FIELDS.OVERRIDE_REASON),
    }),
  }
}

export async function getPreviewEntitlementSourceRecord(
  subjectId: string,
): Promise<PreviewEntitlementSourceRecord | null> {
  if (!isPreviewStoreEnabled()) return null
  if (!subjectId.trim()) return null

  const records = await queryPreviewEntitlementRecords(
    `AND({Subject ID} = "${escapeFormulaString(subjectId)}", {Preview Only} = TRUE())`,
  )
  if (records.length === 0) return null
  if (records.length > 1) throw new Error('Duplicate Preview entitlement source records')

  return parsePreviewEntitlementRecord({
    airtableRecord: records[0],
    canonicalSubjectId: subjectId,
    expectedStoredSubjectId: subjectId,
  })
}

export async function getPreviewEntitlementSourceRecordByPatientRecordId({
  patientRecordId,
  canonicalSubjectId,
}: {
  patientRecordId: string
  canonicalSubjectId: string
}): Promise<PreviewEntitlementSourceRecord | null> {
  if (!isPreviewStoreEnabled()) return null
  if (!/^rec[A-Za-z0-9]{14}$/.test(patientRecordId)) return null
  if (!canonicalSubjectId.trim()) return null

  const records = await queryPreviewEntitlementRecords(
    `AND({Patient Record ID} = "${escapeFormulaString(patientRecordId)}", {Preview Only} = TRUE())`,
  )
  if (records.length === 0) return null
  if (records.length > 1) throw new Error('Duplicate Preview entitlement patient records')

  return parsePreviewEntitlementRecord({
    airtableRecord: records[0],
    canonicalSubjectId,
    expectedPatientRecordId: patientRecordId,
  })
}
