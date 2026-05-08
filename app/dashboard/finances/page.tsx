import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { FinancesClient } from './finances-client'

export default async function FinancesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const role = await getRole()
  if (role !== 'admin') redirect('/dashboard')

  const user = await currentUser()

  return (
    <FinancesClient
      user={user ? { firstName: user.firstName, lastName: user.lastName } : null}
    />
  )
}
