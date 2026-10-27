import 'server-only'
import { createHash } from 'node:crypto'
import { getClienteById } from './airtable'
import { clinicRuntimeMode, clinicWritesPaused, assertClinicSourceWriteAllowed } from './clinic-runtime-policy'
import { CLINIC_FOUNDER_EMAIL } from './clinic-preview-policy'
import { SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID } from './nutrition/synthetic-preview-policy'
import { patientIsUnavailable } from './clinic-patient-administration-policy'
import { getLinkedClinicConsultationsByPatientId } from './clinic-consultation-source'
import { planClinicAccessRenewal } from './clinic-access-renewal-policy'
import { getPortalAccessRecordByPatientRecordId, PREVIEW_ENTITLEMENT_FIELDS as F, PREVIEW_ENTITLEMENTS_TABLE } from './preview-entitlement-store'
import type { CanonicalEntitlementRecord } from './entitlement-record'
const fields = { tier: F.TIER, status: F.STATUS, source: F.SOURCE, trialStarts: F.TRIAL_STARTS, trialEnds: F.TRIAL_ENDS, lastCompletedVisit: F.LAST_COMPLETED_VISIT, graceEnds: F.GRACE_ENDS } as const
function configured() {
  if (process.env.AIRTABLE_BASE_ID !== SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID || !process.env.AIRTABLE_PAT) throw new Error('ACCESS_RENEWAL_UNAVAILABLE')
}
function hash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex') }
export async function reviewClinicAccessRenewal({ patientId, consultationId, now = new Date() }: { patientId: string; consultationId: string; now?: Date }) {
  configured()
  if (!/^rec[A-Za-z0-9]{14}$/.test(patientId) || !/^rec[A-Za-z0-9]{14}$/.test(consultationId)) throw new Error('INVALID_PATIENT')
  const [patient, source, visits] = await Promise.all([
    getClienteById(patientId),
    getPortalAccessRecordByPatientRecordId({ patientRecordId: patientId, canonicalSubjectId: `patient:${patientId}`, reviewOnly: true }),
    getLinkedClinicConsultationsByPatientId(patientId),
  ])
  if (!patient) throw new Error('PATIENT_NOT_FOUND')
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(now)
  const plan = planClinicAccessRenewal({ patientId, consultationId, visits, record: source?.record ?? null, isOperational: source?.isOperational === true, patientAvailable: !patientIsUnavailable(patient), today })
  const fingerprint = hash({ patient, source, visits, consultationId, today, plan })
  return { source, review: { ...plan, fingerprint, executionEnabled: clinicRuntimeMode() === 'production' && !clinicWritesPaused() } }
}
export async function executeClinicAccessRenewal(input: { patientId: string; consultationId: string; actorEmail: string; fingerprint?: string; now?: Date }) {
  if (clinicRuntimeMode() !== 'production') throw new Error('ACCESS_RENEWAL_READ_ONLY')
  assertClinicSourceWriteAllowed()
  if (input.actorEmail.trim().toLowerCase() !== CLINIC_FOUNDER_EMAIL) throw new Error('FORBIDDEN')
  const snapshot = await reviewClinicAccessRenewal(input)
  if (input.fingerprint && input.fingerprint !== snapshot.review.fingerprint) throw new Error('REVIEW_CHANGED')
  const { source, review } = snapshot
  if (review.state === 'blocked') throw new Error('ACCESS_RENEWAL_BLOCKED')
  if (review.state !== 'update' || !source) return { state: review.state, message: review.message, verified: true }
  const before = source.record
  const fresh = await reviewClinicAccessRenewal(input)
  if (fresh.review.fingerprint !== review.fingerprint) throw new Error('REVIEW_CHANGED')
  const patch: Record<string, unknown> = {}
  for (const [key, id] of Object.entries(fields)) if (key in review.changes) patch[id] = review.changes[key as keyof CanonicalEntitlementRecord]
  patch[F.REASON] = `MYAQ_CLINIC_ACCESS_VISIT:${input.consultationId}; actor=${input.actorEmail}`
  patch[F.LAST_ACCESS_CHANGE] = (input.now ?? new Date()).toISOString()
  // No create/upsert, identity change, payment evidence or override mutation.
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${PREVIEW_ENTITLEMENTS_TABLE}/${source.airtableRecordId}?returnFieldsByFieldId=true`
  const headers = { Authorization: `Bearer ${process.env.AIRTABLE_PAT}`, 'Content-Type': 'application/json' }
  const response = await fetch(url, { method: 'PATCH', cache: 'no-store', headers, body: JSON.stringify({ fields: patch }) })
  if (!response.ok) throw new Error('ACCESS_RENEWAL_WRITE_UNCERTAIN')
  const readback = await fetch(url, { headers, cache: 'no-store' })
  if (!readback.ok) throw new Error('ACCESS_RENEWAL_VERIFY_FAILED')
  const persisted = await readback.json() as { id?: string; fields?: Record<string, unknown> }
  if (persisted.id !== source.airtableRecordId || !persisted.fields || Object.entries(patch).some(([id, value]) => (persisted.fields![id] ?? null) !== value)
    || persisted.fields[F.PATIENT_RECORD_ID] !== input.patientId || persisted.fields[F.SUBJECT_ID] !== source.storedSubjectId || persisted.fields[F.PREVIEW_ONLY] === true) throw new Error('ACCESS_RENEWAL_VERIFY_FAILED')
  const verified = await getPortalAccessRecordByPatientRecordId({ patientRecordId: input.patientId, canonicalSubjectId: source.storedSubjectId, reviewOnly: true })
  if (!verified || verified.airtableRecordId !== source.airtableRecordId || verified.storedSubjectId !== source.storedSubjectId
    || verified.record.override !== before.override || verified.record.overrideReason !== before.overrideReason
    || verified.record.paidThrough !== before.paidThrough || verified.record.squareSubscriptionId !== before.squareSubscriptionId || verified.record.accessExpires !== before.accessExpires) throw new Error('ACCESS_RENEWAL_VERIFY_FAILED')
  return { state: 'updated', message: review.message, verified: true }
}
