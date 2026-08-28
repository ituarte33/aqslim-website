import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCandidatePlates,
  buildGuidedPlan,
  JING_OPERATIONAL_CARB_CEILING_G,
} from '../lib/nutrition/assembler.ts'
import {
  JING_COMPLETION_COMPONENTS,
  JING_RECIPE_VARIANTS,
  SYNTHETIC_GUIDED_PROFILE,
} from '../lib/nutrition/fixtures.ts'
import type { NutritionProfile } from '../lib/nutrition/types.ts'
import { planContainsBlockedFood, validateEveryCombination } from '../lib/nutrition/validation.ts'

function build(profile: NutritionProfile) {
  return buildGuidedPlan({
    profile,
    recipes: JING_RECIPE_VARIANTS,
    components: JING_COMPLETION_COMPONENTS,
  })
}

test('builds a two-meal Jing choice envelope with three options per meal', () => {
  const plan = build(SYNTHETIC_GUIDED_PROFILE)
  assert.equal(plan.status, 'ready_for_review')
  assert.equal(plan.requiresHumanReview, true)
  assert.deepEqual(plan.groups.map(group => group.slot), ['lunch', 'dinner'])
  assert.deepEqual(plan.groups.map(group => group.options.length), [3, 3])
  assert.equal(plan.envelope.passes, true)
  assert.ok(plan.envelope.maxNetCarbsG <= JING_OPERATIONAL_CARB_CEILING_G)
  assert.deepEqual(validateEveryCombination(plan), [])
})

test('every published plate uses no more than two integrated components', () => {
  const plan = build(SYNTHETIC_GUIDED_PROFILE)
  for (const group of plan.groups) {
    for (const option of group.options) assert.ok(option.componentIds.length <= 2)
  }
})

test('exclusions remove allergens and ingredients before preferences are scored', () => {
  const profile: NutritionProfile = {
    ...SYNTHETIC_GUIDED_PROFILE,
    preferredFoods: ['tilapia', 'oaxaca cheese'],
    excludedFoods: ['fish', 'dairy'],
  }
  const plan = build(profile)
  assert.equal(planContainsBlockedFood(plan, 'fish'), false)
  assert.equal(planContainsBlockedFood(plan, 'dairy'), false)
  assert.equal(planContainsBlockedFood(plan, 'oaxaca cheese'), false)
})

test('disliked food is not reintroduced by a high preference score', () => {
  const profile: NutritionProfile = {
    ...SYNTHETIC_GUIDED_PROFILE,
    preferredFoods: ['ground beef'],
    dislikedFoods: ['ground beef'],
  }
  const plan = build(profile)
  assert.equal(planContainsBlockedFood(plan, 'ground beef'), false)
})

test('2,000 kcal remains blocked with the synthetic pilot library', () => {
  const plan = build({ ...SYNTHETIC_GUIDED_PROFILE, calorieTarget: 2_000 })
  assert.equal(plan.status, 'blocked_high_target')
  assert.equal(plan.groups.length, 0)
  assert.equal(plan.envelope.passes, false)
})

test('the approved synthetic target matrix is deterministic', () => {
  const matrix: Array<{ calories: number; slots: NutritionProfile['mealSlots']; expected: string }> = [
    { calories: 1_200, slots: ['first_meal', 'lunch', 'dinner'], expected: 'ready_for_review' },
    { calories: 1_400, slots: ['first_meal', 'lunch', 'dinner'], expected: 'ready_for_review' },
    { calories: 1_600, slots: ['lunch', 'dinner'], expected: 'ready_for_review' },
    { calories: 1_800, slots: ['first_meal', 'lunch', 'dinner'], expected: 'ready_for_review' },
    { calories: 2_000, slots: ['lunch', 'dinner'], expected: 'blocked_high_target' },
  ]

  for (const item of matrix) {
    const plan = build({ ...SYNTHETIC_GUIDED_PROFILE, calorieTarget: item.calories, mealSlots: item.slots })
    assert.equal(plan.status, item.expected, `${item.calories} kcal`)
    if (item.expected === 'ready_for_review') assert.deepEqual(validateEveryCombination(plan), [])
  }
})

test('the Preview supports exactly two or three actual meals without forcing a snack', () => {
  const invalid = build({ ...SYNTHETIC_GUIDED_PROFILE, mealSlots: ['dinner'] })
  assert.equal(invalid.status, 'blocked_profile')

  const threeMealProfile: NutritionProfile = {
    ...SYNTHETIC_GUIDED_PROFILE,
    id: 'SYN-JING-THREE-001',
    calorieTarget: 1_400,
    mealSlots: ['first_meal', 'lunch', 'dinner'],
  }
  const plan = build(threeMealProfile)
  assert.equal(plan.groups.length, 3)
  assert.equal(plan.groups.some(group => group.slot === ('snack' as never)), false)
})

test('draft and inactive recipes never enter candidate generation', () => {
  const recipe = JING_RECIPE_VARIANTS.find(item => item.id === 'PIL-J08-M')
  assert.ok(recipe)
  const candidates = buildCandidatePlates({
    profile: SYNTHETIC_GUIDED_PROFILE,
    slot: 'lunch',
    targetCalories: 800,
    carbBudgetG: 9,
    recipes: [
      { ...recipe, id: 'DRAFT', status: 'draft' },
      { ...recipe, id: 'INACTIVE', active: false },
    ],
    components: JING_COMPLETION_COMPONENTS,
  })
  assert.deepEqual(candidates, [])
})

test('conditional extra-protein components are never added automatically', () => {
  const plan = build(SYNTHETIC_GUIDED_PROFILE)
  const componentIds = plan.groups.flatMap(group => group.options.flatMap(option => option.componentIds))
  assert.equal(componentIds.some(id => id.startsWith('CT-J06')), false)
})
