import { redirect } from 'next/navigation'
import { getPilotAccess } from '@/lib/pilot-access'
import { pilotHasFeature } from '@/lib/pilot-policy'
import { getPatientPortalData } from '@/lib/patient-portal'
import { RestaurantAdvisor } from './restaurant-advisor'
import { hasActiveAccountScanOverride } from '@/lib/scan-account-access'

export const metadata = {
  title: '¿Qué puedo comer aquí? — My AQSLIM',
  description: 'Orientación de AQ Buddy a partir del menú de un restaurante',
}

export default async function RestaurantAdvisorPage() {
  const [pilot, accountAccess] = await Promise.all([getPilotAccess(), hasActiveAccountScanOverride()])
  if ((!pilot || !pilotHasFeature(pilot, 'restaurant_advisor')) && !accountAccess) redirect('/my-aqslim/pilot')

  const patient = await getPatientPortalData()
  if (!patient) redirect('/my-aqslim/no-record')

  return <RestaurantAdvisor phase={patient.phase || 'Por confirmar'} language={pilot?.language ?? patient.language} />
}
