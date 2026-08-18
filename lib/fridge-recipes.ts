export type FridgeDetectionResult = {
  observedIngredients: string[]
  uncertainItems: string[]
  confidenceNote: string
}

export type FridgeRecipeIngredient = {
  item: string
  amount: string
}

export type FridgeRecipe = {
  name: string
  summary: string
  ingredients: FridgeRecipeIngredient[]
  optionalExtras: string[]
  steps: string[]
  minutes: number
  servings: number
  phaseFit: string
}

export type FridgeRecipeGenerationResult = {
  recipes: FridgeRecipe[]
  confidenceNote: string
  safetyNote: string
}

function isShortText(value: unknown, maxLength = 500): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

function isShortTextList(value: unknown, maxItems: number): value is string[] {
  return Array.isArray(value)
    && value.length <= maxItems
    && value.every(item => isShortText(item, 180))
}

function isIngredient(value: unknown): value is FridgeRecipeIngredient {
  if (!value || typeof value !== 'object') return false
  const ingredient = value as Record<string, unknown>
  return isShortText(ingredient.item, 120) && isShortText(ingredient.amount, 100)
}

function isRecipe(value: unknown): value is FridgeRecipe {
  if (!value || typeof value !== 'object') return false
  const recipe = value as Record<string, unknown>
  return (
    isShortText(recipe.name, 120)
    && isShortText(recipe.summary, 400)
    && Array.isArray(recipe.ingredients)
    && recipe.ingredients.length >= 1
    && recipe.ingredients.length <= 14
    && recipe.ingredients.every(isIngredient)
    && isShortTextList(recipe.optionalExtras, 8)
    && isShortTextList(recipe.steps, 8)
    && recipe.steps.length >= 2
    && Number.isInteger(recipe.minutes)
    && (recipe.minutes as number) >= 1
    && (recipe.minutes as number) <= 180
    && Number.isInteger(recipe.servings)
    && (recipe.servings as number) >= 1
    && (recipe.servings as number) <= 12
    && isShortText(recipe.phaseFit, 400)
  )
}

export function isFridgeDetectionResult(value: unknown): value is FridgeDetectionResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Record<string, unknown>
  return (
    isShortTextList(result.observedIngredients, 30)
    && isShortTextList(result.uncertainItems, 20)
    && isShortText(result.confidenceNote, 600)
  )
}

export function isFridgeRecipeGenerationResult(value: unknown): value is FridgeRecipeGenerationResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Record<string, unknown>
  return (
    Array.isArray(result.recipes)
    && result.recipes.length === 3
    && result.recipes.every(isRecipe)
    && isShortText(result.confidenceNote, 600)
    && isShortText(result.safetyNote, 600)
  )
}

export function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start < 0 || end <= start) return null
    try {
      return JSON.parse(trimmed.slice(start, end + 1))
    } catch {
      return null
    }
  }
}

export function normalizeIngredientList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const normalized = item.trim().replace(/\s+/g, ' ').slice(0, 100)
    const key = normalized.toLocaleLowerCase('es-MX')
    if (!normalized || seen.has(key)) continue
    seen.add(key)
    result.push(normalized)
    if (result.length === 30) break
  }
  return result
}

export function ingredientTextToList(value: string): string[] {
  return normalizeIngredientList(value.split(/[,;\n]+/))
}

const PHASE_RULES: Record<string, string> = {
  Jing: 'Jing: less than 20 g of carbohydrates per day.',
  Qi: 'Qi: 25–45 g of carbohydrates per day.',
  Xue: 'Xue: 50–80 g of carbohydrates per day.',
  'Yang Sheng': 'Yang Sheng: 80–120 g of carbohydrates per day.',
}

export function canonicalFridgePhase(phase: string | null): string | null {
  return phase && PHASE_RULES[phase] ? phase : null
}

export function fridgePhaseInstruction(phase: string | null): string {
  const canonicalPhase = canonicalFridgePhase(phase)
  if (!canonicalPhase) {
    return 'No nutritional phase is confirmed. Do not call any recipe phase-compatible and do not choose or infer a phase. The phaseFit field must clearly say that compatibility is pending confirmation by AQSLIM.'
  }
  return `The canonical phase confirmed by AQSLIM is ${PHASE_RULES[canonicalPhase]} Adapt suggestions conservatively to that phase without changing it or claiming exact daily compliance from a single recipe.`
}
