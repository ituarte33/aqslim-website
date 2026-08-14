import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { demoPatientPortalData } from '@/lib/patient-portal-demo'
import { ProgressView } from '../../progress/progress-view'

export default async function MyAqslimDemoProgressPage() {
  if (await getRole() !== 'admin') redirect('/my-aqslim')

  return <ProgressView data={demoPatientPortalData} demo />
}
