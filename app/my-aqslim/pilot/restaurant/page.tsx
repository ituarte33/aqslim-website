import { redirect } from 'next/navigation'
import { getPilotAccess } from '@/lib/pilot-access'
import { pilotHasFeature } from '@/lib/pilot-policy'
import { getPatientPortalData } from '@/lib/patient-portal'
import { RestaurantAdvisor } from './restaurant-advisor'

export const metadata = {
  title: '¿Qué puedo comer aquí? — My AQSLIM',
  description: 'Orientación de AQ Buddy a partir del menú de un restaurante',
}

export default async function RestaurantAdvisorPage() {
  const pilot = await getPilotAccess()
  if (!pilot || !pilotHasFeature(pilot, 'restaurant_advisor')) redirect('/my-aqslim/pilot')

  const patient = await getPatientPortalData()
  if (!patient) redirect('/onboarding')

  return <RestaurantAdvisor phase={patient.phase || 'Por confirmar'} language={pilot.language} />
}
