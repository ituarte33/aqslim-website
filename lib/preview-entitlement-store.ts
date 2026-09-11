import 'server-only'

import {
  ENTITLEMENT_P3_PREVIEW_BRANCH,
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

const FIELDS = {
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
}

function isP3PreviewStoreEnabled(): boolean {
  return process.env.VERCEL_ENV === 'preview'
    && process.env.VERCEL_GIT_COMMIT_REF === ENTITLEMENT_P3_PREVIEW_BRANCH
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

export async function getPreviewEntitlementSourceRecord(
  subjectId: string,
): Promise<PreviewEntitlementSourceRecord | null> {
  if (!isP3PreviewStoreEnabled()) return null
  if (!subjectId.trim()) return null

  const baseId = process.env.AIRTABLE_BASE_ID as string
  const pat = process.env.AIRTABLE_PAT as string
  const params = new URLSearchParams({
    maxRecords: '2',
    returnFieldsByFieldId: 'true',
    filterByFormula: `AND({Subject ID} = "${escapeFormulaString(subjectId)}", {Preview Only} = TRUE())`,
  })
  Object.values(FIELDS).forEach(fieldId => params.append('fields[]', fieldId))

  const response = await fetch(
    `https://api.airtable.com/v0/${baseId}/${PREVIEW_ENTITLEMENTS_TABLE}?${params}`,
    {
      headers: { Authorization: `Bearer ${pat}` },
      cache: 'no-store',
    },
  )
  if (!response.ok) throw new Error('Preview entitlement source unavailable')

  const payload = await response.json() as {
    records?: Array<{ id: string; fields: Record<string, unknown> }>
  }
  const records = payload.records ?? []
  if (records.length === 0) return null
  if (records.length > 1) throw new Error('Duplicate Preview entitlement source records')

  const fields = records[0].fields
  const storedSubjectId = text(fields, FIELDS.SUBJECT_ID)
  const storedTier = tier(text(fields, FIELDS.TIER))
  const storedStatus = status(text(fields, FIELDS.STATUS))
  const storedSource = source(text(fields, FIELDS.SOURCE))
  const recordVersion = text(fields, FIELDS.RECORD_VERSION)

  if (
    storedSubjectId !== subjectId
    || !storedTier
    || !storedStatus
    || !storedSource
    || recordVersion !== ENTITLEMENT_RECORD_VERSION
    || fields[FIELDS.PREVIEW_ONLY] !== true
  ) {
    throw new Error('Invalid Preview entitlement source record')
  }

  const lastAccessChange = text(fields, FIELDS.LAST_ACCESS_CHANGE)
  if (!lastAccessChange) throw new Error('Preview entitlement source missing Last Access Change')

  return {
    patientRecordId: text(fields, FIELDS.PATIENT_RECORD_ID),
    record: createCanonicalEntitlementRecord({
      subjectId,
      tier: storedTier,
      status: storedStatus,
      source: storedSource,
      trialStarts: text(fields, FIELDS.TRIAL_STARTS),
      trialEnds: text(fields, FIELDS.TRIAL_ENDS),
      paidThrough: text(fields, FIELDS.PAID_THROUGH),
      lastCompletedVisit: text(fields, FIELDS.LAST_COMPLETED_VISIT),
      graceEnds: text(fields, FIELDS.GRACE_ENDS),
      accessExpires: text(fields, FIELDS.ACCESS_EXPIRES),
      squareSubscriptionId: text(fields, FIELDS.SQUARE_SUBSCRIPTION_ID),
      entitlementReason: text(fields, FIELDS.REASON) ?? 'Preview entitlement source',
      lastAccessChange,
      override: override(text(fields, FIELDS.OVERRIDE)),
      overrideReason: text(fields, FIELDS.OVERRIDE_REASON),
    }),
  }
}
