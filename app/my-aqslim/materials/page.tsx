import { redirect } from 'next/navigation'
import { getPatientPortalData } from '@/lib/patient-portal'
import { MaterialsView } from './materials-view'

export default async function MaterialsPage() {
  const data = await getPatientPortalData()
  if (!data) redirect('/onboarding')

  return <MaterialsView data={data} />
}
