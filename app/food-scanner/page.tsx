import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ScannerClient } from './scanner-client'

export const metadata = {
  title: 'Food Scanner — AQSLIM',
  description: 'Scan your meals and track macros instantly',
}

export default async function FoodScannerPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const plan      = (user?.publicMetadata?.plan as string | undefined) ?? 'free'
  const firstName = user?.firstName ?? ''

  return <ScannerClient plan={plan} userName={firstName} />
}
