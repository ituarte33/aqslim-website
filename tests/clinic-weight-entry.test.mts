import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildClinicWeightHistory,
  CLINIC_WEIGHT_UPDATE_TYPE,
  clinicWeightEntryMatches,
  clinicWeightInKg,
  normalizeClinicWeightEntry,
  summarizeClinicWeights,
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

test('converts the latest recorded weight to the kilograms used by Clinic plans', () => {
  assert.equal(clinicWeightInKg(184.5, 'lb'), 83.7)
  assert.equal(clinicWeightInKg(83.68, 'kg'), 83.7)
})

test('summarizes one weight without inventing an accumulated change', () => {
  assert.deepEqual(summarizeClinicWeights([
    { weight: 184.5, weightUnit: 'lb' },
  ]), { currentWeight: 184.5, currentUnit: 'lb', change: null, count: 1 })
})

test('calculates accumulated change in the latest weight unit', () => {
  assert.deepEqual(summarizeClinicWeights([
    { weight: 184.5, weightUnit: 'lb' },
    { weight: 90, weightUnit: 'kg' },
  ]), { currentWeight: 184.5, currentUnit: 'lb', change: -13.9, count: 2 })
})

test('ignores invalid weight records in the clinical summary', () => {
  assert.deepEqual(summarizeClinicWeights([
    { weight: null, weightUnit: 'lb' },
    { weight: 83.7, weightUnit: 'kg' },
    { weight: 900, weightUnit: 'lb' },
  ]), { currentWeight: 83.7, currentUnit: 'kg', change: null, count: 1 })
})

test('builds a chronological weight history in the latest unit', () => {
  assert.deepEqual(buildClinicWeightHistory([
    { weight: 184.5, weightUnit: 'lb', consultationDate: '2026-10-07', consultationAt: null },
    { weight: 90, weightUnit: 'kg', consultationDate: '2026-09-30', consultationAt: null },
  ]), [
    { date: '2026-09-30', weight: 198.4, unit: 'lb' },
    { date: '2026-10-07', weight: 184.5, unit: 'lb' },
  ])
})

test('uses the consultation timestamp date and excludes invalid history entries', () => {
  assert.deepEqual(buildClinicWeightHistory([
    { weight: null, weightUnit: 'lb', consultationDate: '2026-10-07', consultationAt: null },
    { weight: 83.7, weightUnit: 'kg', consultationDate: null, consultationAt: '2026-09-30T18:00:00.000Z' },
  ]), [
    { date: '2026-09-30', weight: 83.7, unit: 'kg' },
  ])
})
