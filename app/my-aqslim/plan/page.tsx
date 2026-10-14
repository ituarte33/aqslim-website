import { redirect } from 'next/navigation'
import { getPatientPortalData } from '@/lib/patient-portal'
import { PlanView } from './plan-view'

export default async function PlanPage() {
  const data = await getPatientPortalData()
  if (!data) redirect('/my-aqslim/no-record')

  return <PlanView data={data} />
}
