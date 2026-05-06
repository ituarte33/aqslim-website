import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { OnboardingClient } from './onboarding-client'

export default async function OnboardingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()

  return (
    <OnboardingClient
      defaultFirstName={user?.firstName ?? ''}
      defaultLastName={user?.lastName ?? ''}
    />
  )
}
