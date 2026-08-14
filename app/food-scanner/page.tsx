import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ScannerClient } from './scanner-client'
import { normalizeFoodScanPlan } from '@/lib/food-scan-policy'

export const metadata = {
  title: 'AQ Buddy Food Scanner — AQSLIM',
  description: 'Get an approximate nutrition estimate from a meal photo with AQ Buddy',
}

export default async function FoodScannerPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const plan      = normalizeFoodScanPlan(user?.privateMetadata?.plan)
  const firstName = user?.firstName ?? ''

  return <ScannerClient plan={plan} userName={firstName} />
}
