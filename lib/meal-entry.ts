import type { MealType } from './airtable'
import type { FoodAnalysis } from './food-analysis'

export const MEAL_PORTION_MIN = 10
export const MEAL_PORTION_MAX = 100
export const MEAL_DESCRIPTION_MAX = 500
export const MEAL_CORRECTION_MAX = 700

const MEAL_TYPES = new Set<MealType>(['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Other'])

export function parseMealPortion(value: unknown): number | null {
  const portion = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(portion) || portion < MEAL_PORTION_MIN || portion > MEAL_PORTION_MAX) return null
  return portion
}

export function parseMealType(value: unknown): MealType | null {
  return typeof value === 'string' && MEAL_TYPES.has(value as MealType) ? value as MealType : null
}

export function parseMealDescription(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const description = value.trim().replace(/\s+/g, ' ')
  if (description.length < 3 || description.length > MEAL_DESCRIPTION_MAX) return null
  return description
}

export function parseMealCorrection(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const correction = value.trim().replace(/\s+/g, ' ')
  if (correction.length < 3 || correction.length > MEAL_CORRECTION_MAX) return null
  return correction
}

export function applyMealPortion(result: FoodAnalysis, portionPercent: number): FoodAnalysis {
  const factor = portionPercent / 100
  const scale = (value: number) => Math.max(0, Math.round(value * factor))
  return {
    ...result,
    calories: scale(result.calories),
    carbs: scale(result.carbs),
    fats: scale(result.fats),
    proteins: scale(result.proteins),
  }
}
