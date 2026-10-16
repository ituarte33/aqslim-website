import assert from 'node:assert/strict'
import test from 'node:test'
import { createCanonicalEntitlementRecord } from '../lib/entitlement-record.ts'
import {
  P5_FOUNDER_ENTITLEMENT_RECORD_ID,
  P5_FOUNDER_PATIENT_RECORD_ID,
  isExactP5FounderCanary,
  p5MigrationAuditReason,
} from '../lib/clinic-p5-migration.ts'

test('the one-time migration is pinned to Rom’s exact Preview records', () => {
  assert.equal(P5_FOUNDER_PATIENT_RECORD_ID, 'recRdIkniEv0MB4gT')
  assert.equal(P5_FOUNDER_ENTITLEMENT_RECORD_ID, 'recGI5DeJmXkUm1r8')
})

const p5 = createCanonicalEntitlementRecord({
  subjectId: 'user_rom',
  tier: 'clinic_ai',
  status: 'trial',
  source: 'clinic_ai_trial',
  trialStarts: '2026-09-11T00:00:00.000Z',
  trialEnds: '2026-10-11T00:00:00.000Z',
  paidThrough: null,
  lastCompletedVisit: null,
  graceEnds: null,
  accessExpires: null,
  squareSubscriptionId: null,
  entitlementReason: 'P5_FOUNDER_REAL_USER_CANARY; synthetic lifecycle anchor only',
  lastAccessChange: '2026-09-11T01:02:03.000Z',
  override: null,
  overrideReason: null,
})

test('recognizes only the exact unpaid Founder P5 canary', () => {
  assert.equal(isExactP5FounderCanary(p5, 'user_rom'), true)
  assert.equal(isExactP5FounderCanary({ ...p5, tier: 'internal_pilot' }, 'user_rom'), false)
  assert.equal(isExactP5FounderCanary({ ...p5, entitlementReason: 'generic trial' }, 'user_rom'), false)
  assert.equal(isExactP5FounderCanary({ ...p5, paidThrough: '2026-10-01' }, 'user_rom'), false)
  assert.equal(isExactP5FounderCanary(p5, 'user_other'), false)
})

test('preserves the original P5 evidence in the migration audit reason', () => {
  const reason = p5MigrationAuditReason(p5, 'abc123')
  assert.match(reason, /MYAQ_CLINIC_001_P5_CANARY_MIGRATION/)
  assert.match(reason, /fingerprint=abc123/)
  assert.match(reason, /original_tier=clinic_ai/)
  assert.match(reason, /original_status=trial/)
  assert.match(reason, /original_source=clinic_ai_trial/)
  assert.match(reason, /original_trial_starts=2026-09-11/)
  assert.match(reason, /original_trial_ends=2026-10-11/)
  assert.match(reason, /original_reason=P5_FOUNDER_REAL_USER_CANARY/)
})
