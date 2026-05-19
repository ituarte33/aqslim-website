import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { getFinancesSummary } from '@/lib/square'
import { getConsultasFinanceData } from '@/lib/airtable'
import { FinancesClient } from './finances-client'

export default async function FinancesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getRole()
  if (role !== 'admin') redirect('/dashboard')

  const user = await currentUser()

  let squareSummary: Awaited<ReturnType<typeof getFinancesSummary>> | null = null
  let records: Awaited<ReturnType<typeof getConsultasFinanceData>> = []
  let squareError: string | null = null
  let airtableError: string | null = null

  await Promise.all([
    getFinancesSummary()
      .then(s => { squareSummary = s })
      .catch(e => { squareError = e instanceof Error ? e.message : String(e) }),
    getConsultasFinanceData()
      .then(r => { records = r })
      .catch(e => { airtableError = e instanceof Error ? e.message : String(e) }),
  ])

  return (
    <FinancesClient
      user={user ? { firstName: user.firstName, lastName: user.lastName } : null}
      records={records}
      squareSummary={squareSummary}
      squareError={squareError}
      airtableError={airtableError}
    />
  )
}
