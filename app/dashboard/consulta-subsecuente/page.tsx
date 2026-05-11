import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { getClienteById, getClientes, type Cliente } from '@/lib/airtable'
import { ConsultaSubsecuenteClient } from './consulta-subsecuente-client'

export default async function ConsultaSubsecuentePage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getRole()
  if (role !== 'admin') redirect('/dashboard')

  const user = await currentUser()
  const { clienteId } = await searchParams

  let patient: Cliente | null = null
  let allPatients: Cliente[] = []

  if (clienteId) {
    try { patient = await getClienteById(clienteId) } catch {}
  } else {
    try { allPatients = await getClientes() } catch {}
  }

  return (
    <ConsultaSubsecuenteClient
      user={user ? { firstName: user.firstName, lastName: user.lastName } : null}
      patient={patient}
      allPatients={allPatients}
    />
  )
}
