export type FoodAnalysis = {
  food: string
  calories: number
  carbs: number
  fats: number
  proteins: number
  notes: string
  ingredients?: FoodIngredientAnalysis[]
}

export type FoodIngredientAnalysis = {
  name: string
  calories: number
  carbs: number
  fats: number
  proteins: number
}

function macroCalories(carbs: number, fats: number, proteins: number): number {
  return carbs * 4 + fats * 9 + proteins * 4
}

function caloriesAreConsistent(calories: number, carbs: number, fats: number, proteins: number): boolean {
  const calculated = macroCalories(carbs, fats, proteins)
  return Math.abs(calories - calculated) <= Math.max(20, calculated * 0.15)
}

export function isFoodAnalysisConsistent(analysis: FoodAnalysis): boolean {
  if (!caloriesAreConsistent(analysis.calories, analysis.carbs, analysis.fats, analysis.proteins)) return false
  if (!analysis.ingredients?.length) return false
  if (analysis.ingredients.some(item => !caloriesAreConsistent(item.calories, item.carbs, item.fats, item.proteins))) return false

  const totals = analysis.ingredients.reduce((sum, item) => ({
    calories: sum.calories + item.calories,
    carbs: sum.carbs + item.carbs,
    fats: sum.fats + item.fats,
    proteins: sum.proteins + item.proteins,
  }), { calories: 0, carbs: 0, fats: 0, proteins: 0 })

  return Math.abs(analysis.calories - totals.calories) <= Math.max(20, analysis.calories * 0.1)
    && Math.abs(analysis.carbs - totals.carbs) <= 2
    && Math.abs(analysis.fats - totals.fats) <= 2
    && Math.abs(analysis.proteins - totals.proteins) <= 2
}

function jsonCandidate(raw: string): string {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fenced?.[1]) return fenced[1].trim()

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }
  return trimmed
}

export function parseFoodAnalysis(raw: string): FoodAnalysis | null {
  let value: unknown
  try {
    value = JSON.parse(jsonCandidate(raw))
  } catch {
    return null
  }

  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  const numericValues = [candidate.calories, candidate.carbs, candidate.fats, candidate.proteins]
  const ingredients = Array.isArray(candidate.ingredients)
    ? candidate.ingredients.map(item => {
      if (!item || typeof item !== 'object') return null
      const ingredient = item as Record<string, unknown>
      const values = [ingredient.calories, ingredient.carbs, ingredient.fats, ingredient.proteins]
      if (typeof ingredient.name !== 'string' || !ingredient.name.trim() || values.some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0)) return null
      return {
        name: ingredient.name.trim(),
        calories: ingredient.calories as number,
        carbs: ingredient.carbs as number,
        fats: ingredient.fats as number,
        proteins: ingredient.proteins as number,
      }
    })
    : undefined
  if (
    typeof candidate.food !== 'string'
    || candidate.food.trim().length === 0
    || typeof candidate.notes !== 'string'
    || numericValues.some(item => typeof item !== 'number' || !Number.isFinite(item) || item < 0)
  ) {
    return null
  }

  return {
    food: candidate.food.trim(),
    calories: candidate.calories as number,
    carbs: candidate.carbs as number,
    fats: candidate.fats as number,
    proteins: candidate.proteins as number,
    notes: candidate.notes.trim(),
    ...(ingredients && ingredients.every(Boolean) ? { ingredients: ingredients as FoodIngredientAnalysis[] } : {}),
  }
}
