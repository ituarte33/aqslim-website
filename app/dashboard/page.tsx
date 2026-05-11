import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getClientes, getClienteByEmail, getConsultasByCliente, createProspecto, getClientesConCita, getConsultasRevenueSummary } from '@/lib/airtable'
import { getRole, getUserEmail } from '@/lib/auth'
import { getMonthlyRevenue, getTodaysBookingCount } from '@/lib/square'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getRole()

  if (role === 'patient') {
    const email = await getUserEmail()
    if (!email) redirect('/sign-in')

    const cliente = await getClienteByEmail(email)

    if (!cliente) {
      // First login — create record and go straight to onboarding
      const user = await currentUser()
      const nombre = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || email
      await createProspecto(nombre, email)
      redirect('/onboarding')
    }

    // Only show dashboard if they have at least one consulta
    const idCliente = cliente.fields['ID Cliente']
    const consultas = idCliente ? await getConsultasByCliente(String(idCliente)) : []
    if (consultas.length === 0) redirect('/onboarding')

    redirect(`/dashboard/${cliente.id}`)
  }

  // Admin path
  const user = await currentUser()
  let patients: Awaited<ReturnType<typeof getClientes>> = []
  let upcomingCitas: Awaited<ReturnType<typeof getClientesConCita>> = []
  let monthlyRevenue: number | null = null
  let todaysBookingCount: number | null = null
  let consultasCash: number | null = null
  let consultasCard: number | null = null
  let airtableError: string | null = null
  try {
    ;[patients, upcomingCitas] = await Promise.all([getClientes(), getClientesConCita()])
  } catch (e) {
    airtableError = e instanceof Error ? e.message : String(e)
  }
  // Non-blocking — Square or Airtable being down should not break the dashboard
  const [_rev, _bookings, _consultas] = await Promise.all([
    getMonthlyRevenue().catch((): null => null),
    getTodaysBookingCount().catch((): null => null),
    getConsultasRevenueSummary().catch((): null => null),
  ])
  monthlyRevenue  = _rev
  todaysBookingCount = _bookings
  consultasCash  = _consultas?.cash ?? null
  consultasCard  = _consultas?.card ?? null

  return (
    <DashboardClient
      user={user ? { firstName: user.firstName, lastName: user.lastName } : null}
      patients={patients}
      upcomingCitas={upcomingCitas}
      monthlyRevenue={monthlyRevenue}
      todaysBookingCount={todaysBookingCount}
      consultasCash={consultasCash}
      consultasCard={consultasCard}
      airtableError={airtableError}
    />
  )
}
