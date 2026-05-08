import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { ConsultaSubsecuenteClient } from './consulta-subsecuente-client'

export default async function ConsultaSubsecuentePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getRole()
  if (role !== 'admin') redirect('/dashboard')

  const user = await currentUser()

  return (
    <ConsultaSubsecuenteClient
      user={user ? { firstName: user.firstName, lastName: user.lastName } : null}
    />
  )
}
