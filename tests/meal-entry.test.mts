import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyMealPortion,
  parseMealDescription,
  parseMealCorrection,
  parseMealPortion,
  parseMealType,
} from '../lib/meal-entry.ts'

test('accepts supported meal portions and rejects unsafe values', () => {
  assert.equal(parseMealPortion(25), 25)
  assert.equal(parseMealPortion('75'), 75)
  assert.equal(parseMealPortion(9), null)
  assert.equal(parseMealPortion(101), null)
  assert.equal(parseMealPortion(50.5), null)
})

test('normalizes ingredient corrections and rejects empty or oversized corrections', () => {
  assert.equal(parseMealCorrection('  No potatoes.  Chicken shawarma and Greek rice. '), 'No potatoes. Chicken shawarma and Greek rice.')
  assert.equal(parseMealCorrection('x'), null)
  assert.equal(parseMealCorrection('x'.repeat(701)), null)
})

test('normalizes manual meal descriptions and validates meal types', () => {
  assert.equal(parseMealDescription('  Rice Krispies   with 8 oz milk '), 'Rice Krispies with 8 oz milk')
  assert.equal(parseMealDescription('x'), null)
  assert.equal(parseMealType('Breakfast'), 'Breakfast')
  assert.equal(parseMealType('Brunch'), null)
})

test('scales the nutrition estimate to the amount the member plans to eat', () => {
  assert.deepEqual(applyMealPortion({
    food: 'Chicken bowl', calories: 503, carbs: 41, fats: 19, proteins: 38, notes: 'Estimate.',
  }, 50), {
    food: 'Chicken bowl', calories: 252, carbs: 21, fats: 10, proteins: 19, notes: 'Estimate.',
  })
})
