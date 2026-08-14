import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getClientesPage } from '@/lib/airtable'
import { requireActor } from '@/lib/auth'
import { PatientsPageClient } from './patients-client'

export default async function PatientsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const actor = await requireActor()
  if (actor.role !== 'admin') redirect('/dashboard')

  const userPromise = currentUser()
  let firstPage: Awaited<ReturnType<typeof getClientesPage>> = { records: [], offset: null }
  let airtableError: string | null = null
  try {
    firstPage = await getClientesPage({ pageSize: 50 })
  } catch (e) {
    airtableError = e instanceof Error ? e.message : String(e)
  }
  const user = await userPromise

  return (
    <PatientsPageClient
      user={user ? { firstName: user.firstName, lastName: user.lastName } : null}
      initialPatients={firstPage.records}
      initialOffset={firstPage.offset}
      airtableError={airtableError}
    />
  )
}
