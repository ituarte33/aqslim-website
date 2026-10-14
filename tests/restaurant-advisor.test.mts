import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isJingBestRestaurantItemLabel,
  isRestaurantAdvisorResult,
  isRestaurantAdvisorResultForPhase,
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
  assert.equal(isRestaurantAdvisorResultForPhase(validResult, 'Jing'), true)
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

test('prevents obvious high-risk composed dishes from being Jing best option', () => {
  assert.equal(isJingBestRestaurantItemLabel('Grilled Chicken Marsala'), true)
  assert.equal(isJingBestRestaurantItemLabel('Chicken Parmigiana'), false)
  assert.equal(isJingBestRestaurantItemLabel('Eggplant Parmesan'), false)
  assert.equal(isJingBestRestaurantItemLabel('Seafood Cannelloni'), false)
  assert.equal(isJingBestRestaurantItemLabel('Chicken Alfredo'), false)
  assert.equal(isJingBestRestaurantItemLabel('Lasagna Classico'), false)

  const parmigianaBest = {
    ...validResult,
    best: {
      item: 'Chicken Parmigiana',
      reason: 'Pollo con salsa',
      modification: 'Pide la salsa al lado',
    },
  }
  assert.equal(isRestaurantAdvisorResult(parmigianaBest), true)
  assert.equal(isRestaurantAdvisorResultForPhase(parmigianaBest, 'Jing'), false)
})

test('rejects Jing cheese overstatements', () => {
  const cheeseOverstatement = {
    ...validResult,
    adjusted: {
      ...validResult.adjusted,
      reason: 'El queso es apropiado en Jing si controlas la porción.',
    },
  }
  assert.equal(isRestaurantAdvisorResult(cheeseOverstatement), true)
  assert.equal(isRestaurantAdvisorResultForPhase(cheeseOverstatement, 'Jing'), false)
})

test('rejects unverified numeric nutrition estimates while allowing the governed Jing target', () => {
  const inventedEstimate = {
    ...validResult,
    adjusted: {
      ...validResult.adjusted,
      reason: 'Los tomates aportan ~3-4 g de carbohidratos y la salsa puede añadir más.',
    },
  }
  assert.equal(isRestaurantAdvisorResult(inventedEstimate), true)
  assert.equal(isRestaurantAdvisorResultForPhase(inventedEstimate, 'Jing'), false)

  const governedTarget = {
    ...validResult,
    best: {
      ...validResult.best,
      reason: 'Compatible con el objetivo gobernado de menos de 20 g de carbohidratos al día, sujeto a verificar ingredientes.',
    },
  }
  assert.equal(isRestaurantAdvisorResultForPhase(governedTarget, 'Jing'), true)
})

test('parses clean, fenced, or wrapped restaurant JSON', () => {
  const raw = JSON.stringify(validResult)
  assert.deepEqual(parseRestaurantAdvisorJson(raw), validResult)
  assert.deepEqual(parseRestaurantAdvisorJson('```json\n' + raw + '\n```'), validResult)
  assert.deepEqual(parseRestaurantAdvisorJson(`Menu analysis:\n${raw}\nDone.`), validResult)
  assert.equal(parseRestaurantAdvisorJson('{"best":'), null)
  assert.equal(parseRestaurantAdvisorJson(''), null)
})
