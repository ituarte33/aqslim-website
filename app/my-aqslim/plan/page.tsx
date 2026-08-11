import { redirect } from 'next/navigation'
import { getPatientPortalData } from '@/lib/patient-portal'
import { PlanView } from './plan-view'

export default async function PlanPage() {
  const data = await getPatientPortalData()
  if (!data) redirect('/onboarding')

  return <PlanView data={data} />
}
