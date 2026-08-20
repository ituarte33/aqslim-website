import { redirect } from 'next/navigation'
import { getPatientPortalData } from '@/lib/patient-portal'
import { getPatientPortalMaterials } from '@/lib/patient-materials'
import { MaterialsView } from './materials-view'

export default async function MaterialsPage() {
  const data = await getPatientPortalData()
  if (!data) redirect('/onboarding')
  const materialsData = await getPatientPortalMaterials(data.weekInPhase)

  return <MaterialsView data={data} materialsData={materialsData} />
}
