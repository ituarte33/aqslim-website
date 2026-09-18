import assert from 'node:assert/strict'
import test from 'node:test'
import { compareClinicPlans, getClinicPlanReadiness } from '../lib/clinic-plan-readiness.ts'

const complete = {
  planLabel: 'FAST 36 + Plan Hipocalórico',
  treatmentStart: '2026-09-01',
  phase: 'Jing',
  phaseWeek: 3,
  phaseStart: '2026-09-01',
  calorieTarget: null,
  dietName: 'Plan Hipocalórico',
  specialInstructions: 'Seguir indicaciones clínicas.',
  kenkhoTier: 'Clinic',
  visitCadenceDays: 7,
  startingWeightKg: 102.6,
  currentWeightKg: 98.8,
  goalWeightKg: 83.9,
}

test('Clinic plan readiness requires the complete clinical handoff', () => {
  const result = getClinicPlanReadiness(complete)
  assert.equal(result.ready, true)
  assert.equal(result.checks.every(check => check.passed), true)

  const blocked = getClinicPlanReadiness({ ...complete, phase: 'Sin fase', goalWeightKg: null })
  assert.equal(blocked.ready, false)
  assert.deepEqual(blocked.checks.filter(check => !check.passed).map(check => check.key), ['phase', 'weights'])
  assert.equal(getClinicPlanReadiness({ ...complete, phaseStart: 'mañana' }).ready, false)
})

test('Calories remain optional but must be positive when defined', () => {
  assert.equal(getClinicPlanReadiness(complete).ready, true)
  assert.equal(getClinicPlanReadiness({ ...complete, calorieTarget: 0 }).ready, false)
  assert.equal(getClinicPlanReadiness({ ...complete, calorieTarget: 1600 }).ready, true)
})

test('Clinic plan comparison identifies only changed delivery fields', () => {
  const comparison = compareClinicPlans(complete, { ...complete, phaseWeek: 4, currentWeightKg: 97.5 })
  assert.deepEqual(comparison.filter(field => field.changed).map(field => field.key), ['phaseWeek', 'currentWeightKg'])
  assert.equal(comparison.find(field => field.key === 'currentWeightKg')?.draft, '97.5 kg')
})
