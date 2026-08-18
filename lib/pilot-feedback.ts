export const FEEDBACK_TOOLS = [
  'My AQSLIM',
  'AQ Buddy',
  'Escáner de alimentos',
  'Asesor de restaurantes',
  'Recetas del refrigerador',
] as const

export const FEEDBACK_CATEGORIES = [
  'Ingredientes incorrectos',
  'Respuesta incorrecta',
  'No respetó fase o restricción',
  'Error técnico',
  'Difícil de usar',
  'Otro',
] as const

export const PILOT_FEEDBACK_STATUSES = ['Nuevo', 'Revisando', 'Resuelto'] as const

export type FeedbackTool = typeof FEEDBACK_TOOLS[number]
export type FeedbackCategory = typeof FEEDBACK_CATEGORIES[number]
export type FeedbackRating = 'Funcionó' | 'Problema'
export type PilotFeedbackStatus = typeof PILOT_FEEDBACK_STATUSES[number]

export type PilotFeedbackInput = {
  tool: FeedbackTool
  rating: FeedbackRating
  category: FeedbackCategory | null
  comment: string
  context: string
  responseId: string
  language: 'ES' | 'EN'
}

function includesValue<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value as T[number])
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string'
    ? value.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, maxLength)
    : ''
}

export function parsePilotFeedbackInput(value: unknown): PilotFeedbackInput | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  if (!includesValue(FEEDBACK_TOOLS, input.tool)) return null
  if (input.rating !== 'Funcionó' && input.rating !== 'Problema') return null
  const category = includesValue(FEEDBACK_CATEGORIES, input.category) ? input.category : null
  if (input.rating === 'Problema' && !category) return null
  if (input.language !== 'ES' && input.language !== 'EN') return null

  const responseId = cleanText(input.responseId, 100)
  if (!responseId || !/^[A-Za-z0-9_-]{6,100}$/.test(responseId)) return null

  return {
    tool: input.tool,
    rating: input.rating,
    category,
    comment: cleanText(input.comment, 1200),
    context: cleanText(input.context, 9000),
    responseId,
    language: input.language,
  }
}

export function feedbackReportName(input: PilotFeedbackInput, now = new Date()): string {
  const stamp = now.toISOString().replace('T', ' ').slice(0, 16)
  return `${input.rating} · ${input.tool} · ${stamp}`.slice(0, 100)
}

export function isPilotFeedbackStatus(value: unknown): value is PilotFeedbackStatus {
  return typeof value === 'string'
    && PILOT_FEEDBACK_STATUSES.includes(value as PilotFeedbackStatus)
}
