import { JING_OPERATIONAL_CARB_CEILING_G } from './assembler.ts'
import type { GuidedPlan, PlateOption } from './types'

function combinations(groups: GuidedPlan['groups']) {
  let result: PlateOption[][] = [[]]
  for (const group of groups) {
    result = result.flatMap(existing => group.options.map(option => [...existing, option]))
  }
  return result
}

export function validateEveryCombination(plan: GuidedPlan): string[] {
  const errors: string[] = []
  if (plan.groups.length !== plan.profile.mealSlots.length) {
    errors.push('meal_group_count_mismatch')
    return errors
  }
  if (plan.groups.some(group => group.options.length < 1 || group.options.length > 3)) {
    errors.push('invalid_group_size')
    return errors
  }

  const floor = plan.envelope.calorieFloor
  const ceiling = plan.envelope.calorieCeiling
  for (const choice of combinations(plan.groups)) {
    const calories = choice.reduce((sum, option) => sum + option.totals.calories, 0)
    const netCarbsG = choice.reduce((sum, option) => sum + option.totals.netCarbsG, 0)
    if (calories < floor || calories > ceiling) errors.push(`energy_outside_envelope:${choice.map(item => item.id).join('|')}`)
    if (netCarbsG > JING_OPERATIONAL_CARB_CEILING_G) errors.push(`jing_carbs_exceeded:${choice.map(item => item.id).join('|')}`)
  }

  return errors
}

export function planContainsBlockedFood(plan: GuidedPlan, blockedFood: string) {
  const normalized = blockedFood.trim().toLocaleLowerCase('en-US')
  return plan.groups.some(group => group.options.some(option => (
    option.ingredients.some(ingredient => ingredient.toLocaleLowerCase('en-US') === normalized)
    || option.allergens.some(allergen => allergen.toLocaleLowerCase('en-US') === normalized)
  )))
}
