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

function isRecommendation(value: unknown): value is RestaurantRecommendation {
  if (!value || typeof value !== 'object') return false
  const recommendation = value as Record<string, unknown>
  return ['item', 'reason', 'modification'].every(
    field => typeof recommendation[field] === 'string' && recommendation[field].trim().length > 0,
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
