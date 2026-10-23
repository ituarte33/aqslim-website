import { isClinicPreviewEnvironment } from '@/lib/clinic-preview-policy'
import { redirect } from 'next/navigation'
import { getPatientPortalData } from '@/lib/patient-portal'
import { PlanView } from './plan-view'

export default async function PlanPage() {
  const data = await getPatientPortalData()
  if (!data) redirect('/onboarding')

  return <PlanView data={data} calendarDates={isClinicPreviewEnvironment({ VERCEL_ENV: process.env.VERCEL_ENV, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF })} />
}
