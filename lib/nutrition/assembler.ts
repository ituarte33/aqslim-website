import type {
  ChoiceGroup,
  CompletionComponent,
  CompatibilityEnvelope,
  GuidedPlan,
  MealSlot,
  NutritionProfile,
  NutritionTotals,
  PlateOption,
  RecipeVariant,
} from './types'
import { estimateEnergyTarget } from './energy.ts'

export const JING_OPERATIONAL_CARB_CEILING_G = 18
export const ENERGY_TOLERANCE = 0.10
export const MAX_OPTIONS_PER_GROUP = 3
export const MAX_COMPONENTS_PER_PLATE = 2

const TWO_MEAL_WEIGHTS = [0.5, 0.5] as const
const THREE_MEAL_WEIGHTS = [0.30, 0.35, 0.35] as const
const TWO_MEAL_CARB_BUDGETS = [9, 9] as const
const THREE_MEAL_CARB_BUDGETS = [4.5, 7.5, 6] as const

function normalized(value: string) {
  return value.trim().toLocaleLowerCase('en-US')
}

function normalizedSet(values: readonly string[]) {
  return new Set(values.map(normalized).filter(Boolean))
}

function hasAny(values: readonly string[], blocked: ReadonlySet<string>) {
  return values.some(value => blocked.has(normalized(value)))
}

function addTotals(...items: readonly NutritionTotals[]): NutritionTotals {
  return items.reduce<NutritionTotals>((sum, item) => ({
    calories: sum.calories + item.calories,
    proteinG: sum.proteinG + item.proteinG,
    fatG: sum.fatG + item.fatG,
    netCarbsG: sum.netCarbsG + item.netCarbsG,
  }), { calories: 0, proteinG: 0, fatG: 0, netCarbsG: 0 })
}

function roundedTotals(value: NutritionTotals): NutritionTotals {
  return {
    calories: Math.round(value.calories),
    proteinG: Math.round(value.proteinG * 10) / 10,
    fatG: Math.round(value.fatG * 10) / 10,
    netCarbsG: Math.round(value.netCarbsG * 10) / 10,
  }
}

function componentCombinations(components: readonly CompletionComponent[]) {
  const combinations: CompletionComponent[][] = [[]]
  for (const component of components) combinations.push([component])
  for (let first = 0; first < components.length; first += 1) {
    for (let second = first + 1; second < components.length; second += 1) {
      if (components[first].kind === components[second].kind) continue
      combinations.push([components[first], components[second]])
    }
  }
  return combinations
}

function allowedComponents(
  familyId: string,
  components: readonly CompletionComponent[],
  blocked: ReadonlySet<string>,
) {
  return components.filter(component => (
    component.status === 'approved'
    && component.active
    && component.automatic
    && component.compatibleFamilies.includes(familyId)
    && !hasAny(component.ingredients, blocked)
    && !hasAny(component.allergens, blocked)
  ))
}

function preferenceScore(
  ingredients: readonly string[],
  preferred: ReadonlySet<string>,
  targetCalories: number,
  calories: number,
) {
  const preferenceMatches = ingredients.reduce(
    (count, ingredient) => count + (preferred.has(normalized(ingredient)) ? 1 : 0),
    0,
  )
  return preferenceMatches * 60 - Math.abs(targetCalories - calories)
}

