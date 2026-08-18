import { redirect } from 'next/navigation'
import { getPatientPortalData } from '@/lib/patient-portal'
import { getPilotAccess } from '@/lib/pilot-access'
import { WelcomeView } from './welcome-view'

export default async function MyAqslimWelcomePage() {
  const [data, pilot] = await Promise.all([
    getPatientPortalData(),
    getPilotAccess(),
  ])
  if (pilot) {
    return (
      <WelcomeView
        firstName={data?.firstName ?? pilot.firstName}
        initialLanguage={data?.language ?? pilot.language}
        destination="/my-aqslim/pilot"
      />
    )
  }
  if (!data) redirect('/onboarding')

  return <WelcomeView firstName={data.firstName} initialLanguage={data.language} />
}
