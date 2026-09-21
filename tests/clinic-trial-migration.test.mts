import assert from 'node:assert/strict'
import test from 'node:test'
import { createCanonicalEntitlementRecord } from '../lib/entitlement-record.ts'
import {
  AUTHORIZED_TRIAL_MIGRATION_REASON,
  authorizedTrialMigrationAuditReason,
  isExactAuthorizedClinicTrial,
} from '../lib/clinic-trial-migration.ts'

const userId = 'user_participant_123'
const ordinaryTrial = createCanonicalEntitlementRecord({
  subjectId: userId,
  tier: 'clinic_ai',
  status: 'trial',
  source: 'clinic_ai_trial',
  trialStarts: '2026-08-01T00:00:00.000Z',
  trialEnds: '2026-08-31T00:00:00.000Z',
  paidThrough: null,
  squareSubscriptionId: null,
  entitlementReason: 'ordinary clinic trial',
  lastAccessChange: '2026-08-01T00:00:00.000Z',
})

test('recognizes only an exact unpaid non-P5 clinic trial for the same account', () => {
  assert.equal(isExactAuthorizedClinicTrial(ordinaryTrial, userId), true)
  assert.equal(isExactAuthorizedClinicTrial(ordinaryTrial, 'user_other'), false)
  assert.equal(isExactAuthorizedClinicTrial({ ...ordinaryTrial, source: 'clinic_ai_paid' }, userId), false)
  assert.equal(isExactAuthorizedClinicTrial({ ...ordinaryTrial, entitlementReason: 'P5_FOUNDER_REAL_USER_CANARY' }, userId), false)
  assert.equal(isExactAuthorizedClinicTrial({ ...ordinaryTrial, paidThrough: '2026-10-01' }, userId), false)
})

test('preserves the original trial evidence in the migration audit reason', () => {
  const reason = authorizedTrialMigrationAuditReason(ordinaryTrial, 'armando123456789')

  assert.match(reason, new RegExp(`^${AUTHORIZED_TRIAL_MIGRATION_REASON}`))
  assert.match(reason, /fingerprint=armando123456789/)
  assert.match(reason, /original_tier=clinic_ai/)
  assert.match(reason, /original_status=trial/)
  assert.match(reason, /original_source=clinic_ai_trial/)
  assert.match(reason, /original_reason=ordinary clinic trial/)
})
