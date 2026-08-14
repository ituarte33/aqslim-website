import { redirect } from 'next/navigation'
import { getPatientPortalData } from '@/lib/patient-portal'
import { ProgressView } from './progress-view'

export default async function ProgressPage() {
  const data = await getPatientPortalData()
  if (!data) redirect('/onboarding')

  return <ProgressView data={data} />
}
