import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getClientes } from '@/lib/airtable'
import { getRole } from '@/lib/auth'
import { PatientsPageClient } from './patients-client'

export default async function PatientsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getRole()
  if (role !== 'admin') redirect('/dashboard')

  const user = await currentUser()
  let patients: Awaited<ReturnType<typeof getClientes>> = []
  let airtableError: string | null = null
  try {
    patients = await getClientes()
  } catch (e) {
    airtableError = e instanceof Error ? e.message : String(e)
  }

  return (
    <PatientsPageClient
      user={user ? { firstName: user.firstName, lastName: user.lastName } : null}
      patients={patients}
      airtableError={airtableError}
    />
  )
}
