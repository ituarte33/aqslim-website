import assert from 'node:assert/strict'
import test from 'node:test'
import {
  effectiveFast36Status,
  fast36ProgressPercent,
  buildFast36BuddyContext,
  normalizeFast36Status,
  selectCurrentFast36Session,
  type Fast36Session,
} from '../lib/fast36-policy.ts'

const session: Fast36Session = {
  id: 'recFast36Example1',
  week: 1,
  startAt: '2026-08-17T05:00:00.000Z',
  plannedEndAt: '2026-08-18T17:00:00.000Z',
  actualEndAt: null,
  status: 'active',
}

test('normalizes Airtable FAST 36 status labels', () => {
  assert.equal(normalizeFast36Status('Activo'), 'active')
  assert.equal(normalizeFast36Status('Terminado temprano'), 'ended_early')
  assert.equal(normalizeFast36Status('Interrumpido por seguridad'), 'stopped_for_safety')
  assert.equal(normalizeFast36Status(undefined), 'pending')
})

test('derives status from the protected schedule', () => {
  assert.equal(effectiveFast36Status(session, Date.parse('2026-08-17T04:59:59Z')), 'pending')
  assert.equal(effectiveFast36Status(session, Date.parse('2026-08-17T23:00:00Z')), 'active')
  assert.equal(effectiveFast36Status(session, Date.parse('2026-08-18T17:00:00Z')), 'completed')
})

test('progress is bounded and reaches 50 percent at the midpoint', () => {
  assert.equal(fast36ProgressPercent(session, Date.parse('2026-08-17T23:00:00Z')), 50)
  assert.equal(fast36ProgressPercent(session, Date.parse('2026-08-16T00:00:00Z')), 0)
  assert.equal(fast36ProgressPercent(session, Date.parse('2026-08-20T00:00:00Z')), 100)
})

test('selects the active session before a future session', () => {
  const future = { ...session, id: 'recFast36Example2', week: 2, startAt: '2026-08-24T05:00:00Z', plannedEndAt: '2026-08-25T17:00:00Z', status: 'pending' as const }
  assert.equal(selectCurrentFast36Session([session, future], Date.parse('2026-08-17T23:00:00Z'))?.week, 1)
})

test('FAST 36 context never infers completion from elapsed time alone', () => {
  const context = buildFast36BuddyContext([session], Date.parse('2026-08-19T00:00:00Z'))
  assert.match(context, /Documented status: active/)
  assert.match(context, /Scheduled window elapsed: yes/)
  assert.match(context, /Do not claim that the patient completed the fast/)
})
