'use server'

import { currentUser } from '@clerk/nextjs/server'
import { createCuestionario, CUESTIONARIO_FIELDS } from '@/lib/airtable'

export async function saveCuestionario(
  clienteId: string,
  nombreCliente: string,
  ratings: Record<string, number>,
  observaciones: string,
) {
  const user = await currentUser()
  if (!user) throw new Error('Not authenticated')

  const today = new Date().toISOString().split('T')[0]

  await createCuestionario({
    [CUESTIONARIO_FIELDS.ID_CLIENTE]: [clienteId],
    [CUESTIONARIO_FIELDS.NOMBRE]:     nombreCliente,
    [CUESTIONARIO_FIELDS.FECHA]:      today,
    ...ratings,
    ...(observaciones.trim() ? { [CUESTIONARIO_FIELDS.OBSERVACIONES]: observaciones.trim() } : {}),
  })
}
