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
  const loadError = clientsResult.status === 'rejected' || productsResult.status === 'rejected'
    ? 'No se pudieron cargar los clientes o suplementos. Recarga la página antes de guardar una venta.'
    : undefined
  if (loadError) console.error('[supplement-sales] page_data_unavailable')
  return (
    <SupplementSalesClient
      loadError={loadError}
      user={user ? { firstName: user.firstName, lastName: user.lastName } : null}
      clients={clientsResult.status === 'fulfilled' ? clientsResult.value.map(client => ({ id: client.id, fields: { 'Nombre Completo': client.fields['Nombre Completo'] ?? '', Email: client.fields.Email ?? '' } })) : []}
      products={productsResult.status === 'fulfilled' ? productsResult.value.map(product => ({ id: product.id, fields: { Nombre: product.fields.Nombre ?? 'Suplemento', 'Precio de Venta ($)': product.fields['Precio de Venta ($)'] ?? 0 } })) : []}
    />
  )
}
