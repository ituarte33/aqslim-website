import { CLINIC_FOUNDER_EMAIL, isClinicPreviewEnvironment, type ClinicPreviewEnvironment } from './clinic-preview-policy.ts'

export const CLINIC_RELEASE_BRANCH = 'release/clinic-production-candidate-2026-10-24'
export type ClinicRuntimeEnvironment = ClinicPreviewEnvironment & { MYAQ_CLINIC_ENABLED?: string }
export function clinicRuntimeEnvironment(): ClinicRuntimeEnvironment {
  return { VERCEL_ENV: process.env.VERCEL_ENV, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF, MYAQ_CLINIC_ENABLED: process.env.MYAQ_CLINIC_ENABLED }
}
export function clinicRuntimeMode(environment = clinicRuntimeEnvironment()): 'preview' | 'candidate' | 'production' | null {
  if (isClinicPreviewEnvironment(environment)) return 'preview'
  if (environment.VERCEL_ENV === 'preview' && environment.VERCEL_GIT_COMMIT_REF === CLINIC_RELEASE_BRANCH) return 'candidate'
  if (environment.VERCEL_ENV === 'production' && ['main', CLINIC_RELEASE_BRANCH].includes(environment.VERCEL_GIT_COMMIT_REF ?? '')
    && environment.MYAQ_CLINIC_ENABLED === 'enabled') return 'production'
  return null
}
export function isClinicRuntimeEnvironment(environment: ClinicRuntimeEnvironment) { return clinicRuntimeMode(environment) !== null }
export function isClinicRuntimeFounderIdentity({email, environment}: {email: string; environment: ClinicRuntimeEnvironment}) {
  return isClinicRuntimeEnvironment(environment) && email.trim().toLowerCase() === CLINIC_FOUNDER_EMAIL
}
// Keep the runtime and operational readers enabled during incident recovery.
// Changing this server environment variable requires a fresh Vercel deployment.
export function clinicWritesPaused() { return process.env.MYAQ_CLINIC_WRITES_PAUSED === 'true' }
export function assertClinicSourceWriteAllowed() {
  const mode = clinicRuntimeMode()
  if (mode === null) throw new Error('CLINIC_DISABLED')
  if (mode === 'candidate') throw new Error('CLINIC_CANDIDATE_READ_ONLY')
  if (clinicWritesPaused()) throw new Error('CLINIC_WRITES_PAUSED')
}
export function clinicUsesPreviewRecords() { return clinicRuntimeMode() === 'preview' }
export function clinicRecordKey(value: string) { return clinicUsesPreviewRecords() ? value : `live:${value}` }
export function clinicPlanDraftKey(patientId: string) { return clinicUsesPreviewRecords() ? `${patientId}:v1` : `live:${patientId}:v1` }
export function clinicRecordInScope(fields: Record<string, unknown>, patientId: string, ids: {patientId:string; preview:string; key:string}) {
  if (fields[ids.patientId] !== patientId) return false
  return clinicUsesPreviewRecords() ? fields[ids.preview] === true
    : fields[ids.preview] !== true && String(fields[ids.key] ?? '').startsWith(`live:${patientId}:`)
}
export function clinicRecordFilter(patientId: string, keyField: 'Note Key' | 'Consultation Key') {
  if (!/^rec[A-Za-z0-9]{14}$/.test(patientId)) throw new Error('INVALID_PATIENT')
  const scope = clinicUsesPreviewRecords() ? '{Preview Only} = TRUE()'
    : `AND(NOT({Preview Only}), LEFT({${keyField}}, ${`live:${patientId}:`.length}) = "live:${patientId}:")`
  return `AND({Patient Record ID} = "${patientId}", ${scope})`
}
