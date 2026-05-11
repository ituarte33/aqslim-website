import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { getFinancesSummary } from '@/lib/square'
import { FinancesClient } from './finances-client'

export default async function FinancesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getRole()
  if (role !== 'admin') redirect('/dashboard')

  const user = await currentUser()

  let summary: Awaited<ReturnType<typeof getFinancesSummary>> | null = null
  let squareError: string | null = null
  try {
    summary = await getFinancesSummary()
  } catch (e) {
    squareError = e instanceof Error ? e.message : String(e)
  }

  return (
    <FinancesClient
      user={user ? { firstName: user.firstName, lastName: user.lastName } : null}
      summary={summary}
      squareError={squareError}
    />
  )
}
