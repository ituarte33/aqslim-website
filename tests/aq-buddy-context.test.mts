import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildFoodScanContextPrompt,
  parseBuddyContextReference,
} from '../lib/aq-buddy-context.ts'

test('accepts only a narrow saved food-scan reference', () => {
  assert.deepEqual(
    parseBuddyContextReference({ type: 'food_scan', mealLogId: 'rec12345678901234' }),
    { type: 'food_scan', mealLogId: 'rec12345678901234' },
  )
  assert.equal(parseBuddyContextReference({ type: 'food_scan', mealLogId: 'not-a-record' }), null)
  assert.equal(parseBuddyContextReference({ type: 'food_scan', mealLogId: 'rec12345678901234', food: 'client supplied' }), null)
  assert.equal(parseBuddyContextReference({ type: 'other', mealLogId: 'rec12345678901234' }), null)
})

test('builds a grounded prompt with the saved meal and patient phase', () => {
  const prompt = buildFoodScanContextPrompt({
    food: 'Carnitas platter with rice and tortilla',
    calories: 1240,
    carbs: 78,
    fats: 62,
    proteins: 82,
    mealType: 'Lunch',
    planName: 'Kenkho Path — Jing',
    calorieTarget: 1800,
    phase: 'Jing',
    weekInPhase: 2,
    consumptionStatus: 'Unconfirmed',
    carbsLoggedToday: 84,
    carbsLoggedTodayExcludingCurrentMeal: 6,
  })

  assert.match(prompt, /Carnitas platter with rice and tortilla/)
  assert.match(prompt, /Approximate carbohydrates: 78 g/)
  assert.match(prompt, /Current AQSLIM phase: Jing/)
  assert.match(prompt, /Current AQSLIM plan: Kenkho Path — Jing/)
  assert.match(prompt, /Authorized daily calorie target: 1800 kcal/)
  assert.match(prompt, /including this saved meal: 84 g/)
  assert.match(prompt, /excluding this saved meal: 6 g/)
  assert.match(prompt, /Consumption status of this saved scan: Unconfirmed/)
  assert.match(prompt, /Never describe this saved scan as eaten unless/)
  assert.match(prompt, /For Jing, calculate against 20 g/)
  assert.match(prompt, /Do not add the original saved plate's carbohydrates again/)
  assert.match(prompt, /ask the user to confirm what they actually ate/)
  assert.match(prompt, /do not ask the user to upload or describe the same plate again/)
})

test('marks an unavailable phase explicitly instead of inventing one', () => {
  const prompt = buildFoodScanContextPrompt({
    food: 'Grilled chicken salad',
    calories: 500,
    carbs: 18,
    fats: 22,
    proteins: 52,
    mealType: null,
    planName: 'FAST 36 \+ Plan Hipocalórico',
    calorieTarget: null,
    phase: null,
    weekInPhase: null,
    consumptionStatus: 'Reference only',
    carbsLoggedToday: null,
    carbsLoggedTodayExcludingCurrentMeal: null,
  })

  assert.match(prompt, /Current AQSLIM phase: not available/)
  assert.match(prompt, /Authorized daily calorie target: not available/)
  assert.match(prompt, /provide conditional options without guessing/)
  assert.match(prompt, /including this saved meal: not available/)
})
