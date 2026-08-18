export const PILOT_COHORT_ID = 'myaq-soft-start-001'

export type PilotRole = 'founder' | 'participant' | 'operations' | 'technical'

export type PilotFeature =
  | 'patient_portal'
  | 'aq_buddy'
  | 'food_scan'
  | 'restaurant_advisor'
  | 'fast_36'
  | 'fridge_recipes'
  | 'weekly_summary'

export const ACTIVE_PILOT_FEATURES: readonly PilotFeature[] = [
  'aq_buddy',
  'food_scan',
  'restaurant_advisor',
  'fridge_recipes',
  'weekly_summary',
]

export const PLANNED_PILOT_FEATURES: readonly PilotFeature[] = []

export type PilotAccess = {
  cohort: typeof PILOT_COHORT_ID
  role: PilotRole
  language: 'es' | 'en'
  enabledFeatures: ReadonlySet<PilotFeature>
}

function isPilotRole(value: unknown): value is PilotRole {
  return value === 'founder' || value === 'participant' || value === 'operations' || value === 'technical'
}

function isPilotFeature(value: unknown): value is PilotFeature {
  return value === 'patient_portal'
    || value === 'aq_buddy'
    || value === 'food_scan'
    || value === 'restaurant_advisor'
    || value === 'fast_36'
    || value === 'fridge_recipes'
    || value === 'weekly_summary'
}

export function pilotAccessFromMetadata(metadata: unknown): PilotAccess | null {
  if (!metadata || typeof metadata !== 'object') return null
  const root = metadata as Record<string, unknown>
  const pilot = root.pilot
  if (!pilot || typeof pilot !== 'object') return null
  const config = pilot as Record<string, unknown>
  if (config.enabled !== true || config.cohort !== PILOT_COHORT_ID) return null

  const configuredFeatures = Array.isArray(config.features)
    ? config.features.filter(isPilotFeature)
    : []
  const enabledFeatures = new Set<PilotFeature>([
    ...ACTIVE_PILOT_FEATURES,
    ...configuredFeatures,
  ])

  return {
    cohort: PILOT_COHORT_ID,
    role: isPilotRole(config.role) ? config.role : 'participant',
    language: config.language === 'en' ? 'en' : 'es',
    enabledFeatures,
  }
}

export function pilotAccessFromFast36Enrollment(hasFast36Sessions: boolean): PilotAccess | null {
  if (!hasFast36Sessions) return null
  return {
    cohort: PILOT_COHORT_ID,
    role: 'participant',
    language: 'es',
    enabledFeatures: new Set<PilotFeature>([
      ...ACTIVE_PILOT_FEATURES,
      'patient_portal',
      'fast_36',
    ]),
  }
}

export function pilotHasFeature(access: PilotAccess, feature: PilotFeature): boolean {
  return access.enabledFeatures.has(feature)
}

export function selectPilotDisplayFirstName(
  clerkFirstName: string,
  patientFirstName?: string | null,
): string {
  return patientFirstName?.trim() || clerkFirstName.trim() || 'Participante'
}
