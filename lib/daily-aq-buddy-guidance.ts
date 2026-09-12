import { phaseHomeReminder } from '@/lib/aqslim-phase-food-policy'

export type GuidanceLanguage = 'es' | 'en'

type DailyGuidanceInput = {
  phase: string | null
  weekInPhase: number | null
  planName: string | null
}

type LocalizedDailyGuidance = {
  phaseLabel: string
  bullets: string[]
  note: string
  buddyPrompt: string
}

export type DailyAQBuddyGuidance = Record<GuidanceLanguage, LocalizedDailyGuidance>

const PHASE_TARGETS: Record<string, { es: string; en: string }> = {
  Jing: {
    es: 'Mantén los carbohidratos por debajo de 20 g al día.',
    en: 'Keep carbohydrates below 20 g per day.',
  },
  Qi: {
    es: 'Mantén los carbohidratos aproximadamente entre 25 y 45 g al día.',
    en: 'Keep carbohydrates at approximately 25–45 g per day.',
  },
  Xue: {
    es: 'Mantén los carbohidratos aproximadamente entre 50 y 80 g al día.',
    en: 'Keep carbohydrates at approximately 50–80 g per day.',
  },
  'Yang Sheng': {
    es: 'Mantén los carbohidratos aproximadamente entre 80 y 120 g al día.',
    en: 'Keep carbohydrates at approximately 80–120 g per day.',
  },
}

function phaseLabel(phase: string | null, week: number | null, language: GuidanceLanguage) {
  const phaseName = phase || (language === 'es' ? 'Fase por confirmar' : 'Phase to be confirmed')
  if (!week) return phaseName
  return language === 'es' ? `${phaseName} · Semana ${week}` : `${phaseName} · Week ${week}`
}

function planBullet(planName: string | null, language: GuidanceLanguage) {
  const normalized = (planName ?? '').toLowerCase()
  const hypocaloric = normalized.includes('hipocal') || normalized.includes('hypocal')
  if (hypocaloric) {
    return language === 'es'
      ? 'Continúa con el plan hipocalórico registrado para el resto de la semana.'
      : 'Continue the hypocaloric plan recorded for the rest of the week.'
  }
  return language === 'es'
    ? 'Sigue las indicaciones registradas de tu plan actual.'
    : 'Follow the instructions recorded in your current plan.'
}

export function buildDailyAQBuddyGuidance({ phase, weekInPhase, planName }: DailyGuidanceInput): DailyAQBuddyGuidance {
  const target = phase ? PHASE_TARGETS[phase] : null
  const phaseEs = phaseLabel(phase, weekInPhase, 'es')
  const phaseEn = phaseLabel(phase, weekInPhase, 'en')

  return {
    es: {
      phaseLabel: phaseEs,
      bullets: [
        target?.es ?? 'Confirma tu fase antes de hacer cambios importantes en carbohidratos.',
        phaseHomeReminder(phase, 'es'),
        planBullet(planName, 'es'),
      ],
      note: 'Si tienes una indicación especial registrada, esa tiene prioridad. No cambies de fase por tu cuenta.',
      buddyPrompt: `Estoy en ${phaseEs}. Dame mis recomendaciones AQSLIM para hoy usando las reglas autorizadas de mi fase. ¿Qué debo priorizar y qué debo evitar? No uses una lista keto genérica.`,
    },
    en: {
      phaseLabel: phaseEn,
      bullets: [
        target?.en ?? 'Confirm your phase before making major carbohydrate changes.',
        phaseHomeReminder(phase, 'en'),
        planBullet(planName, 'en'),
      ],
      note: 'If you have a recorded special instruction, it takes priority. Do not change phases on your own.',
      buddyPrompt: `I am in ${phaseEn}. Give me today's AQSLIM recommendations using the authorized rules for my phase. What should I prioritize and avoid? Do not use a generic keto list.`,
    },
  }
}
