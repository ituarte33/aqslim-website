import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { getClientesConCita } from '@/lib/airtable'
import { AppointmentsClient } from './appointments-client'

export default async function AppointmentsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getRole()
  if (role !== 'admin') redirect('/dashboard')

  const user = await currentUser()
  const upcomingCitas = await getClientesConCita().catch(() => [])

  return (
    <AppointmentsClient
      user={user ? { firstName: user.firstName, lastName: user.lastName } : null}
      upcomingCitas={upcomingCitas}
    />
  )
}
