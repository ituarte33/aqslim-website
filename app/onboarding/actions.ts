'use server'

import { currentUser } from '@clerk/nextjs/server'
import { getClienteByEmail, updateCliente } from '@/lib/airtable'

export async function saveProfile(formData: FormData) {
  const user = await currentUser()
  if (!user) throw new Error('Not authenticated')

  const email = user.emailAddresses[0]?.emailAddress
  if (!email) throw new Error('No email')

  const nombre = (formData.get('nombre') as string).trim()
  const telefono = (formData.get('telefono') as string).trim()

  const cliente = await getClienteByEmail(email)
  if (!cliente) throw new Error('Registro no encontrado')

  await updateCliente(cliente.id, {
    'Nombre Completo': nombre,
    'Teléfono': telefono,
  })
}
