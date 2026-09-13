import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isRestaurantAdvisorResult,
  isSpecificRestaurantMenuItemLabel,
  parseRestaurantAdvisorJson,
} from '../lib/restaurant-advisor.ts'

const validResult = {
  best: { item: 'Herb-Grilled Salmon', reason: 'Proteína sencilla', modification: 'Pide vegetales sin almidón' },
  adjusted: { item: 'Grilled Chicken Margherita', reason: 'Puede funcionar con ajustes', modification: 'Pide menos queso y confirma la guarnición' },
  avoid: { item: 'Chicken Alfredo', reason: 'Salsa cremosa y pasta', modification: 'Prefiere una preparación a la parrilla' },
  confidenceNote: 'Los ingredientes y porciones pueden variar.',
}

test('accepts a complete, non-empty restaurant analysis', () => {
  assert.equal(isRestaurantAdvisorResult(validResult), true)
})

test('rejects missing, empty, or malformed recommendation fields', () => {
  assert.equal(isRestaurantAdvisorResult({ ...validResult, confidenceNote: '' }), false)
  assert.equal(isRestaurantAdvisorResult({ ...validResult, best: { ...validResult.best, item: '   ' } }), false)
  assert.equal(isRestaurantAdvisorResult({ ...validResult, avoid: null }), false)
})

test('rejects vague or invented-style menu item labels', () => {
  assert.equal(isSpecificRestaurantMenuItemLabel('Herb-Grilled Salmon'), true)
  assert.equal(isSpecificRestaurantMenuItemLabel('Menu partially unreadable'), true)
  assert.equal(isSpecificRestaurantMenuItemLabel('Menú parcialmente ilegible'), true)
  assert.equal(isSpecificRestaurantMenuItemLabel('Carne Asada or similar grilled meat entrée'), false)
  assert.equal(isSpecificRestaurantMenuItemLabel('Amazing Alfredos section'), false)
  assert.equal(isSpecificRestaurantMenuItemLabel('breaded/fried items visible in menu'), false)
  assert.equal(isRestaurantAdvisorResult({
    ...validResult,
    adjusted: { ...validResult.adjusted, item: 'Carne Asada or similar grilled meat entrée' },
  }), false)
})

test('parses clean, fenced, or wrapped restaurant JSON', () => {
  const raw = JSON.stringify(validResult)
  assert.deepEqual(parseRestaurantAdvisorJson(raw), validResult)
  assert.deepEqual(parseRestaurantAdvisorJson('```json\n' + raw + '\n```'), validResult)
  assert.deepEqual(parseRestaurantAdvisorJson(`Menu analysis:\n${raw}\nDone.`), validResult)
  assert.equal(parseRestaurantAdvisorJson('{"best":'), null)
  assert.equal(parseRestaurantAdvisorJson(''), null)
})
