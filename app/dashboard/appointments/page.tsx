import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { getUpcomingBookings } from '@/lib/square'
import { getClienteByEmail } from '@/lib/airtable'
import { AppointmentsClient } from './appointments-client'

export default async function AppointmentsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getRole()
  if (role !== 'admin') redirect('/dashboard')

  const user = await currentUser()

  let bookings: Awaited<ReturnType<typeof getUpcomingBookings>> = []
  let squareError: string | null = null
  try {
    bookings = await getUpcomingBookings()
  } catch (e) {
    squareError = e instanceof Error ? e.message : String(e)
  }

  // Resolve Airtable record IDs by customer email so rows link to the expediente
  const airtableHrefs: Record<string, string> = {}
  await Promise.all(
    bookings
      .filter(b => b.customer_email)
      .map(async b => {
        const cliente = await getClienteByEmail(b.customer_email!).catch(() => null)
        if (cliente) airtableHrefs[b.id] = `/dashboard/${cliente.id}`
      })
  )

  return (
    <AppointmentsClient
      user={user ? { firstName: user.firstName, lastName: user.lastName } : null}
      bookings={bookings}
      airtableHrefs={airtableHrefs}
      squareError={squareError}
    />
  )
}
