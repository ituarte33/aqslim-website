import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { getClienteById, getClientes, getSupplementos, type Cliente, type Suplemento } from '@/lib/airtable'
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
  let supplementos: Suplemento[] = []

  const [patientsResult, supplementosResult] = await Promise.allSettled([
    clienteId ? getClienteById(clienteId) : getClientes(),
    getSupplementos(),
  ])

  if (patientsResult.status === 'fulfilled') {
    if (clienteId) { patient = patientsResult.value as Cliente }
    else { allPatients = patientsResult.value as Cliente[] }
  }
  if (supplementosResult.status === 'fulfilled') {
    supplementos = supplementosResult.value as Suplemento[]
  }

  return (
    <ConsultaSubsecuenteClient
      user={user ? { firstName: user.firstName, lastName: user.lastName } : null}
      patient={patient}
      allPatients={allPatients}
      supplementos={supplementos}
    />
  )
}
