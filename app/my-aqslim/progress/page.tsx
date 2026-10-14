import { redirect } from 'next/navigation'
import { getPatientPortalData } from '@/lib/patient-portal'
import { ProgressView } from './progress-view'

export default async function ProgressPage() {
  const data = await getPatientPortalData()
  if (!data) redirect('/my-aqslim/no-record')

  return <ProgressView data={data} />
}
