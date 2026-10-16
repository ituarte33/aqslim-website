import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveClinicCadence, sameClinicAppointment, suggestClinicAppointment, toClinicDateTimeLocal } from '../lib/clinic-scheduling.ts'

test('uses a valid plan cadence before the standard fallback', () => {
  assert.deepEqual(resolveClinicCadence(10), {
    days: 10,
    source: 'plan',
    label: 'Plan Clinic: 10 días',
  })
})

test('uses the seven-day standard when plan cadence is missing or invalid', () => {
  assert.deepEqual(resolveClinicCadence(null), {
    days: 7,
    source: 'standard',
    label: 'Presencial estándar: 7 días',
  })
  assert.equal(resolveClinicCadence(-2).days, 7)
  assert.equal(resolveClinicCadence(4.5).days, 7)
})

test('suggests a local appointment from the consultation date', () => {
  const now = new Date(2026, 8, 18, 14, 12, 0)
  assert.equal(suggestClinicAppointment('2026-09-18', 7, now), '2026-09-25T14:10')
})

test('handles month boundaries without parsing the date as UTC', () => {
  const now = new Date(2026, 0, 1, 9, 58, 0)
  assert.equal(suggestClinicAppointment('2026-01-29', 7, now), '2026-02-05T10:00')
})

test('verifies a persisted appointment by instant', () => {
  assert.equal(sameClinicAppointment('2026-09-27T20:35:00.000Z', '2026-09-27T20:35:20.000Z'), true)
  assert.equal(sameClinicAppointment('2026-09-27T20:35:00.000Z', '2026-09-24T20:35:00.000Z'), false)
  assert.equal(sameClinicAppointment('', '2026-09-27T20:35:00.000Z'), false)
})

test('restores a persisted appointment into the local date-time field', () => {
  const localAppointment = new Date(2026, 8, 27, 20, 45, 0)
  assert.equal(toClinicDateTimeLocal(localAppointment.toISOString()), '2026-09-27T20:45')
  assert.equal(toClinicDateTimeLocal('not-a-date'), '')
})
