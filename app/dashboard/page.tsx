import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getClientes, getConsultasByCliente, createProspecto, getClientesConCita, getConsultasRevenueSummary } from '@/lib/airtable'
import { AuthorizationError, getOwnPatient, requireActor, requireCapability } from '@/lib/auth'
import { getMonthlyRevenue, getTodaysBookingCount } from '@/lib/square'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const actor = await requireActor()
  const role = actor.role

  if (role === 'patient') {
    const email = actor.email
    let cliente
    try {
      cliente = await getOwnPatient()
    } catch (error) {
      if (!(error instanceof AuthorizationError) || error.code !== 'PATIENT_NOT_FOUND') throw error
      cliente = null
    }

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

    redirect('/my-aqslim')
  }

  // Admin path
  await requireCapability('patients:read:any')
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