export function buildCandidatePlates({
  profile,
  slot,
  targetCalories,
  carbBudgetG,
  recipes,
  components,
}: {
  profile: NutritionProfile
  slot: MealSlot
  targetCalories: number
  carbBudgetG: number
  recipes: readonly RecipeVariant[]
  components: readonly CompletionComponent[]
}): PlateOption[] {
  const exclusions = normalizedSet(profile.excludedFoods)
  const dislikes = normalizedSet(profile.dislikedFoods)
  const blocked = new Set([...exclusions, ...dislikes])
  const preferred = normalizedSet(profile.preferredFoods)
  const calorieFloor = targetCalories * (1 - ENERGY_TOLERANCE)
  const calorieCeiling = targetCalories * (1 + ENERGY_TOLERANCE)
  const candidates: PlateOption[] = []

  for (const recipe of recipes) {
    if (recipe.status !== 'approved' || !recipe.active || recipe.phase !== profile.phase) continue
    if (!recipe.slots.includes(slot)) continue
    if (hasAny(recipe.ingredients, blocked) || hasAny(recipe.allergens, blocked)) continue

    const compatibleComponents = allowedComponents(recipe.familyId, components, blocked)
    for (const completion of componentCombinations(compatibleComponents)) {
      if (completion.length > MAX_COMPONENTS_PER_PLATE) continue
      const plateTotals = roundedTotals(addTotals(recipe.totals, ...completion.map(item => item.totals)))
      if (plateTotals.calories < calorieFloor || plateTotals.calories > calorieCeiling) continue
      if (plateTotals.netCarbsG > carbBudgetG) continue

      const ingredients = [...new Set([
        ...recipe.ingredients,
        ...completion.flatMap(item => item.ingredients),
      ])]
      const allergens = [...new Set([
        ...recipe.allergens,
        ...completion.flatMap(item => item.allergens),
      ])]
      const componentIds = completion.map(item => item.id).toSorted()
      candidates.push({
        id: [recipe.id, ...componentIds].join('+'),
        recipeId: recipe.id,
        familyId: recipe.familyId,
        name: recipe.name,
        portion: recipe.portion,
        slot,
        band: recipe.band,
        conditional: recipe.conditional,
        minutes: recipe.minutes,
        componentIds,
        componentNames: completion.map(item => item.name),
        ingredients,
        allergens,
        totals: plateTotals,
        preferenceScore: preferenceScore(ingredients, preferred, targetCalories, plateTotals.calories),
      })
    }
  }

  return candidates.toSorted((left, right) => (
    right.preferenceScore - left.preferenceScore
    || Math.abs(left.totals.calories - targetCalories) - Math.abs(right.totals.calories - targetCalories)
    || left.id.localeCompare(right.id)
  ))
}

function bestPerFamily(candidates: readonly PlateOption[]) {
  const best = new Map<string, PlateOption>()
  for (const candidate of candidates) {
    if (!best.has(candidate.familyId)) best.set(candidate.familyId, candidate)
  }
  return [...best.values()]
}

function selectOptions(
  candidates: readonly PlateOption[],
  usedFamilies: ReadonlySet<string>,
  proteinCeilingG: number,
) {
  return bestPerFamily(candidates)
    .toSorted((left, right) => {
      const leftPenalty = usedFamilies.has(left.familyId) ? 200 : 0
      const rightPenalty = usedFamilies.has(right.familyId) ? 200 : 0
      const leftProteinPenalty = left.totals.proteinG > proteinCeilingG ? 500 : 0
      const rightProteinPenalty = right.totals.proteinG > proteinCeilingG ? 500 : 0
      return (right.preferenceScore - rightPenalty - rightProteinPenalty)
        - (left.preferenceScore - leftPenalty - leftProteinPenalty)
        || left.id.localeCompare(right.id)
    })
    .slice(0, MAX_OPTIONS_PER_GROUP)
}

function envelopeForGroups(
  groups: readonly ChoiceGroup[],
  calorieTarget: number,
): CompatibilityEnvelope {
  const complete = groups.length > 0 && groups.every(group => group.options.length > 0)
  const minCalories = complete
    ? groups.reduce((sum, group) => sum + Math.min(...group.options.map(option => option.totals.calories)), 0)
    : 0
  const maxCalories = complete
    ? groups.reduce((sum, group) => sum + Math.max(...group.options.map(option => option.totals.calories)), 0)
    : 0
  const maxNetCarbsG = complete
    ? Math.round(groups.reduce((sum, group) => sum + Math.max(...group.options.map(option => option.totals.netCarbsG)), 0) * 10) / 10
    : 0
  const minProteinG = complete
    ? Math.round(groups.reduce((sum, group) => sum + Math.min(...group.options.map(option => option.totals.proteinG)), 0) * 10) / 10
    : 0
  const maxProteinG = complete
    ? Math.round(groups.reduce((sum, group) => sum + Math.max(...group.options.map(option => option.totals.proteinG)), 0) * 10) / 10
    : 0
  const calorieFloor = Math.round(calorieTarget * (1 - ENERGY_TOLERANCE))
  const calorieCeiling = Math.round(calorieTarget * (1 + ENERGY_TOLERANCE))

  return {
    minCalories,
    maxCalories,
    maxNetCarbsG,
    minProteinG,
    maxProteinG,
    calorieFloor,
    calorieCeiling,
    carbCeilingG: JING_OPERATIONAL_CARB_CEILING_G,
    passes: complete
      && minCalories >= calorieFloor
      && maxCalories <= calorieCeiling
      && maxNetCarbsG <= JING_OPERATIONAL_CARB_CEILING_G,
  }
}

