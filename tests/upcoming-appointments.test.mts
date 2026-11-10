import assert from 'node:assert/strict'
import test from 'node:test'

import { bookingCalendarNavigation, formatAppointmentDate, isUpcomingAppointment } from '../lib/appointment-metrics.ts'

const now = new Date('2026-08-14T19:00:00.000Z')

test('keeps only current or future appointments in the dashboard preview', () => {
  assert.equal(isUpcomingAppointment('2026-08-14T19:00:00.000Z', now), true)
  assert.equal(isUpcomingAppointment('2026-08-15T16:00:00.000Z', now), true)
  assert.equal(isUpcomingAppointment('2026-06-09T17:15:00.000Z', now), false)
})

test('rejects missing or invalid appointment dates', () => {
  assert.equal(isUpcomingAppointment(undefined, now), false)
  assert.equal(isUpcomingAppointment('fecha desconocida', now), false)
})

test('formats Square booking times in the Los Angeles business timezone', () => {
  const formatted = formatAppointmentDate('2026-08-17T22:00:00.000Z', 'en')
  assert.match(formatted, /Aug 17/)
  assert.match(formatted, /3:00 PM/)
})


test('booking month navigation stops at January when the current month is December', () => {
  assert.deepEqual(bookingCalendarNavigation(2026, 11, '2026-12-15'), { canPrev: false, canNext: true })
  assert.deepEqual(bookingCalendarNavigation(2027, 0, '2026-12-15'), { canPrev: true, canNext: false })
  assert.deepEqual(bookingCalendarNavigation(2026, 10, '2026-11-10'), { canPrev: false, canNext: true })
  assert.deepEqual(bookingCalendarNavigation(2026, 11, '2026-11-10'), { canPrev: true, canNext: false })
})
