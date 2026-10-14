import { estimateEnergyTarget } from './energy.ts'
import type { ActivityLevel, EnergyEquationSex, NutritionProfile } from './types'

const POUNDS_PER_KILOGRAM = 2.2046226218
const CENTIMETERS_PER_INCH = 2.54
const CONTROLLED_DEFICIT_CALORIES = 500

export type MedicationReviewAnswer = 'none' | 'required'

export type SyntheticQuestionnaireAnswers = {
  ageYears: number
  equationSex: EnergyEquationSex
  heightFeet: number
  heightInches: number
  currentWeightLb: number
  goalWeightLb: number
  activityLevel: ActivityLevel
  mealCount: 2 | 3
  preferredFoods: readonly string[]
  dislikedFoods: readonly string[]
  excludedFoods: readonly string[]
  medicationReview: MedicationReviewAnswer
}

export type QuestionnaireValidationError =
  | 'invalid_age'
  | 'invalid_height'
  | 'invalid_current_weight'
  | 'invalid_goal_weight'
  | 'invalid_meal_count'

function unique(values: readonly string[]) {
  return [...new Set(values.map(value => value.trim().toLocaleLowerCase('en-US')).filter(Boolean))]
}

export function buildSyntheticQuestionnaireProfile(answers: SyntheticQuestionnaireAnswers): {
  profile: NutritionProfile | null
  errors: QuestionnaireValidationError[]
} {
  const errors: QuestionnaireValidationError[] = []
  const totalHeightInches = answers.heightFeet * 12 + answers.heightInches

  if (!Number.isFinite(answers.ageYears) || answers.ageYears < 18 || answers.ageYears > 85) errors.push('invalid_age')
  if (
    !Number.isFinite(answers.heightFeet)
    || !Number.isFinite(answers.heightInches)
    || answers.heightInches < 0
    || answers.heightInches > 11
    || totalHeightInches < 48
    || totalHeightInches > 90
  ) errors.push('invalid_height')
  if (!Number.isFinite(answers.currentWeightLb) || answers.currentWeightLb < 100 || answers.currentWeightLb > 770) {
    errors.push('invalid_current_weight')
  }
  if (
    !Number.isFinite(answers.goalWeightLb)
    || answers.goalWeightLb < 100
    || answers.goalWeightLb >= answers.currentWeightLb
  ) errors.push('invalid_goal_weight')
  if (answers.mealCount !== 2 && answers.mealCount !== 3) errors.push('invalid_meal_count')
  if (errors.length > 0) return { profile: null, errors }

  const excludedFoods = unique(answers.excludedFoods)
  const excluded = new Set(excludedFoods)
  const dislikedFoods = unique(answers.dislikedFoods).filter(food => !excluded.has(food))
  const blocked = new Set([...excludedFoods, ...dislikedFoods])
  const preferredFoods = unique(answers.preferredFoods).filter(food => !blocked.has(food))
  const energyInputs = {
    ageYears: answers.ageYears,
    equationSex: answers.equationSex,
    heightCm: Math.round(totalHeightInches * CENTIMETERS_PER_INCH),
    currentWeightKg: Math.round((answers.currentWeightLb / POUNDS_PER_KILOGRAM) * 10) / 10,
    goalWeightKg: Math.round((answers.goalWeightLb / POUNDS_PER_KILOGRAM) * 10) / 10,
    activityLevel: answers.activityLevel,
    requestedDeficitCalories: CONTROLLED_DEFICIT_CALORIES,
  } as const

  return {
    errors: [],
    profile: {
      id: 'SYN-JING-QUESTIONNAIRE-DRAFT',
      firstName: 'Perfil generado',
      language: 'es',
      phase: 'Jing',
      calorieTarget: estimateEnergyTarget(energyInputs).targetCalories,
      energyInputs,
      mealSlots: answers.mealCount === 2 ? ['lunch', 'dinner'] : ['first_meal', 'lunch', 'dinner'],
      preferredFoods,
      dislikedFoods,
      excludedFoods,
      safetyReviewRequired: answers.medicationReview === 'required',
    },
  }
}
