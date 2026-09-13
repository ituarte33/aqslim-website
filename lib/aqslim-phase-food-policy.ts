export type AQSLIMPhaseFoodPolicyLanguage = 'es' | 'en'

export type AQSLIMPhaseFoodPolicyInput = {
  phase: string | null
  weekInPhase: number | null
}

type LocalizedPhasePolicy = {
  target: string
  homeReminder: string
}

const PHASE_TARGETS: Record<string, LocalizedPhasePolicy> = {
  Jing: {
    target: 'Less than 20 g carbohydrate per day.',
    homeReminder: 'Prioriza proteína sencilla y vegetales compatibles con Jing; evita improvisar alimentos que no estén autorizados por tu plan.',
  },
  Qi: {
    target: 'Approximately 25–45 g carbohydrate per day.',
    homeReminder: 'Mantén la estructura de tu fase y aumenta variedad sólo dentro de las indicaciones registradas.',
  },
  Xue: {
    target: 'Approximately 50–80 g carbohydrate per day.',
    homeReminder: 'Amplía opciones de forma guiada sin perder de vista porciones y carbohidratos totales.',
  },
  'Yang Sheng': {
    target: 'Approximately 80–120 g carbohydrate per day.',
    homeReminder: 'Busca autonomía sostenible: variedad, porciones conscientes y decisiones informadas.',
  },
}

export function buildAQSLIMPhaseFoodPolicyContext({ phase, weekInPhase }: AQSLIMPhaseFoodPolicyInput) {
  if (!phase) return ''
  const target = PHASE_TARGETS[phase]?.target
  if (!target) return ''

  const weekText = typeof weekInPhase === 'number' ? `Week in phase: ${weekInPhase}.` : 'Week in phase: unknown.'
  const lines = [
    'AQSLIM PHASE FOOD POLICY — GOVERNED RUNTIME SOURCE',
    `Current phase: ${phase}.`,
    weekText,
    `Carbohydrate target: ${target}`,
    'This policy overrides generic low-carb, keto, or internet-style food advice when they conflict.',
    'Never invent an allowance or prohibition that is not present in this policy or the patient\'s recorded plan.',
  ]

  if (phase === 'Jing') {
    lines.push(
      'JING-SPECIFIC RULES:',
      '- In early Jing, do NOT recommend avocado or nuts as default or priority foods. If a patient-specific recorded plan explicitly authorizes them, defer to that recorded plan.',
      '- Cheese is easy to overconsume. Do not describe cheese as inherently "appropriate," "compatible," unlimited, or a default free food in Jing. If cheese appears in a dish, treat it as a portion-control concern unless a patient-specific recorded plan explicitly authorizes it.',
      '- Do not categorically classify corn tortillas as always forbidden. When corn tortillas are part of the authorized AQSLIM plan, keep them within the recorded allowance, never more than two portions, and count them within the daily carbohydrate target.',
      '- Prefer simple protein and phase-compatible low-carbohydrate vegetables. Watch hidden sugars, breading, sauces, sweetened drinks, and oversized portions.',
      '- If an exact approved-food list or individual allowance is not available in the current runtime, say it cannot be verified instead of filling the gap with generic keto advice.'
    )
  }

  return lines.join('\n')
}

export function phaseHomeReminder(phase: string | null, language: AQSLIMPhaseFoodPolicyLanguage) {
  if (!phase) {
    return language === 'es'
      ? 'Confirma tu fase antes de hacer cambios importantes en tus alimentos.'
      : 'Confirm your phase before making major food changes.'
  }

  if (phase === 'Jing') {
    return language === 'es'
      ? 'Prioriza proteína sencilla y vegetales compatibles con Jing; en esta etapa no uses aguacate ni nueces como opciones predeterminadas.'
      : 'Prioritize simple protein and Jing-compatible vegetables; at this stage, do not use avocado or nuts as default choices.'
  }

  const fallback = PHASE_TARGETS[phase]?.homeReminder
  if (language === 'en') {
    if (phase === 'Qi') return 'Keep the structure of your phase and add variety only within your recorded instructions.'
    if (phase === 'Xue') return 'Expand choices gradually while keeping portions and total carbohydrates in view.'
    if (phase === 'Yang Sheng') return 'Aim for sustainable autonomy: variety, mindful portions, and informed choices.'
  }
  return fallback ?? (language === 'es'
    ? 'Sigue las indicaciones registradas de tu fase actual.'
    : 'Follow the recorded instructions for your current phase.')
}
