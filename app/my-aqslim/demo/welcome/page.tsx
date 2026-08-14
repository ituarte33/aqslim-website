import { redirect } from 'next/navigation'
import { demoPatientPortalData } from '@/lib/patient-portal-demo'
import { getRole } from '@/lib/auth'
import { WelcomeView } from '../../welcome/welcome-view'

export default async function DemoWelcomePage() {
  if (await getRole() !== 'admin') redirect('/my-aqslim')

  return (
    <WelcomeView
      firstName={demoPatientPortalData.firstName}
      initialLanguage={demoPatientPortalData.language}
      destination="/my-aqslim/demo"
      demo
    />
  )
}
