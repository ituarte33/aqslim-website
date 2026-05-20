import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { getConsultaById, getClienteById, getSupplementos, type Consulta, type Cliente, type Suplemento } from '@/lib/airtable'
import { ConsultaEditClient } from './consulta-edit-client'

export default async function ConsultaEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getRole()
  if (role !== 'admin') redirect('/dashboard')

  const { id } = await params

  let consulta: Consulta | null = null
  let patient: Cliente | null = null
  let supplementos: Suplemento[] = []
  let error: string | null = null

  try {
    consulta = await getConsultaById(id)
    const rawId = consulta.fields['ID Cliente']
    const clienteRecordId = Array.isArray(rawId) ? rawId[0] : typeof rawId === 'string' ? rawId : null
    const [patientResult, suppsResult] = await Promise.allSettled([
      clienteRecordId ? getClienteById(clienteRecordId) : Promise.resolve(null),
      getSupplementos(),
    ])
    if (patientResult.status === 'fulfilled') patient = patientResult.value
    if (suppsResult.status === 'fulfilled') supplementos = suppsResult.value
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  return <ConsultaEditClient consulta={consulta} patient={patient} supplementos={supplementos} error={error} />
}
