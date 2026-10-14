export type RestaurantRecommendation = {
  item: string
  reason: string
  modification: string
}

export type RestaurantAdvisorResult = {
  best: RestaurantRecommendation
  adjusted: RestaurantRecommendation
  avoid: RestaurantRecommendation
  confidenceNote: string
}

const VAGUE_ITEM_PATTERNS = [
  /\bor similar\b/i,
  /\bsection\b/i,
  /\bvisible in (?:the )?menu\b/i,
  /\bitems visible\b/i,
  /\bmenu items\b/i,
  /\bgrilled meat entr(?:e|é)e\b/i,
  /\bbreaded\/?fried items\b/i,
]

const JING_HIGH_RISK_BEST_PATTERNS = [
  /\bparmigiana\b/i,
  /\bparmesan\b/i,
  /\balfredo\b/i,
  /\blasagna\b/i,
  /\bcannelloni\b/i,
  /\bravioli\b/i,
  /\bpasta\b/i,
  /\bbreaded\b/i,
  /\bfried\b/i,
  /\bfritta\b/i,
]

const JING_CHEESE_OVERSTATEMENT_PATTERNS = [
  /cheese is (?:appropriate|compatible|fine|free)/i,
  /queso es (?:apropiado|compatible|libre)/i,
]

const UNVERIFIED_NUMERIC_NUTRITION_PATTERNS = [
  /(?:~|≈)?\s*\d+(?:\s*[-–]\s*\d+)?\s*(?:g|grams?|gramos?|kcal|calories|calorías|mg)\b/i,
]

export function isSpecificRestaurantMenuItemLabel(value: string): boolean {
  const item = value.trim()
  if (!item) return false
  const lower = item.toLowerCase()
  if (lower.includes('unreadable') || lower.includes('ilegible')) return true
  return VAGUE_ITEM_PATTERNS.every(pattern => !pattern.test(item))
}

export function isJingBestRestaurantItemLabel(value: string): boolean {
  const item = value.trim()
  if (!item) return false
  const lower = item.toLowerCase()
  if (lower.includes('unreadable') || lower.includes('ilegible')) return true
  return JING_HIGH_RISK_BEST_PATTERNS.every(pattern => !pattern.test(item))
}

function isRecommendation(value: unknown): value is RestaurantRecommendation {
  if (!value || typeof value !== 'object') return false
  const recommendation = value as Record<string, unknown>
  const item = recommendation.item
  return (
    typeof item === 'string'
    && isSpecificRestaurantMenuItemLabel(item)
    && typeof recommendation.reason === 'string'
    && recommendation.reason.trim().length > 0
    && typeof recommendation.modification === 'string'
    && recommendation.modification.trim().length > 0
  )
}

export function isRestaurantAdvisorResult(value: unknown): value is RestaurantAdvisorResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Record<string, unknown>
  return (
    isRecommendation(result.best)
    && isRecommendation(result.adjusted)
    && isRecommendation(result.avoid)
    && typeof result.confidenceNote === 'string'
    && result.confidenceNote.trim().length > 0
  )
}

function containsUnverifiedNumericNutrition(text: string): boolean {
  const withoutGovernedJingTarget = text
    .replace(/(?:less than|menos de|<)\s*20\s*g(?:\s*(?:of|de)\s*carbohydrates?|\s*de\s*carbohidratos?)?/gi, '')
  return UNVERIFIED_NUMERIC_NUTRITION_PATTERNS.some(pattern => pattern.test(withoutGovernedJingTarget))
}

export function isRestaurantAdvisorResultForPhase(value: unknown, phase: string | null): value is RestaurantAdvisorResult {
  if (!isRestaurantAdvisorResult(value)) return false
  if (phase !== 'Jing') return true

  if (!isJingBestRestaurantItemLabel(value.best.item)) return false

  const combinedText = [
    value.best.reason,
    value.best.modification,
    value.adjusted.reason,
    value.adjusted.modification,
    value.avoid.reason,
    value.avoid.modification,
    value.confidenceNote,
  ].join(' ')

  if (JING_CHEESE_OVERSTATEMENT_PATTERNS.some(pattern => pattern.test(combinedText))) return false
  if (containsUnverifiedNumericNutrition(combinedText)) return false
  return true
}

export function parseRestaurantAdvisorJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  if (!trimmed) return null

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
