export const CLINIC_CONSULTATION_PUBLICATION_CONFIRMATION = 'PUBLICAR CONSULTA'
export const LIVE_CLINIC_CONSULTATION_TYPES = [
  'Cliente Nuevo',
  'Cliente subsecuente',
  'Cliente Re-Inicio',
] as const

export function isLiveClinicConsultationType(value: unknown): value is typeof LIVE_CLINIC_CONSULTATION_TYPES[number] {
  return typeof value === 'string'
    && (LIVE_CLINIC_CONSULTATION_TYPES as readonly string[]).includes(value)
}

const POUNDS_PER_KILOGRAM = 2.2046226218
const PUBLICATION_MARKER_PREFIX = 'CLINIC-PREVIEW:'
const PUBLISHED_KEY_SEPARATOR = ':published:'

export function clinicConsultationPublicationMarker(previewRecordId: string) {
  return `${PUBLICATION_MARKER_PREFIX}${previewRecordId}`
}

export function clinicConsultationPublicationIsConfirmed(value: unknown) {
  return value === CLINIC_CONSULTATION_PUBLICATION_CONFIRMATION
}

export function clinicConsultationWeightKg(weight: unknown, unit: unknown) {
  if (weight === '' || weight == null) return null
  const numeric = typeof weight === 'number' ? weight : Number(weight)
  if (!Number.isFinite(numeric) || numeric <= 0) return null
  const kilograms = unit === 'lb' ? numeric / POUNDS_PER_KILOGRAM : numeric
  return Math.round(kilograms * 100) / 100
}

export function clinicPublishedPreviewKey(currentKey: unknown, liveConsultationId: string) {
  const base = typeof currentKey === 'string' && currentKey.trim()
    ? currentKey.split(PUBLISHED_KEY_SEPARATOR)[0]
    : 'clinic-preview'
  return `${base}${PUBLISHED_KEY_SEPARATOR}${liveConsultationId}`
}

export function clinicPublishedConsultationId(previewKey: unknown) {
  if (typeof previewKey !== 'string') return null
  const value = previewKey.split(PUBLISHED_KEY_SEPARATOR)[1]?.trim() ?? ''
  return /^rec[A-Za-z0-9]{14}$/.test(value) ? value : null
}

export function clinicConsultationPublicationNote(input: {
  previewRecordId: string
  phase?: unknown
  phaseWeek?: unknown
  consultationFee?: unknown
  amountCollected?: unknown
}) {
  const lines = [`Origen verificado: ${clinicConsultationPublicationMarker(input.previewRecordId)}`]
  const phase = typeof input.phase === 'string' ? input.phase.trim() : ''
  const phaseWeek = input.phaseWeek === '' || input.phaseWeek == null ? null : Number(input.phaseWeek)
  if (phase && phase !== 'Sin fase') {
    lines.push(`Plan al momento de la consulta: ${phase}${Number.isFinite(phaseWeek) ? ` · semana ${phaseWeek}` : ''}`)
  }
  const fee = input.consultationFee === '' || input.consultationFee == null ? null : Number(input.consultationFee)
  const collected = input.amountCollected === '' || input.amountCollected == null ? null : Number(input.amountCollected)
  if (Number.isFinite(fee) && Number.isFinite(collected) && fee !== collected) {
    lines.push(`Cargo registrado: $${fee!.toFixed(2)} · monto cobrado: $${collected!.toFixed(2)}`)
  }
  return lines.join('\n')
}

function publicationNumber(value: unknown) {
  if (value === '' || value == null) return null
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function publicationText(value: unknown, max = 5000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function buildClinicLiveConsultationFields(input: {
  patientId: string
  previewRecordId: string
  consultationDate: string
  consultationType: string
  weight?: unknown
  weightUnit?: unknown
  bodyFat?: unknown
  waistCm?: unknown
  hipsCm?: unknown
  armsCm?: unknown
  thighsCm?: unknown
  chestCm?: unknown
  phase?: unknown
  phaseWeek?: unknown
  recommendations?: unknown
  consultationFee?: unknown
  amountCollected?: unknown
  paymentMethod?: unknown
}) {
  const weightKg = clinicConsultationWeightKg(input.weight, input.weightUnit)
  const amountCollected = publicationNumber(input.amountCollected)
  const fields: Record<string, unknown> = {
    'ID Cliente': [input.patientId],
    'Fecha Consulta': input.consultationDate,
    'Tipo de Consulta': input.consultationType,
    'Notas del Terapeuta': clinicConsultationPublicationNote(input),
  }
  const numericFields: Array<[string, unknown]> = [
    ['% Grasa Corporal', input.bodyFat],
    ['Cintura (cm)', input.waistCm],
    ['Cadera (cm)', input.hipsCm],
    ['Brazos (cm)', input.armsCm],
    ['Muslos (cm)', input.thighsCm],
    ['Pecho/Busto (cm)', input.chestCm],
  ]
  if (weightKg !== null) fields['Peso (kg)'] = weightKg
  for (const [field, value] of numericFields) {
    const numeric = publicationNumber(value)
    if (numeric !== null) fields[field] = numeric
  }
  const recommendations = publicationText(input.recommendations)
  if (recommendations) fields['Recomendaciones al Cliente'] = recommendations
  const paymentMethod = publicationText(input.paymentMethod, 100)
  if (paymentMethod && paymentMethod !== 'Sin especificar') fields['Método de Pago'] = paymentMethod
  if (amountCollected !== null) {
    fields['Monto Cobrado ($)'] = amountCollected
    fields['Consulta Cobrado ($)'] = amountCollected
  }
  return { fields, weightKg, amountCollected }
}
