import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CLINIC_WEIGHT_UPDATE_TYPE,
  clinicWeightEntryMatches,
  normalizeClinicWeightEntry,
} from '../lib/clinic-weight-entry.ts'
import { isQualifyingClinicVisitType } from '../lib/clinic-visit-policy.ts'

test('normalizes a patient-reported weight in pounds or kilograms', () => {
  assert.deepEqual(normalizeClinicWeightEntry('184.26', 'lb'), { ok: true, weight: 184.3, unit: 'lb' })
  assert.deepEqual(normalizeClinicWeightEntry(83.6, 'kg'), { ok: true, weight: 83.6, unit: 'kg' })
})

test('rejects missing, unsupported, or implausible weight entries', () => {
  assert.deepEqual(normalizeClinicWeightEntry('', 'lb'), { ok: false, error: 'invalid_weight' })
  assert.deepEqual(normalizeClinicWeightEntry('184', 'stone'), { ok: false, error: 'invalid_weight' })
  assert.deepEqual(normalizeClinicWeightEntry('12', 'kg'), { ok: false, error: 'weight_out_of_range' })
  assert.deepEqual(normalizeClinicWeightEntry('900', 'lb'), { ok: false, error: 'weight_out_of_range' })
})

test('matches the exact persisted weight update after reload', () => {
  const entry = {
    consultationType: CLINIC_WEIGHT_UPDATE_TYPE,
    consultationDate: '2026-10-07',
    weight: 184.3,
    weightUnit: 'lb',
  }
  assert.equal(clinicWeightEntryMatches(entry, { date: '2026-10-07', weight: 184.3, unit: 'lb' }), true)
  assert.equal(clinicWeightEntryMatches(entry, { date: '2026-10-07', weight: 83.6, unit: 'kg' }), false)
})

test('a weight reply does not count as a completed clinical visit', () => {
  assert.equal(isQualifyingClinicVisitType(CLINIC_WEIGHT_UPDATE_TYPE), false)
})
