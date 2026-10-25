import { isClinicRuntimeEnvironment } from '@/lib/clinic-runtime-policy'
import { redirect } from 'next/navigation'
import { getPatientPortalData } from '@/lib/patient-portal'
import { PlanView } from './plan-view'

export default async function PlanPage() {
  const data = await getPatientPortalData()
  if (!data) redirect('/my-aqslim/no-record')

  return <PlanView data={data} calendarDates={isClinicRuntimeEnvironment({ VERCEL_ENV: process.env.VERCEL_ENV, MYAQ_CLINIC_ENABLED: process.env.MYAQ_CLINIC_ENABLED, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF })} />
}
