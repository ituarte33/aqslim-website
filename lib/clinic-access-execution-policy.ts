import { CLINIC_FOUNDER_EMAIL, CLINIC_PREVIEW_BRANCH } from './clinic-preview-policy.ts'
import { SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID } from './nutrition/synthetic-preview-policy.ts'
import type { PilotRole } from './pilot-policy.ts'

export const CLINIC_ACCESS_EXECUTION_FLAG = 'MYAQ_CLINIC_ACCESS_EXECUTION' as const
export const CLINIC_ACCESS_PILOT_PATIENT_IDS_FLAG = 'MYAQ_CLINIC_PILOT_PATIENT_IDS' as const
export const CLINIC_ACCESS_EXECUTION_CONFIRMATION = 'ACTIVATE_PREVIEW_PILOT' as const
export const CLINIC_ACCESS_ACKNOWLEDGEMENTS = [
  'patient_identity',
  'preview_scope',
  'no_external_effects',
] as const

export type ClinicAccessAcknowledgementKey = typeof CLINIC_ACCESS_ACKNOWLEDGEMENTS[number]
export type ClinicAccessExecutionOperation = 'activate_internal_pilot' | 'migrate_p5_canary' | 'migrate_clinic_trial'

const AIRTABLE_RECORD_ID = /^rec[A-Za-z0-9]{14}$/

export function clinicPilotPatientIds(value: string | undefined): ReadonlySet<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map(patientId => patientId.trim())
      .filter(patientId => AIRTABLE_RECORD_ID.test(patientId)),
  )
}

export function isClinicPilotPatientAllowlisted(value: string | undefined, patientId: string): boolean {
  return AIRTABLE_RECORD_ID.test(patientId) && clinicPilotPatientIds(value).has(patientId)
}

export function clinicAccessPilotRoleForOperation(operation: ClinicAccessExecutionOperation): PilotRole {
  return operation === 'migrate_p5_canary' ? 'founder' : 'participant'
}

export function hasExactClinicAccessAcknowledgements(value: unknown): value is ClinicAccessAcknowledgementKey[] {
  if (!Array.isArray(value) || value.length !== CLINIC_ACCESS_ACKNOWLEDGEMENTS.length) return false
  const supplied = new Set(value)
  return CLINIC_ACCESS_ACKNOWLEDGEMENTS.every(key => supplied.has(key))
}

export function isClinicAccessExecutionEnabled(environment: {
  VERCEL_ENV?: string
  VERCEL_GIT_COMMIT_REF?: string
  AIRTABLE_BASE_ID?: string
  AIRTABLE_PAT?: string
  MYAQ_CLINIC_ACCESS_EXECUTION?: string
}): boolean {
  return environment.VERCEL_ENV === 'preview'
    && environment.VERCEL_GIT_COMMIT_REF === CLINIC_PREVIEW_BRANCH
    && environment.AIRTABLE_BASE_ID === SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID
    && Boolean(environment.AIRTABLE_PAT)
    && environment.MYAQ_CLINIC_ACCESS_EXECUTION?.trim().toLowerCase() === 'enabled'
}

export function clinicAccessOperationIsExact({
  actorEmail,
  actorUserId,
  patientId,
  patientEmail,
  accountUserId,
  allowlistedPatientIds,
  expectedFingerprint,
  suppliedFingerprint,
  authorizationState,
  acknowledgements,
}: {
  actorEmail: string
  actorUserId: string
  patientId: string
  patientEmail: string
  accountUserId: string | null
  allowlistedPatientIds: string | undefined
  expectedFingerprint: string | null
  suppliedFingerprint: unknown
  authorizationState: string
  acknowledgements: unknown
}): boolean {
  const founderSelfActivation = patientEmail.trim().toLowerCase() === CLINIC_FOUNDER_EMAIL
    && accountUserId === actorUserId
  const explicitlyAllowlistedPatient = isClinicPilotPatientAllowlisted(allowlistedPatientIds, patientId)

  return actorEmail.trim().toLowerCase() === CLINIC_FOUNDER_EMAIL
    && Boolean(patientEmail.trim())
    && Boolean(actorUserId)
    && Boolean(accountUserId)
    && (founderSelfActivation || explicitlyAllowlistedPatient)
    && authorizationState === 'ready'
    && typeof suppliedFingerprint === 'string'
    && Boolean(expectedFingerprint)
    && suppliedFingerprint === expectedFingerprint
    && hasExactClinicAccessAcknowledgements(acknowledgements)
}

export function hasExplicitClinicAccessExecutionConfirmation(value: unknown): boolean {
  return value === CLINIC_ACCESS_EXECUTION_CONFIRMATION
}
