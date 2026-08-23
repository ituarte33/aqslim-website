import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ScannerClient } from './scanner-client'
import { effectiveFoodScanPlan } from '@/lib/food-scan-policy'
import { getPilotAccess } from '@/lib/pilot-access'

export const metadata = {
  title: 'AQ Buddy Meal Log — AQSLIM',
  description: 'Log a meal with or without a photo and estimate nutrition for the portion you plan to eat',
}

export default async function FoodScannerPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const privateMetadata = user?.privateMetadata
  const pilot = await getPilotAccess()
  const plan = effectiveFoodScanPlan(
    privateMetadata?.plan,
    pilot !== null,
  )
  const firstName = user?.firstName ?? ''

  return <ScannerClient plan={plan} userName={firstName} />
}
