import { redirect } from 'next/navigation'
import { getPatientPortalData } from '@/lib/patient-portal'
import { NutritionProfilePreviewForm } from './nutrition-profile-form'

export default async function NutritionProfilePreviewPage() {
  const data = await getPatientPortalData()
  if (!data) redirect('/onboarding')

  return (
    <NutritionProfilePreviewForm
      firstName={data.firstName}
      fullName={data.fullName}
      profileId={data.clienteId}
      initialLanguage={data.language}
    />
  )
}
