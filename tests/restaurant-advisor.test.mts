import assert from 'node:assert/strict'
import test from 'node:test'
import { isRestaurantAdvisorResult } from '../lib/restaurant-advisor.ts'

const validResult = {
  best: { item: 'Grilled salmon', reason: 'Simple protein', modification: 'Sauce on the side' },
  adjusted: { item: 'Chicken salad', reason: 'Compatible with an adjustment', modification: 'No croutons' },
  avoid: { item: 'Sweet pancakes', reason: 'High sugar preparation', modification: 'Ask for eggs instead' },
  confidenceNote: 'Ingredients and portions may vary.',
}

test('accepts a complete, non-empty restaurant analysis', () => {
  assert.equal(isRestaurantAdvisorResult(validResult), true)
})

test('rejects missing, empty, or malformed recommendation fields', () => {
  assert.equal(isRestaurantAdvisorResult({ ...validResult, confidenceNote: '' }), false)
  assert.equal(isRestaurantAdvisorResult({ ...validResult, best: { ...validResult.best, item: '   ' } }), false)
  assert.equal(isRestaurantAdvisorResult({ ...validResult, avoid: null }), false)
})
