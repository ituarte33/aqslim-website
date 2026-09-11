import assert from 'node:assert/strict'
import test from 'node:test'
import { buildAQBuddyPortalContext } from '../lib/aq-buddy-portal-context.ts'

test('verified portal context exposes canonical phase and week when present', () => {
  const context = buildAQBuddyPortalContext({
    firstName: 'Test',
    language: 'es',
    phase: 'Jing',
    weekInPhase: 6,
    planName: 'Plan de prueba',
    calorieTarget: 1600,
    goalWeight: 185,
    unit: 'lb',
  })

  assert.match(context, /Current phase: Jing/)
  assert.match(context, /Week in current phase: 6/)
  assert.match(context, /Plan: Plan de prueba/)
  assert.match(context, /Calorie target: 1600/)
  assert.match(context, /Goal weight: 185/)
  assert.match(context, /Do not infer or invent any field that is not listed/)
})

test('missing phase is omitted rather than inferred', () => {
  const context = buildAQBuddyPortalContext({
    firstName: 'Test',
    weekInPhase: 6,
  })

  assert.equal(context.includes('Current phase:'), false)
  assert.match(context, /Week in current phase: 6/)
})

test('null portal returns no context block', () => {
  assert.equal(buildAQBuddyPortalContext(null), '')
})
