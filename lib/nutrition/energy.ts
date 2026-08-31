import type { ActivityLevel, EnergyEstimate, EnergyInputs } from './types'

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
}

const MIN_STANDARD_DEFICIT = 500
const MAX_STANDARD_DEFICIT = 750
const MIN_PREVIEW_TARGET = 1_200

function roundedHundred(value: number) {
  return Math.round(value / 100) * 100
}

export function estimateEnergyTarget(inputs: EnergyInputs): EnergyEstimate {
  const reasons: string[] = []
  const validInputs = Number.isFinite(inputs.ageYears)
    && inputs.ageYears >= 18
    && inputs.ageYears <= 85
    && Number.isFinite(inputs.heightCm)
    && inputs.heightCm >= 120
    && inputs.heightCm <= 230
    && Number.isFinite(inputs.currentWeightKg)
    && inputs.currentWeightKg >= 45
    && inputs.currentWeightKg <= 350
    && Number.isFinite(inputs.goalWeightKg)
    && inputs.goalWeightKg >= 45
    && inputs.goalWeightKg < inputs.currentWeightKg

  if (!validInputs) reasons.push('The energy calculation is missing a valid adult age, height, current weight, or lower goal weight.')
  if (inputs.requestedDeficitCalories < MIN_STANDARD_DEFICIT || inputs.requestedDeficitCalories > MAX_STANDARD_DEFICIT) {
    reasons.push('The requested energy deficit is outside the controlled 500–750 kcal Preview range.')
  }

  const sexOffset = inputs.equationSex === 'male' ? 5 : -161
  const restingCalories = Math.round(
    10 * inputs.currentWeightKg + 6.25 * inputs.heightCm - 5 * inputs.ageYears + sexOffset,
  )
  const maintenanceCalories = Math.round(restingCalories * ACTIVITY_FACTOR[inputs.activityLevel])
  const targetCalories = roundedHundred(maintenanceCalories - inputs.requestedDeficitCalories)
  const appliedDeficitCalories = maintenanceCalories - targetCalories
  const deficitPercent = Math.round((appliedDeficitCalories / maintenanceCalories) * 1_000) / 10

  if (targetCalories < MIN_PREVIEW_TARGET) reasons.push('The calculated target is below the controlled Preview floor.')

  return {
    restingCalories,
    maintenanceCalories,
    targetCalories,
    appliedDeficitCalories,
    deficitPercent,
    proteinFloorG: Math.round(inputs.goalWeightKg * 1.2),
    proteinCeilingG: Math.round(inputs.goalWeightKg * 1.6),
    reviewRequired: reasons.length > 0,
    reasons,
  }
}
