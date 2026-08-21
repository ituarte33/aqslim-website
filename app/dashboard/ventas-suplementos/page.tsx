import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { getClientes, getSupplementos } from '@/lib/airtable'
import { SupplementSalesClient } from './supplement-sales-client'

export default async function SupplementSalesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  if (await getRole() !== 'admin') redirect('/dashboard')

  const user = await currentUser()
  const [clientsResult, productsResult] = await Promise.allSettled([getClientes(), getSupplementos()])
  return (
    <SupplementSalesClient
      user={user ? { firstName: user.firstName, lastName: user.lastName } : null}
      clients={clientsResult.status === 'fulfilled' ? clientsResult.value : []}
      products={productsResult.status === 'fulfilled' ? productsResult.value : []}
    />
  )
}
