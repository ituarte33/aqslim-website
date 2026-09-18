import { CLINIC_FOUNDER_EMAIL, CLINIC_PREVIEW_BRANCH } from './clinic-preview-policy.ts'
import { SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID } from './nutrition/synthetic-preview-policy.ts'

export const CLINIC_ACCESS_EXECUTION_FLAG = 'MYAQ_CLINIC_ACCESS_EXECUTION' as const
export const CLINIC_ACCESS_EXECUTION_CONFIRMATION = 'ACTIVATE_ROM_PREVIEW' as const
export const CLINIC_ACCESS_ACKNOWLEDGEMENTS = [
  'patient_identity',
  'preview_scope',
  'no_external_effects',
] as const

export type ClinicAccessAcknowledgementKey = typeof CLINIC_ACCESS_ACKNOWLEDGEMENTS[number]

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
  patientEmail,
  accountUserId,
  expectedFingerprint,
  suppliedFingerprint,
  authorizationState,
  acknowledgements,
}: {
  actorEmail: string
  actorUserId: string
  patientEmail: string
  accountUserId: string | null
  expectedFingerprint: string | null
  suppliedFingerprint: unknown
  authorizationState: string
  acknowledgements: unknown
}): boolean {
  return actorEmail.trim().toLowerCase() === CLINIC_FOUNDER_EMAIL
    && patientEmail.trim().toLowerCase() === CLINIC_FOUNDER_EMAIL
    && Boolean(actorUserId)
    && accountUserId === actorUserId
    && authorizationState === 'ready'
    && typeof suppliedFingerprint === 'string'
    && Boolean(expectedFingerprint)
    && suppliedFingerprint === expectedFingerprint
    && hasExactClinicAccessAcknowledgements(acknowledgements)
}

export function hasExplicitClinicAccessExecutionConfirmation(value: unknown): boolean {
  return value === CLINIC_ACCESS_EXECUTION_CONFIRMATION
}
