import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canonicalFridgePhase,
  fridgePhaseInstruction,
  ingredientTextToList,
  isFridgeDetectionResult,
  isFridgeRecipeGenerationResult,
  normalizeIngredientList,
  parseModelJson,
} from '../lib/fridge-recipes.ts'

const recipe = {
  name: 'Huevos con carne y tortilla',
  summary: 'Una comida sencilla usando los ingredientes confirmados.',
  ingredients: [
    { item: 'huevos', amount: '2' },
    { item: 'tortilla', amount: '1' },
  ],
  optionalExtras: ['sal'],
  steps: ['Calienta la carne.', 'Agrega los huevos y sirve con la tortilla.'],
  minutes: 15,
  servings: 1,
  phaseFit: 'Compatibility is pending phase confirmation.',
}

const validDetection = {
  observedIngredients: ['huevos', 'tortillas'],
  uncertainItems: ['recipiente sin etiqueta'],
  confidenceNote: 'Los huevos son claramente visibles.',
}

const validGeneration = {
  recipes: [recipe, { ...recipe, name: 'Tacos de huevo' }, { ...recipe, name: 'Revuelto rápido' }],
  confidenceNote: 'Las recetas se basan en la lista confirmada.',
  safetyNote: 'Verifica fechas y cocina completamente los huevos.',
}

test('accepts a concise detection independently from recipe generation', () => {
  assert.equal(isFridgeDetectionResult(validDetection), true)
  assert.equal(isFridgeDetectionResult({ ...validDetection, observedIngredients: [] }), true)
  assert.equal(isFridgeDetectionResult({ ...validDetection, confidenceNote: '' }), false)
})

test('accepts exactly three complete generated recipes', () => {
  assert.equal(isFridgeRecipeGenerationResult(validGeneration), true)
  assert.equal(isFridgeRecipeGenerationResult({
    ...validGeneration,
    recipes: validGeneration.recipes.map(item => ({ ...item, ingredients: [{ item: 'huevos', amount: '2' }] })),
  }), true)
  assert.equal(isFridgeRecipeGenerationResult({ ...validGeneration, recipes: [recipe, recipe] }), false)
  assert.equal(isFridgeRecipeGenerationResult({ ...validGeneration, recipes: [{ ...recipe, minutes: -1 }, recipe, recipe] }), false)
  assert.equal(isFridgeRecipeGenerationResult({ ...validGeneration, safetyNote: '' }), false)
})

test('parses clean or fenced JSON and rejects truncated output', () => {
  assert.deepEqual(parseModelJson('{"ok":true}'), { ok: true })
  assert.deepEqual(parseModelJson('```json\n{"ok":true}\n```'), { ok: true })
  assert.deepEqual(parseModelJson('Result: {"ok":true}'), { ok: true })
  assert.equal(parseModelJson('{"ok":'), null)
})

test('normalizes visual and patient-entered ingredients without duplicates', () => {
  assert.deepEqual(
    normalizeIngredientList([' Huevos ', 'huevos', 'Tortillas', null, 'carne   deshebrada']),
    ['Huevos', 'Tortillas', 'carne deshebrada'],
  )
  assert.deepEqual(
    ingredientTextToList('carne deshebrada, tortillas; huevos\nqueso'),
    ['carne deshebrada', 'tortillas', 'huevos', 'queso'],
  )
})

test('uses only a canonical confirmed phase and otherwise requires confirmation', () => {
  assert.match(fridgePhaseInstruction('Jing'), /less than 20 g/)
  assert.match(fridgePhaseInstruction('Qi'), /25–45 g/)
  assert.match(fridgePhaseInstruction(null), /No nutritional phase is confirmed/)
  assert.match(fridgePhaseInstruction('FAST 36'), /No nutritional phase is confirmed/)
  assert.equal(canonicalFridgePhase('Yang Sheng'), 'Yang Sheng')
  assert.equal(canonicalFridgePhase('FAST 36'), null)
})
