export type ClinicPlanReadinessData = {
  planLabel?: string
  treatmentStart?: string
  phase?: string
  phaseWeek?: number | null
  phaseStart?: string
  calorieTarget?: number | null
  dietName?: string
  specialInstructions?: string
  kenkhoTier?: string
  visitCadenceDays?: number | null
  startingWeightKg?: number | null
  currentWeightKg?: number | null
  goalWeightKg?: number | null
}

export type ClinicPlanReadinessCheck = {
  key: string
  label: string
  passed: boolean
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function positive(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isoDate(value: unknown) {
  return /^\d{4}-\d{2}-\d{2}$/.test(text(value))
}

export function getClinicPlanReadiness(plan: ClinicPlanReadinessData) {
  const checks: ClinicPlanReadinessCheck[] = [
    { key: 'label', label: 'Nombre o etiqueta del plan', passed: Boolean(text(plan.planLabel)) },
    { key: 'treatmentStart', label: 'Fecha de inicio del tratamiento', passed: isoDate(plan.treatmentStart) },
    { key: 'phaseStart', label: 'Fecha de inicio de la fase', passed: isoDate(plan.phaseStart) },
    { key: 'phase', label: 'Fase clínica definida', passed: Boolean(text(plan.phase)) && plan.phase !== 'Sin fase' },
    { key: 'phaseWeek', label: 'Semana de fase válida', passed: positive(plan.phaseWeek) && Number.isInteger(plan.phaseWeek) },
    { key: 'dietName', label: 'Dieta o nombre del plan', passed: Boolean(text(plan.dietName)) },
    { key: 'instructions', label: 'Instrucciones para el paciente', passed: Boolean(text(plan.specialInstructions)) },
    { key: 'tier', label: 'Modalidad Kenkho definida', passed: Boolean(text(plan.kenkhoTier)) },
    { key: 'cadence', label: 'Cadencia de citas válida', passed: positive(plan.visitCadenceDays) && Number.isInteger(plan.visitCadenceDays) },
    { key: 'weights', label: 'Pesos inicial, actual y meta', passed: positive(plan.startingWeightKg) && positive(plan.currentWeightKg) && positive(plan.goalWeightKg) },
    { key: 'calories', label: 'Calorías válidas si fueron definidas', passed: plan.calorieTarget === null || plan.calorieTarget === undefined || positive(plan.calorieTarget) },
  ]
  return { ready: checks.every(check => check.passed), checks }
}

const COMPARISON_FIELDS: Array<{ key: keyof ClinicPlanReadinessData; label: string; suffix?: string }> = [
  { key: 'planLabel', label: 'Etiqueta' },
  { key: 'treatmentStart', label: 'Inicio tratamiento' },
  { key: 'phaseStart', label: 'Inicio fase' },
  { key: 'phase', label: 'Fase' },
  { key: 'phaseWeek', label: 'Semana en fase' },
  { key: 'dietName', label: 'Dieta / plan' },
  { key: 'calorieTarget', label: 'Calorías objetivo' },
  { key: 'specialInstructions', label: 'Instrucciones' },
  { key: 'kenkhoTier', label: 'Modalidad Kenkho' },
  { key: 'visitCadenceDays', label: 'Cadencia', suffix: ' días' },
  { key: 'startingWeightKg', label: 'Peso inicial', suffix: ' kg' },
  { key: 'currentWeightKg', label: 'Peso actual', suffix: ' kg' },
  { key: 'goalWeightKg', label: 'Peso meta', suffix: ' kg' },
]

function display(value: unknown, suffix = '') {
  if (value === null || value === undefined || value === '') return '—'
  return `${String(value).trim()}${suffix}`
}

export function compareClinicPlans(current: ClinicPlanReadinessData | null, draft: ClinicPlanReadinessData) {
  return COMPARISON_FIELDS.map(field => {
    const currentValue = display(current?.[field.key], field.suffix)
    const draftValue = display(draft[field.key], field.suffix)
    return {
      key: field.key,
      label: field.label,
      current: currentValue,
      draft: draftValue,
      changed: currentValue !== draftValue,
    }
  })
}
