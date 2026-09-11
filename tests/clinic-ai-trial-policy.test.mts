import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clinicAiTrialWindowForEligibleVisit,
  isEligibleClinicAiTrialVisitType,
} from '../lib/clinic-ai-trial-policy.ts'

test('only Cliente Nuevo and Cliente Re-Inicio are eligible for Preview clinic AI trial', () => {
  assert.equal(isEligibleClinicAiTrialVisitType('Cliente Nuevo'), true)
  assert.equal(isEligibleClinicAiTrialVisitType('Cliente Re-Inicio'), true)
  assert.equal(isEligibleClinicAiTrialVisitType('Cliente subsecuente'), false)
  assert.equal(isEligibleClinicAiTrialVisitType('Suplementos'), false)
  assert.equal(isEligibleClinicAiTrialVisitType('Suplementos + Envio'), false)
})

test('eligible visit creates exactly a 30-day trial window', () => {
  assert.deepEqual(clinicAiTrialWindowForEligibleVisit({
    visitType: 'Cliente Re-Inicio',
    completedAt: new Date('2026-09-11T18:00:00Z'),
  }), {
    trialStarts: '2026-09-11T18:00:00.000Z',
    trialEnds: '2026-10-11T18:00:00.000Z',
  })
})

test('ineligible visit does not create a trial window', () => {
  assert.equal(clinicAiTrialWindowForEligibleVisit({
    visitType: 'Cliente subsecuente',
    completedAt: new Date('2026-09-11T18:00:00Z'),
  }), null)
})
