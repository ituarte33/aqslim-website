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
    phase: 'Jing',
    weekInPhase: 2,
  })

  assert.match(prompt, /Carnitas platter with rice and tortilla/)
  assert.match(prompt, /Approximate carbohydrates: 78 g/)
  assert.match(prompt, /Current AQSLIM phase: Jing/)
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
    phase: null,
    weekInPhase: null,
  })

  assert.match(prompt, /Current AQSLIM phase: not available/)
  assert.match(prompt, /provide conditional options without guessing/)
})
