'use server'

import { createCuestionario, CUESTIONARIO_FIELDS } from '@/lib/airtable'
import { requireOwnPatient } from '@/lib/auth'

const NON_RATING_FIELDS = new Set<string>([
  CUESTIONARIO_FIELDS.ID_CLIENTE,
  CUESTIONARIO_FIELDS.NOMBRE,
  CUESTIONARIO_FIELDS.FECHA,
  CUESTIONARIO_FIELDS.OBSERVACIONES,
])
const RATING_FIELDS = new Set<string>(
  Object.values(CUESTIONARIO_FIELDS).filter(field => !NON_RATING_FIELDS.has(field)),
)

export async function saveCuestionario(
  _clienteId: string,
  _nombreCliente: string,
  ratings: Record<string, number>,
  observaciones: string,
) {
  const cliente = await requireOwnPatient('questionnaire:write:self')
  const nombreCliente = cliente.fields['Nombre Completo'] ?? ''
  const safeRatings = Object.fromEntries(
    Object.entries(ratings).filter(([field, value]) => (
      RATING_FIELDS.has(field) && Number.isInteger(value) && value >= 0 && value <= 3
    )),
  )

  const today = new Date().toISOString().split('T')[0]

  await createCuestionario({
    ...safeRatings,
    [CUESTIONARIO_FIELDS.ID_CLIENTE]: [cliente.id],
    [CUESTIONARIO_FIELDS.NOMBRE]: nombreCliente,
    [CUESTIONARIO_FIELDS.FECHA]: today,
    ...(observaciones.trim()
      ? { [CUESTIONARIO_FIELDS.OBSERVACIONES]: observaciones.trim().slice(0, 2_000) }
      : {}),
  })
}