function mealConfiguration(profile: NutritionProfile) {
  if (profile.mealSlots.length === 2) {
    return { weights: TWO_MEAL_WEIGHTS, carbBudgets: TWO_MEAL_CARB_BUDGETS }
  }
  if (profile.mealSlots.length === 3) {
    return { weights: THREE_MEAL_WEIGHTS, carbBudgets: THREE_MEAL_CARB_BUDGETS }
  }
  return null
}

function emptyEnvelope(calorieTarget: number): CompatibilityEnvelope {
  return {
    minCalories: 0,
    maxCalories: 0,
    maxNetCarbsG: 0,
    minProteinG: 0,
    maxProteinG: 0,
    calorieFloor: Math.round(calorieTarget * (1 - ENERGY_TOLERANCE)),
    calorieCeiling: Math.round(calorieTarget * (1 + ENERGY_TOLERANCE)),
    carbCeilingG: JING_OPERATIONAL_CARB_CEILING_G,
    passes: false,
  }
}

export function buildGuidedPlan({
  profile,
  recipes,
  components,
}: {
  profile: NutritionProfile
  recipes: readonly RecipeVariant[]
  components: readonly CompletionComponent[]
}): GuidedPlan {
  const id = `SYN-PLAN-${profile.id}`
  const energyEstimate = estimateEnergyTarget(profile.energyInputs)
  const base = {
    id,
    source: 'synthetic_preview' as const,
    profile,
    energyEstimate,
    requiresHumanReview: true as const,
  }

  if (profile.phase !== 'Jing') {
    return {
      ...base,
      status: 'blocked_profile',
      groups: [],
      envelope: emptyEnvelope(profile.calorieTarget),
      reasons: ['The synthetic Preview library currently covers Jing only.'],
    }
  }

  if (
    energyEstimate.reviewRequired
    || profile.calorieTarget !== energyEstimate.targetCalories
    || profile.safetyReviewRequired
  ) {
    return {
      ...base,
      status: 'blocked_safety_review',
      groups: [],
      envelope: emptyEnvelope(profile.calorieTarget),
      reasons: [
        ...energyEstimate.reasons,
        ...(profile.calorieTarget !== energyEstimate.targetCalories
          ? ['The displayed calorie target does not match the calculated maintenance-minus-deficit target.']
          : []),
        ...(profile.safetyReviewRequired
          ? ['The synthetic profile is marked for human safety review.']
          : []),
      ],
    }
  }

  const configuration = mealConfiguration(profile)
  if (!configuration) {
    return {
      ...base,
      status: 'blocked_profile',
      groups: [],
      envelope: emptyEnvelope(profile.calorieTarget),
      reasons: ['The Preview supports exactly two or three meals.'],
    }
  }

  const usedFamilies = new Set<string>()
  const groups = profile.mealSlots.map((slot, index): ChoiceGroup => {
    const targetCalories = Math.round(profile.calorieTarget * configuration.weights[index])
    const carbBudgetG = configuration.carbBudgets[index]
    const candidates = buildCandidatePlates({
      profile,
      slot,
      targetCalories,
      carbBudgetG,
      recipes,
      components,
    })
    const options = selectOptions(
      candidates,
      usedFamilies,
      energyEstimate.proteinCeilingG * configuration.weights[index],
    )
    options.forEach(option => usedFamilies.add(option.familyId))
    return { slot, targetCalories, carbBudgetG, options }
  })
  const envelope = envelopeForGroups(groups, profile.calorieTarget)
  const hasThreeChoicesPerMeal = groups.every(group => group.options.length === MAX_OPTIONS_PER_GROUP)
  const reasons: string[] = []

  if (groups.some(group => group.options.length === 0)) {
    reasons.push('At least one meal does not have a compatible option.')
  }
  if (!envelope.passes) {
    reasons.push('The complete choice envelope does not satisfy the approved energy and Jing limits.')
  }
  if (groups.some(group => group.options.length < MAX_OPTIONS_PER_GROUP)) {
    reasons.push('At least one meal has fewer than three equivalent options.')
  }
  if (groups.some(group => group.options.some(option => option.conditional))) {
    reasons.push('At least one choice contains a conditional higher-energy portion and requires human review.')
  }
  if (profile.safetyReviewRequired) {
    reasons.push('The synthetic profile is marked for human safety review.')
  }
  if (envelope.minProteinG < energyEstimate.proteinFloorG || envelope.maxProteinG > energyEstimate.proteinCeilingG) {
    reasons.push('At least one daily combination falls outside the goal-weight protein review range.')
  }

  return {
    ...base,
    status: envelope.passes && hasThreeChoicesPerMeal ? 'ready_for_review' : 'insufficient_library',
    groups,
    envelope,
    reasons,
  }
}
