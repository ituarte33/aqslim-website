import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { demoPatientPortalData } from '@/lib/patient-portal-demo'
import { PlanView } from '../../plan/plan-view'

export default async function DemoPlanPage() {
  if (await getRole() !== 'admin') redirect('/my-aqslim')

  return <PlanView data={demoPatientPortalData} demo />
}
