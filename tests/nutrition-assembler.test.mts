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
  SYNTHETIC_PERSONALIZATION_PROFILES,
} from '../lib/nutrition/fixtures.ts'
import { estimateEnergyTarget } from '../lib/nutrition/energy.ts'
import type { NutritionProfile } from '../lib/nutrition/types.ts'
import { planContainsBlockedFood, validateEveryCombination } from '../lib/nutrition/validation.ts'
import {
  APPROXIMATE_PALM_OUNCES,
  buildShoppingList,
  buildWeeklyRotation,
  formatShoppingQuantity,
  rotationFrequency,
  swapWeeklyRotationEntry,
  weeklyRotationKey,
} from '../lib/nutrition/weekly-capsule.ts'

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

test('a high-weight profile uses maintenance minus deficit instead of a 2,000 kcal ceiling', () => {
  const marco = SYNTHETIC_PERSONALIZATION_PROFILES.find(profile => profile.firstName === 'Marco')
  assert.ok(marco)
  const estimate = estimateEnergyTarget(marco.energyInputs)
  const plan = build(marco)

  assert.equal(marco.energyInputs.currentWeightKg, 172.4)
  assert.equal(estimate.maintenanceCalories, 3_038)
  assert.equal(estimate.targetCalories, 2_400)
  assert.equal(estimate.appliedDeficitCalories, 638)
  assert.equal(plan.status, 'ready_for_review')
  assert.deepEqual(plan.groups.map(group => group.options.length), [3, 3])
  assert.equal(planContainsBlockedFood(plan, 'fish'), false)
  assert.ok(plan.envelope.minProteinG >= estimate.proteinFloorG)
  assert.ok(plan.envelope.maxProteinG <= estimate.proteinCeilingG)
  assert.deepEqual(validateEveryCombination(plan), [])
})

test('tampered targets and excessive requested deficits stop for safety review', () => {
  const tampered = build({ ...SYNTHETIC_GUIDED_PROFILE, calorieTarget: 2_000 })
  assert.equal(tampered.status, 'blocked_safety_review')
  assert.equal(tampered.groups.length, 0)

  const energyInputs = { ...SYNTHETIC_GUIDED_PROFILE.energyInputs, requestedDeficitCalories: 900 }
  const excessiveDeficit = build({
    ...SYNTHETIC_GUIDED_PROFILE,
    energyInputs,
    calorieTarget: estimateEnergyTarget(energyInputs).targetCalories,
  })
  assert.equal(excessiveDeficit.status, 'blocked_safety_review')
  assert.equal(excessiveDeficit.groups.length, 0)
})

test('the automatic personalization proof changes safely across four synthetic profiles', () => {
  const plans = SYNTHETIC_PERSONALIZATION_PROFILES.map(build)
  assert.deepEqual(
    plans.map(plan => [plan.profile.firstName, plan.profile.calorieTarget, plan.profile.mealSlots.length, plan.status]),
    [
      ['Elena', 1_400, 3, 'ready_for_review'],
      ['Rom', 1_600, 2, 'ready_for_review'],
      ['Sofía', 1_800, 3, 'ready_for_review'],
      ['Marco', 2_400, 2, 'ready_for_review'],
    ],
  )

  const dairyFreePlan = plans.find(plan => plan.profile.firstName === 'Sofía')
  assert.ok(dairyFreePlan)
  assert.equal(planContainsBlockedFood(dairyFreePlan, 'dairy'), false)
  assert.equal(planContainsBlockedFood(dairyFreePlan, 'oaxaca cheese'), false)
  assert.equal(dairyFreePlan.groups[0].slot, 'first_meal')
  assert.equal(dairyFreePlan.groups[0].options.length, 3)

  const highTargetPlan = plans.find(plan => plan.profile.firstName === 'Marco')
  assert.ok(highTargetPlan)
  assert.deepEqual(highTargetPlan.groups.map(group => group.options.length), [3, 3])
  assert.equal(highTargetPlan.envelope.passes, true)
})

test('the weekly capsule keeps at most three choices per meal and plans seven days', () => {
  const sofia = SYNTHETIC_PERSONALIZATION_PROFILES.find(profile => profile.firstName === 'Sofía')
  assert.ok(sofia)
  const plan = build(sofia)
  const rotation = buildWeeklyRotation(plan, {})

  assert.equal(plan.groups.every(group => group.options.length <= 3), true)
  assert.equal(rotation.length, 21)
  for (const group of plan.groups) {
    assert.equal(rotation.filter(entry => entry.slot === group.slot).length, 7)
  }
})

