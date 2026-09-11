export type ConsultationVisitLike = {
  fields: {
    'Fecha Consulta'?: string
  }
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
    .map(consultation => normalizedVisitDate(consultation.fields['Fecha Consulta']))
    .filter((value): value is string => Boolean(value))
    .sort()

  return dates.at(-1) ?? null
}
