import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  canConfirmFast36Outcome,
  effectiveFast36Status,
  fast36TimeZoneFromSessionData,
  fast36ProgressPercent,
  buildFast36BuddyContext,
  DEFAULT_FAST36_TIME_ZONE,
  normalizeFast36Status,
  selectCurrentFast36Session,
  storedFast36StatusForOutcome,
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

test('derives schedule state without inventing completion', () => {
  assert.equal(effectiveFast36Status(session, Date.parse('2026-08-17T04:59:59Z')), 'pending')
  assert.equal(effectiveFast36Status(session, Date.parse('2026-08-17T23:00:00Z')), 'active')
  assert.equal(effectiveFast36Status(session, Date.parse('2026-08-18T17:00:00Z')), 'awaiting_confirmation')
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

test('selects the most recent elapsed session awaiting confirmation', () => {
  const weekOne = { ...session, id: 'recFast36Example0', week: 1, startAt: '2026-08-10T05:00:00Z', plannedEndAt: '2026-08-11T17:00:00Z', status: 'pending' as const }
  const weekTwo = { ...session, week: 2 }
  const future = { ...session, id: 'recFast36Example2', week: 3, startAt: '2026-08-24T05:00:00Z', plannedEndAt: '2026-08-25T17:00:00Z', status: 'pending' as const }
  assert.equal(
    selectCurrentFast36Session([weekOne, weekTwo, future], Date.parse('2026-08-19T00:00:00Z'))?.week,
    2,
  )
})

test('reads a valid participant time zone and fails safely to the pilot zone', () => {
  assert.equal(
    fast36TimeZoneFromSessionData('{"timeZone":"America/Los_Angeles"}'),
    'America/Los_Angeles',
  )
  assert.equal(fast36TimeZoneFromSessionData('{"timeZone":"Not/AZone"}'), DEFAULT_FAST36_TIME_ZONE)
  assert.equal(fast36TimeZoneFromSessionData('not-json'), DEFAULT_FAST36_TIME_ZONE)
})

test('FAST 36 context never infers completion from elapsed time alone', () => {
  const context = buildFast36BuddyContext([session], Date.parse('2026-08-19T00:00:00Z'))
  assert.match(context, /Documented status: active/)
  assert.match(context, /Scheduled window elapsed: yes/)
  assert.match(context, /Do not claim that the patient completed the fast/)
})

test('only an elapsed schedule can be confirmed as completed', () => {
  assert.equal(canConfirmFast36Outcome(session, 'completed', Date.parse('2026-08-18T16:59:59Z')), false)
  assert.equal(canConfirmFast36Outcome(session, 'completed', Date.parse('2026-08-18T17:00:00Z')), true)
  assert.equal(canConfirmFast36Outcome({ ...session, status: 'completed' }, 'completed', Date.parse('2026-08-18T18:00:00Z')), false)
})

test('maps explicit patient outcomes to Airtable status labels', () => {
  assert.equal(storedFast36StatusForOutcome('completed'), 'Completado')
  assert.equal(storedFast36StatusForOutcome('ended_early'), 'Terminado temprano')
  assert.equal(storedFast36StatusForOutcome('stopped_for_safety'), 'Interrumpido por seguridad')
})

test('renders three explicit confirmation controls only for an awaiting session', async () => {
  const [view, action] = await Promise.all([
    readFile(new URL('../app/my-aqslim/pilot/fast-36/fast36-view.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/my-aqslim/pilot/fast-36/actions.ts', import.meta.url), 'utf8'),
  ])

  assert.match(view, /status === 'awaiting_confirmation'/)
  assert.match(view, /Sí, completé las 36 horas/)
  assert.match(view, /Terminé antes/)
  assert.match(view, /Interrumpí por seguridad/)
  assert.match(view, /confirmFast36SessionAction/)
  assert.match(action, /requireOwnPatient\('fasting:write:self'\)/)
  assert.match(action, /records\.find\(candidate => candidate\.id === sessionId\)/)
})
