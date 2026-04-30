import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { OnboardingClient } from './onboarding-client'

export default async function OnboardingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const nombre = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || ''

  return <OnboardingClient defaultNombre={nombre} />
}
