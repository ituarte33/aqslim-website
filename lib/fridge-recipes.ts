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

export type FridgeRecipeResult = {
  observedIngredients: string[]
  uncertainItems: string[]
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
    && recipe.ingredients.length >= 2
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

export function isFridgeRecipeResult(value: unknown): value is FridgeRecipeResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Record<string, unknown>
  return (
    isShortTextList(result.observedIngredients, 30)
    && result.observedIngredients.length > 0
    && isShortTextList(result.uncertainItems, 20)
    && Array.isArray(result.recipes)
    && result.recipes.length === 3
    && result.recipes.every(isRecipe)
    && isShortText(result.confidenceNote, 600)
    && isShortText(result.safetyNote, 600)
  )
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
