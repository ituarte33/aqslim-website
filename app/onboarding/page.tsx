import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getClienteByEmail } from '@/lib/airtable'
import { OnboardingClient } from './onboarding-client'

export default async function OnboardingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress
  if (!email) redirect('/sign-in')

  const cliente = await getClienteByEmail(email)
  if (!cliente) redirect('/dashboard')

  const profileFilled = cliente.fields['He leído y acepto los términos anteriores'] === true
  const step1Done = cliente.fields['Cita Agendada'] === true

  return (
    <OnboardingClient
      defaultFirstName={user?.firstName ?? ''}
      defaultLastName={user?.lastName ?? ''}
      initialStep={profileFilled ? 'next-steps' : 'profile'}
      step1Done={step1Done}
    />
  )
}