test('favorites lead the rotation and do-not-repeat recipes leave the grocery list', () => {
  const sofia = SYNTHETIC_PERSONALIZATION_PROFILES.find(profile => profile.firstName === 'Sofía')
  assert.ok(sofia)
  const plan = build(sofia)
  const firstMeal = plan.groups.find(group => group.slot === 'first_meal')
  assert.ok(firstMeal)
  const favorite = firstMeal.options.find(option => option.familyId === 'PIL-J02')
  const avoided = firstMeal.options.find(option => option.familyId === 'PIL-J05')
  assert.ok(favorite)
  assert.ok(avoided)

  const rotation = buildWeeklyRotation(plan, {
    [favorite.familyId]: 'favorite',
    [avoided.familyId]: 'avoid',
  })
  const frequency = rotationFrequency(rotation)
  const shoppingList = buildShoppingList(rotation)

  assert.equal(rotation.some(entry => entry.option.familyId === avoided.familyId), false)
  assert.equal(frequency[weeklyRotationKey('first_meal', favorite.id)], 4)
  assert.equal(shoppingList.some(item => item.ingredient === 'tilapia'), false)
  assert.equal(shoppingList.every(item => item.mealUses >= 2), true)
})

test('changing one calendar meal swaps days without changing frequencies or groceries', () => {
  const sofia = SYNTHETIC_PERSONALIZATION_PROFILES.find(profile => profile.firstName === 'Sofía')
  assert.ok(sofia)
  const plan = build(sofia)
  const rotation = buildWeeklyRotation(plan, { 'PIL-J04': 'favorite' })
  const monday = rotation.find(entry => entry.dayIndex === 0 && entry.slot === 'first_meal')
  assert.ok(monday)
  const beforeFrequency = rotationFrequency(rotation)
  const beforeShopping = buildShoppingList(rotation)

  const result = swapWeeklyRotationEntry(rotation, monday.dayIndex, monday.slot)
  const changedMonday = result.rotation.find(entry => entry.dayIndex === 0 && entry.slot === 'first_meal')
  assert.notEqual(result.swappedDayIndex, null)
  assert.ok(changedMonday)
  assert.notEqual(changedMonday.option.id, monday.option.id)
  assert.deepEqual(rotationFrequency(result.rotation), beforeFrequency)
  assert.deepEqual(buildShoppingList(result.rotation), beforeShopping)

  const secondResult = swapWeeklyRotationEntry(result.rotation, monday.dayIndex, monday.slot)
  const secondMonday = secondResult.rotation.find(entry => entry.dayIndex === 0 && entry.slot === 'first_meal')
  assert.ok(secondMonday)
  assert.notEqual(secondMonday.option.id, changedMonday.option.id)
  assert.notEqual(secondMonday.option.id, monday.option.id)
  assert.deepEqual(rotationFrequency(secondResult.rotation), beforeFrequency)
  assert.deepEqual(buildShoppingList(secondResult.rotation), beforeShopping)
})

test('a calendar meal cannot change when its slot has only one compatible recipe', () => {
  const option = SYNTHETIC_PERSONALIZATION_PROFILES[0]
  const plan = build(option)
  assert.equal(plan.status, 'ready_for_review')
  if (plan.status !== 'ready_for_review') return
  const only = plan.groups[0].options[0]
  const rotation = Array.from({ length: 7 }, (_, dayIndex) => ({ dayIndex, slot: plan.groups[0].slot, option: only }))
  const result = swapWeeklyRotationEntry(rotation, 0, plan.groups[0].slot)

  assert.equal(result.swappedDayIndex, null)
  assert.deepEqual(result.rotation, rotation)
})

test('the grocery list converts the approved household portions into rounded purchase quantities', () => {
  const sofia = SYNTHETIC_PERSONALIZATION_PROFILES.find(profile => profile.firstName === 'Sofía')
  assert.ok(sofia)
  const plan = build(sofia)
  const rotation = buildWeeklyRotation(plan, { 'PIL-J04': 'favorite', 'PIL-J05': 'avoid' })
  const shoppingList = buildShoppingList(rotation)
  const item = (ingredient: string) => shoppingList.find(entry => entry.ingredient === ingredient)

  assert.equal(APPROXIMATE_PALM_OUNCES, 4)
  assert.equal(formatShoppingQuantity(item('sirloin')!, 'es'), '≈ 4.25 lb')
  assert.equal(formatShoppingQuantity(item('tuna')!, 'es'), '8 latas')
  assert.equal(formatShoppingQuantity(item('egg')!, 'es'), '18 huevos · paquete de 18')
  assert.equal(formatShoppingQuantity(item('chicken')!, 'es'), '≈ 1.25 lb')
  assert.equal(formatShoppingQuantity(item('ground beef')!, 'es'), '≈ 1.25 lb')
  assert.equal(formatShoppingQuantity(item('cauliflower')!, 'es'), '2 cabezas medianas')
  assert.equal(formatShoppingQuantity(item('romaine')!, 'es'), '2 corazones de lechuga')
  assert.equal(shoppingList.length, 13)
  assert.equal(shoppingList.every(entry => entry.quantity > 0), true)
})

test('the Preview supports exactly two or three actual meals without forcing a snack', () => {
  const invalid = build({ ...SYNTHETIC_GUIDED_PROFILE, mealSlots: ['dinner'] })
  assert.equal(invalid.status, 'blocked_profile')

  const threeMealProfile: NutritionProfile = {
    ...SYNTHETIC_PERSONALIZATION_PROFILES[0],
    id: 'SYN-JING-THREE-001',
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
