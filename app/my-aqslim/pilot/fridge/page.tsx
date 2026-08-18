import { redirect } from 'next/navigation'
import { getPilotAccess } from '@/lib/pilot-access'
import { pilotHasFeature } from '@/lib/pilot-policy'
import { getPatientPortalData } from '@/lib/patient-portal'
import { canonicalFridgePhase } from '@/lib/fridge-recipes'
import { FridgeRecipes } from './fridge-recipes'

export const metadata = {
  title: 'Recetas de mi refrigerador — My AQSLIM',
  description: 'Ideas de recetas de AQ Buddy usando los alimentos que ya tienes',
}

export default async function FridgeRecipesPage() {
  const [pilot, patient] = await Promise.all([
    getPilotAccess(),
    getPatientPortalData(),
  ])
  if (!pilot || !pilotHasFeature(pilot, 'fridge_recipes')) redirect('/my-aqslim/pilot')
  if (!patient) redirect('/onboarding')

  return (
    <FridgeRecipes
      language={pilot.language}
      phase={canonicalFridgePhase(patient.phase)}
      patientName={patient.firstName}
    />
  )
}
