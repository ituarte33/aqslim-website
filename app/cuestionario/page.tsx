import { redirect } from 'next/navigation'
import { hasCuestionario } from '@/lib/airtable'
import { requireOwnPatient } from '@/lib/auth'
import { CuestionarioClient } from './cuestionario-client'

export default async function CuestionarioPage() {
  const cliente = await requireOwnPatient('questionnaire:write:self')

  const alreadySubmitted = await hasCuestionario(cliente.fields['Nombre Completo'] ?? '')
  if (alreadySubmitted) redirect('/onboarding')

  return (
    <CuestionarioClient
      clienteId={cliente.id}
      nombreCliente={cliente.fields['Nombre Completo'] ?? ''}
    />
  )
}
