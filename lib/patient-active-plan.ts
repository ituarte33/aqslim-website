import 'server-only'
import { getPlanById } from './airtable'
import { isClinicRuntimeEnvironment } from './clinic-runtime-policy'
import { activePlanIncludesFast36 } from './clinic-plan-materials'

// Called with the patient already resolved by server-side authentication.
export async function patientActivePlanAllowsFast36(patient: { fields: { 'Plan AQSLIM'?: string[] } }) {
  if (!isClinicRuntimeEnvironment({ VERCEL_ENV: process.env.VERCEL_ENV, MYAQ_CLINIC_ENABLED: process.env.MYAQ_CLINIC_ENABLED, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF })) return true
  const id = patient.fields['Plan AQSLIM']?.[0]
  const plan = id ? await getPlanById(id) : null
  return activePlanIncludesFast36(plan)
}
