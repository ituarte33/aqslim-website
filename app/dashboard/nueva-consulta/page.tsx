import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { NuevaConsultaClient } from './nueva-consulta-client'

export default async function NuevaConsultaPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getRole()
  if (role !== 'admin') redirect('/dashboard')

  const user = await currentUser()

  return (
    <NuevaConsultaClient
      user={user ? { firstName: user.firstName, lastName: user.lastName } : null}
    />
  )
}
