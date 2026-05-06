import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getClienteByEmail } from '@/lib/airtable'
import { CuestionarioClient } from './cuestionario-client'

export default async function CuestionarioPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress
  if (!email) redirect('/sign-in')

  const cliente = await getClienteByEmail(email)
  if (!cliente) redirect('/onboarding')

  return (
    <CuestionarioClient
      clienteId={cliente.id}
      nombreCliente={cliente.fields['Nombre Completo'] ?? ''}
    />
  )
}
