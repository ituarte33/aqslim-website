import assert from 'node:assert/strict'
import test from 'node:test'
import { isFoodAnalysisConsistent, parseFoodAnalysis } from '../lib/food-analysis.ts'

const valid = {
  food: 'Carnitas con ensalada',
  calories: 720,
  carbs: 38,
  fats: 42,
  proteins: 48,
  notes: 'Estimación basada en la porción visible.',
  ingredients: [
    { name: 'Carnitas', calories: 570, carbs: 8, fats: 40, proteins: 44 },
    { name: 'Ensalada', calories: 150, carbs: 30, fats: 2, proteins: 4 },
  ],
}

test('accepts strict JSON food analysis', () => {
  assert.deepEqual(parseFoodAnalysis(JSON.stringify(valid)), valid)
})

test('rejects internally inconsistent ingredient nutrition math', () => {
  assert.equal(isFoodAnalysisConsistent(valid), true)
  assert.equal(isFoodAnalysisConsistent({
    ...valid,
    ingredients: [{ name: 'Arroz', calories: 70, carbs: 38, fats: 0, proteins: 2 }],
  }), false)
})

test('accepts JSON wrapped in a markdown fence', () => {
  assert.deepEqual(parseFoodAnalysis(`\`\`\`json\n${JSON.stringify(valid)}\n\`\`\``), valid)
})

test('extracts the JSON object when the model adds a short preface', () => {
  assert.deepEqual(parseFoodAnalysis(`Resultado aproximado:\n${JSON.stringify(valid)}`), valid)
})

test('rejects incomplete, negative, or non-JSON analysis', () => {
  assert.equal(parseFoodAnalysis('{"food":"Carnitas"}'), null)
  assert.equal(parseFoodAnalysis(JSON.stringify({ ...valid, carbs: -1 })), null)
  assert.equal(parseFoodAnalysis('No pude analizar la imagen.'), null)
})
