import { buildAQSLIMPhaseFoodPolicyContext } from '@/lib/aqslim-phase-food-policy'

export type AQBuddyPortalContextInput = {
  firstName?: string | null
  language?: 'es' | 'en' | null
  unit?: 'lb' | 'kg' | null
  planName?: string | null
  calorieTarget?: number | null
  phase?: string | null
  weekInPhase?: number | null
  phaseStartDate?: string | null
  estimatedPhaseChange?: string | null
  nextPhase?: string | null
  specialInstructions?: string | null
  nextReview?: string | null
  currentWeight?: number | null
  goalWeight?: number | null
}

function present(value: unknown): value is string | number {
  return (typeof value === 'string' && value.trim().length > 0)
    || (typeof value === 'number' && Number.isFinite(value))
}

export function buildAQBuddyPortalContext(portal: AQBuddyPortalContextInput | null): string {
  if (!portal) return ''

  const rows: Array<[string, unknown]> = [
    ['First name', portal.firstName],
    ['Preferred language', portal.language],
    ['Weight unit', portal.unit],
    ['Plan', portal.planName],
    ['Calorie target', portal.calorieTarget],
    ['Current phase', portal.phase],
    ['Week in current phase', portal.weekInPhase],
    ['Phase start date', portal.phaseStartDate],
    ['Estimated phase change', portal.estimatedPhaseChange],
    ['Next phase', portal.nextPhase],
    ['Special instructions', portal.specialInstructions],
    ['Next review', portal.nextReview],
    ['Current weight', portal.currentWeight],
    ['Goal weight', portal.goalWeight],
  ]

  const facts = rows
    .filter(([, value]) => present(value))
    .map(([label, value]) => `- ${label}: ${value}`)

  if (facts.length === 0) return ''

  const phaseFoodPolicy = buildAQSLIMPhaseFoodPolicyContext({
    phase: portal.phase ?? null,
    weekInPhase: portal.weekInPhase ?? null,
  })

  return [
    'VERIFIED PATIENT PORTAL CONTEXT — AUTHENTICATED AQSLIM DATA',
    'Use these values as the patient’s current canonical portal facts when answering. Do not infer or invent any field that is not listed. If a value conflicts with user-provided text, acknowledge the discrepancy and prefer the verified portal value for AQSLIM phase/plan status unless the user is reporting a newer event that requires AQSLIM review.',
    ...facts,
    phaseFoodPolicy,
  ].filter(Boolean).join('\n')
}
