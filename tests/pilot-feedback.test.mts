import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { feedbackReportName, parsePilotFeedbackInput } from '../lib/pilot-feedback.ts'

const validProblem = {
  tool: 'Recetas del refrigerador',
  rating: 'Problema',
  category: 'Ingredientes incorrectos',
  comment: 'Confundió tortillas con pan.',
  context: '{"response":"Sándwich"}',
  responseId: '123e4567-e89b-12d3-a456-426614174000',
  language: 'ES',
}

test('accepts structured pilot feedback and trims bounded text', () => {
  const parsed = parsePilotFeedbackInput({ ...validProblem, comment: '  Necesita revisión.  ' })
  assert.ok(parsed)
  assert.equal(parsed.comment, 'Necesita revisión.')
  assert.equal(parsed.category, 'Ingredientes incorrectos')
})

test('accepts a general My AQSLIM surface report', () => {
  const parsed = parsePilotFeedbackInput({ ...validProblem, tool: 'My AQSLIM', category: 'Difícil de usar' })
  assert.ok(parsed)
  assert.equal(parsed.tool, 'My AQSLIM')
})

test('requires a category for a reported problem', () => {
  assert.equal(parsePilotFeedbackInput({ ...validProblem, category: '' }), null)
  assert.ok(parsePilotFeedbackInput({ ...validProblem, rating: 'Funcionó', category: '' }))
})

test('rejects unknown tools, categories, languages, and response IDs', () => {
  assert.equal(parsePilotFeedbackInput({ ...validProblem, tool: 'Unknown' }), null)
  assert.equal(parsePilotFeedbackInput({ ...validProblem, category: 'Unsafe value' }), null)
  assert.equal(parsePilotFeedbackInput({ ...validProblem, language: 'FR' }), null)
  assert.equal(parsePilotFeedbackInput({ ...validProblem, responseId: 'bad id' }), null)
})

test('creates a concise report name without patient information', () => {
  const parsed = parsePilotFeedbackInput(validProblem)
  assert.ok(parsed)
  assert.equal(
    feedbackReportName(parsed, new Date('2026-08-18T17:30:00.000Z')),
    'Problema · Recetas del refrigerador · 2026-08-18 17:30',
  )
})

test('integrates permanent feedback access into the pilot home and all four tools', async () => {
  const [pilot, chat, scanner, restaurant, fridge] = await Promise.all([
    readFile(new URL('../app/my-aqslim/pilot/pilot-view.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/chat-widget.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/food-scanner/scanner-client.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/my-aqslim/pilot/restaurant/restaurant-advisor.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/my-aqslim/pilot/fridge/fridge-recipes.tsx', import.meta.url), 'utf8'),
  ])
  assert.match(pilot, /tool="My AQSLIM"/)
  assert.match(pilot, /standalone/)
  assert.match(chat, /tool="AQ Buddy"/)
  assert.match(chat, /standalone/)
  assert.match(scanner, /tool="Escáner de alimentos"/)
  assert.match(scanner, /standalone/)
  assert.match(restaurant, /tool="Asesor de restaurantes"/)
  assert.match(restaurant, /standalone/)
  assert.match(fridge, /tool="Recetas del refrigerador"/)
  assert.match(fridge, /standalone/)
})
