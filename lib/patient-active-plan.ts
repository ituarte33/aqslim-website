import 'server-only'
import { getPlanById } from './airtable'
import { isClinicPreviewEnvironment } from './clinic-preview-policy'
import { activePlanIncludesFast36 } from './clinic-plan-materials'

// Called with the patient already resolved by server-side authentication.
export async function patientActivePlanAllowsFast36(patient: { fields: { 'Plan AQSLIM'?: string[] } }) {
  if (!isClinicPreviewEnvironment({ VERCEL_ENV: process.env.VERCEL_ENV, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF })) return true
  const id = patient.fields['Plan AQSLIM']?.[0]
  const plan = id ? await getPlanById(id) : null
  return activePlanIncludesFast36(plan)
}
