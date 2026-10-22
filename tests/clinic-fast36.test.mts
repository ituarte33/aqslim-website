import test from 'node:test'
import assert from 'node:assert/strict'
import { buildClinicFast36, clinicFast36Start, decodeClinicFast36, encodeClinicFast36 } from '../lib/clinic-fast36.ts'
import { canConfirmFast36Outcome, effectiveFast36Status } from '../lib/fast36-policy.ts'

test('Seattle provisional schedule covers exactly 36 hours across calendar days', () => {
  const s = buildClinicFast36({ week: 1, localStart: '2026-10-19T20:00', timeZone: 'America/Los_Angeles', provisional: true })!
  assert.equal(s.startAt, '2026-10-20T03:00:00.000Z')
  assert.equal(s.plannedEndAt, '2026-10-21T15:00:00.000Z')
  assert.equal(effectiveFast36Status(s, Date.parse('2026-10-22T00:00:00Z')), 'awaiting_confirmation')
  assert.equal(canConfirmFast36Outcome(s, 'completed', Date.parse('2026-10-22T00:00:00Z')), false)
  assert.equal(decodeClinicFast36(encodeClinicFast36(s), 'note1')?.id, 'note1')
})
test('explicit zone is independent of browser zone and handles DST safely', () => {
  assert.equal(clinicFast36Start('2026-10-19T20:00', 'America/New_York'), '2026-10-20T00:00:00.000Z')
  assert.equal(clinicFast36Start('2026-03-08T02:30', 'America/Los_Angeles'), null)
  assert.equal(clinicFast36Start('2026-11-01T01:30', 'America/Los_Angeles'), null)
  assert.equal(clinicFast36Start('2026-02-30T20:00', 'America/Los_Angeles'), null)
})
test('reject invalid week, untrusted schedule and inferred completion', () => {
  assert.equal(buildClinicFast36({ week: 7, localStart: '2026-10-19T20:00', timeZone: 'America/Los_Angeles', provisional: true }), null)
  assert.equal(decodeClinicFast36('ordinary clinical note', 'note1'), null)
  const s = buildClinicFast36({ week: 1, localStart: '2026-10-19T20:00', timeZone: 'America/Los_Angeles', provisional: true })!
  assert.equal(decodeClinicFast36(encodeClinicFast36({ ...s, status: 'completed' }), 'note1'), null)
  assert.equal(decodeClinicFast36(encodeClinicFast36({ ...s, plannedEndAt: s.startAt }), 'note1'), null)
  const confirmed = { ...s, provisional: false }
  assert.equal(canConfirmFast36Outcome(confirmed, 'completed', Date.parse(s.startAt)), false)
  assert.equal(canConfirmFast36Outcome(confirmed, 'completed', Date.parse(s.plannedEndAt)), true)
})
