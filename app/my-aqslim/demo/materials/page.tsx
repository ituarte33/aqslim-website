import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { demoPatientPortalData } from '@/lib/patient-portal-demo'
import { MaterialsView } from '../../materials/materials-view'

export default async function DemoMaterialsPage() {
  if (await getRole() !== 'admin') redirect('/my-aqslim')

  return <MaterialsView data={demoPatientPortalData} demo />
}
