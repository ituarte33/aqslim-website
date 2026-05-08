import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getClientes, getClienteByEmail, getConsultasByCliente, createProspecto } from '@/lib/airtable'
import { getRole, getUserEmail } from '@/lib/auth'
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
  let airtableError: string | null = null
  try {
    patients = await getClientes()
  } catch (e) {
    airtableError = e instanceof Error ? e.message : String(e)
  }

  return (
    <DashboardClient
      user={user ? { firstName: user.firstName, lastName: user.lastName } : null}
      patients={patients}
      airtableError={airtableError}
    />
  )
}
