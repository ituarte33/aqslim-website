export type FoodAnalysis = {
  food: string
  calories: number
  carbs: number
  fats: number
  proteins: number
  notes: string
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
  }
}
