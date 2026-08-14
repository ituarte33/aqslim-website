import assert from 'node:assert/strict'
import test from 'node:test'

import { isUpcomingAppointment } from '../lib/appointment-metrics.ts'

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
