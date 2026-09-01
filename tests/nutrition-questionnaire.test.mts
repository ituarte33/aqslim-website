import assert from 'node:assert/strict'
import test from 'node:test'
import { buildGuidedPlan } from '../lib/nutrition/assembler.ts'
import { JING_COMPLETION_COMPONENTS, JING_RECIPE_VARIANTS } from '../lib/nutrition/fixtures.ts'
import {
  buildSyntheticQuestionnaireProfile,
  type SyntheticQuestionnaireAnswers,
} from '../lib/nutrition/questionnaire-profile.ts'
import { planContainsBlockedFood, validateEveryCombination } from '../lib/nutrition/validation.ts'

const BASE: SyntheticQuestionnaireAnswers = {
  ageYears: 45,
  equationSex: 'female',
  heightFeet: 5,
  heightInches: 5,
  currentWeightLb: 220,
  goalWeightLb: 170,
  activityLevel: 'sedentary',
  mealCount: 3,
  preferredFoods: ['chicken', 'tilapia'],
  dislikedFoods: ['pork'],
  excludedFoods: [],
  medicationReview: 'none',
}

function generate(answers: SyntheticQuestionnaireAnswers) {
  const result = buildSyntheticQuestionnaireProfile(answers)
  assert.ok(result.profile)
  return buildGuidedPlan({
    profile: result.profile,
    recipes: JING_RECIPE_VARIANTS,
    components: JING_COMPLETION_COMPONENTS,
  })
}

test('a 380 lb synthetic profile receives maintenance minus 500 without a 2,000 kcal ceiling', () => {
  const plan = generate({
    ...BASE,
    ageYears: 60,
    equationSex: 'male',
    heightFeet: 5,
    heightInches: 10,
    currentWeightLb: 380,
    goalWeightLb: 240,
    mealCount: 2,
    preferredFoods: ['chicken', 'sirloin'],
    dislikedFoods: ['fish'],
  })

  assert.equal(plan.profile.energyInputs.requestedDeficitCalories, 500)
  assert.equal(plan.energyEstimate.maintenanceCalories, 3_050)
  assert.equal(plan.profile.calorieTarget, 2_550)
  assert.equal(plan.energyEstimate.appliedDeficitCalories, 500)
  assert.equal(plan.energyEstimate.maintenanceCalories - plan.profile.calorieTarget, plan.energyEstimate.appliedDeficitCalories)
  assert.equal(plan.status, 'ready_for_review')
  assert.deepEqual(plan.groups.map(group => group.options.length), [3, 3])
  assert.deepEqual(validateEveryCombination(plan), [])
})

test('a dairy-free three-meal questionnaire produces three safe choices per meal', () => {
  const plan = generate({ ...BASE, excludedFoods: ['dairy'], dislikedFoods: ['pork'] })

  assert.equal(plan.status, 'ready_for_review')
  assert.deepEqual(plan.groups.map(group => group.options.length), [3, 3, 3])
  assert.equal(planContainsBlockedFood(plan, 'dairy'), false)
  assert.equal(planContainsBlockedFood(plan, 'oaxaca cheese'), false)
})

test('a medication review flag stops generation before any choices are shown', () => {
  const plan = generate({ ...BASE, medicationReview: 'required' })

  assert.equal(plan.status, 'blocked_safety_review')
  assert.deepEqual(plan.groups, [])
})

test('strict exclusions override dislikes and preferences', () => {
  const result = buildSyntheticQuestionnaireProfile({
    ...BASE,
    preferredFoods: ['egg', 'chicken'],
    dislikedFoods: ['egg'],
    excludedFoods: ['egg'],
  })

  assert.ok(result.profile)
  assert.deepEqual(result.profile.excludedFoods, ['egg'])
  assert.equal(result.profile.dislikedFoods.includes('egg'), false)
  assert.equal(result.profile.preferredFoods.includes('egg'), false)
})

test('invalid goals are rejected without creating a profile', () => {
  const result = buildSyntheticQuestionnaireProfile({ ...BASE, goalWeightLb: 220 })

  assert.equal(result.profile, null)
  assert.deepEqual(result.errors, ['invalid_goal_weight'])
})

test('an incomplete three-choice library remains stopped for review', () => {
  const result = buildSyntheticQuestionnaireProfile({ ...BASE, mealCount: 2 })
  assert.ok(result.profile)
  const reducedRecipes = JING_RECIPE_VARIANTS.filter(recipe => ['PIL-J04', 'PIL-J05'].includes(recipe.familyId))
  const plan = buildGuidedPlan({
    profile: result.profile,
    recipes: reducedRecipes,
    components: JING_COMPLETION_COMPONENTS,
  })

  assert.equal(plan.groups.some(group => group.options.length < 3), true)
  assert.equal(plan.status, 'insufficient_library')
})
