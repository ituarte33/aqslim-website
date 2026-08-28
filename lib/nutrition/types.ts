export type NutritionPhase = 'Jing' | 'Qi' | 'Xue' | 'Yang Sheng'

export type MealSlot = 'first_meal' | 'lunch' | 'dinner'
export type PortionBand = 'L' | 'E' | 'M'

export type NutritionTotals = {
  calories: number
  proteinG: number
  fatG: number
  netCarbsG: number
}

export type LocalizedText = {
  es: string
  en: string
}

export type RecipeVariant = {
  id: string
  familyId: string
  source: 'synthetic_fixture'
  status: 'approved' | 'draft' | 'retired'
  active: boolean
  name: LocalizedText
  portion: LocalizedText
  phase: NutritionPhase
  slots: readonly MealSlot[]
  band: PortionBand
  conditional: boolean
  minutes: number
  ingredients: readonly string[]
  allergens: readonly string[]
  totals: NutritionTotals
}

export type CompletionComponent = {
  id: string
  source: 'synthetic_fixture'
  status: 'approved' | 'draft' | 'retired'
  active: boolean
  automatic: boolean
  kind: 'side' | 'protein' | 'dairy' | 'fat'
  name: LocalizedText
  portion: LocalizedText
  compatibleFamilies: readonly string[]
  ingredients: readonly string[]
  allergens: readonly string[]
  totals: NutritionTotals
}

export type NutritionProfile = {
  id: string
  firstName: string
  language: 'es' | 'en'
  phase: NutritionPhase
  calorieTarget: number
  mealSlots: readonly MealSlot[]
  preferredFoods: readonly string[]
  dislikedFoods: readonly string[]
  excludedFoods: readonly string[]
  safetyReviewRequired: boolean
}

export type PlateOption = {
  id: string
  recipeId: string
  familyId: string
  name: LocalizedText
  portion: LocalizedText
  slot: MealSlot
  band: PortionBand
  conditional: boolean
  minutes: number
  componentIds: readonly string[]
  componentNames: readonly LocalizedText[]
  ingredients: readonly string[]
  allergens: readonly string[]
  totals: NutritionTotals
  preferenceScore: number
}

export type ChoiceGroup = {
  slot: MealSlot
  targetCalories: number
  carbBudgetG: number
  options: readonly PlateOption[]
}

export type CompatibilityEnvelope = {
  minCalories: number
  maxCalories: number
  maxNetCarbsG: number
  calorieFloor: number
  calorieCeiling: number
  carbCeilingG: number
  passes: boolean
}

export type GuidedPlanStatus =
  | 'ready_for_review'
  | 'insufficient_library'
  | 'blocked_high_target'
  | 'blocked_profile'

export type GuidedPlan = {
  id: string
  source: 'synthetic_preview'
  profile: NutritionProfile
  status: GuidedPlanStatus
  requiresHumanReview: true
  groups: readonly ChoiceGroup[]
  envelope: CompatibilityEnvelope
  reasons: readonly string[]
}
