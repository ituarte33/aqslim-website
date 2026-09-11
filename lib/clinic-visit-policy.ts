export type ConsultationVisitLike = {
  fields: {
    'Fecha Consulta'?: string
    'Tipo de Consulta'?: string
  }
}

export const QUALIFYING_CLINIC_VISIT_TYPES = new Set([
  'Cliente Nuevo',
  'Cliente subsecuente',
  'Cliente Re-Inicio',
])

export function isQualifyingClinicVisitType(value: unknown): boolean {
  return typeof value === 'string' && QUALIFYING_CLINIC_VISIT_TYPES.has(value.trim())
}

function normalizedVisitDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) return null
  const candidate = `${match[1]}-${match[2]}-${match[3]}`
  return Number.isFinite(Date.parse(`${candidate}T00:00:00Z`)) ? candidate : null
}

export function lastCompletedVisitFromConsultations(
  consultations: readonly ConsultationVisitLike[],
): string | null {
  const dates = consultations
    .filter(consultation => isQualifyingClinicVisitType(consultation.fields['Tipo de Consulta']))
    .map(consultation => normalizedVisitDate(consultation.fields['Fecha Consulta']))
    .filter((value): value is string => Boolean(value))
    .sort()

  return dates.at(-1) ?? null
}
