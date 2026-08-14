import { redirect } from 'next/navigation'
import { getPatientPortalData } from '@/lib/patient-portal'
import { WelcomeView } from './welcome-view'

export default async function MyAqslimWelcomePage() {
  const data = await getPatientPortalData()
  if (!data) redirect('/onboarding')

  return <WelcomeView firstName={data.firstName} initialLanguage={data.language} />
}
