import assert from 'node:assert/strict'
import test from 'node:test'
import { canonicalFridgePhase, fridgePhaseInstruction, isFridgeRecipeResult } from '../lib/fridge-recipes.ts'

const recipe = {
  name: 'Vegetable omelet',
  summary: 'A simple meal using the visible vegetables.',
  ingredients: [
    { item: 'eggs', amount: '4' },
    { item: 'spinach', amount: '2 cups' },
  ],
  optionalExtras: ['olive oil'],
  steps: ['Wash and cut the vegetables.', 'Cook the eggs and vegetables until done.'],
  minutes: 20,
  servings: 2,
  phaseFit: 'Compatibility is pending phase confirmation.',
}

const validResult = {
  observedIngredients: ['eggs', 'spinach'],
  uncertainItems: ['unlabeled container'],
  recipes: [recipe, { ...recipe, name: 'Egg salad' }, { ...recipe, name: 'Spinach cups' }],
  confidenceNote: 'Some labels are not visible.',
  safetyNote: 'Verify dates and cook eggs safely.',
}

test('accepts exactly three complete fridge recipes', () => {
  assert.equal(isFridgeRecipeResult(validResult), true)
})

test('rejects incomplete, excessive, or malformed recipe results', () => {
  assert.equal(isFridgeRecipeResult({ ...validResult, recipes: [recipe, recipe] }), false)
  assert.equal(isFridgeRecipeResult({ ...validResult, observedIngredients: [] }), false)
  assert.equal(isFridgeRecipeResult({ ...validResult, recipes: [{ ...recipe, minutes: -1 }, recipe, recipe] }), false)
  assert.equal(isFridgeRecipeResult({ ...validResult, safetyNote: '' }), false)
})

test('uses only a canonical confirmed phase and otherwise requires confirmation', () => {
  assert.match(fridgePhaseInstruction('Jing'), /less than 20 g/)
  assert.match(fridgePhaseInstruction('Qi'), /25–45 g/)
  assert.match(fridgePhaseInstruction(null), /No nutritional phase is confirmed/)
  assert.match(fridgePhaseInstruction('FAST 36'), /No nutritional phase is confirmed/)
  assert.equal(canonicalFridgePhase('Yang Sheng'), 'Yang Sheng')
  assert.equal(canonicalFridgePhase('FAST 36'), null)
})
