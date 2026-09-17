import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeClinicWeightKg } from '../lib/clinic-plan-format.ts'

test('Clinic plan weights display at one decimal without changing empty values', () => {
  assert.equal(normalizeClinicWeightKg(83.91458845185656), 83.9)
  assert.equal(normalizeClinicWeightKg(102.6), 102.6)
  assert.equal(normalizeClinicWeightKg(null), null)
  assert.equal(normalizeClinicWeightKg(undefined), undefined)
})
