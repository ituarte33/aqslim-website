import assert from 'node:assert/strict'
import test from 'node:test'
import { clinicAppointmentHeading, selectClinicAppointment, futureClinicAppointment, resolveClinicCadence, sameClinicAppointment, suggestClinicAppointment, toClinicDateTimeLocal } from '../lib/clinic-scheduling.ts'

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

test('a new consultation never restores an expired appointment', () => {
 const now = new Date(2026, 9, 23, 16, 20)
 assert.equal(futureClinicAppointment(new Date(2026, 9, 1, 20, 50).toISOString(), now), '')
 assert.equal(futureClinicAppointment(now.toISOString(), now), '')
 assert.equal(futureClinicAppointment('invalid', now), '')
 assert.equal(futureClinicAppointment(null, now), '')
 assert.equal(futureClinicAppointment(new Date(2026, 9, 30, 16, 20).toISOString(), now), '2026-10-30T16:20')
 assert.equal(suggestClinicAppointment('2026-10-23', 7, now), '2026-10-30T16:20')
})

test('past appointment labels never imply attendance or a future appointment', () => {
 const now = new Date('2026-10-24T12:00:00Z')
 assert.equal(clinicAppointmentHeading('2026-10-01T20:00:00Z', now), 'Cita preliminar pasada · Historial')
 assert.equal(clinicAppointmentHeading('2026-10-30T20:00:00Z', now), 'Próxima consulta preliminar')
 assert.equal(clinicAppointmentHeading('invalid', now), 'Fecha de cita por confirmar')
})
test('overview prefers the nearest future appointment, otherwise the most recent historical date', () => {
 const now = new Date('2026-10-24T12:00:00Z')
 const past = '2026-10-01T20:00:00Z'
 const future = '2026-10-30T20:00:00Z'
 assert.equal(selectClinicAppointment([past, '2026-11-01T20:00:00Z', future, null, 'invalid'], now), future)
 assert.equal(selectClinicAppointment(['2026-09-01T20:00:00Z', past], now), past)
 assert.equal(selectClinicAppointment([null, 'invalid'], now), null)
})
