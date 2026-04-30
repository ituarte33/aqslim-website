import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getClientes, getClienteByEmail, createProspecto } from '@/lib/airtable'
import { getRole, getUserEmail } from '@/lib/auth'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getRole()

  if (role === 'patient') {
    const email = await getUserEmail()
    if (!email) redirect('/sign-in')

    let cliente = await getClienteByEmail(email)

    if (!cliente) {
      // First login — create a Prospecto record in Airtable
      const user = await currentUser()
      const nombre = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || email
      cliente = await createProspecto({ 'Nombre Completo': nombre, 'Email': email })
    }

    const estado = cliente.fields['Estado del Cliente'] as string | undefined
    if (estado === 'Prospecto') redirect('/onboarding')

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
