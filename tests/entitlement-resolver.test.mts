import assert from 'node:assert/strict'
import test from 'node:test'
import { createCanonicalEntitlementRecord } from '../lib/entitlement-record.ts'
import { resolveCapabilityEntitlement } from '../lib/entitlement-resolver.ts'

function baseRecord(overrides: Partial<Parameters<typeof createCanonicalEntitlementRecord>[0]> = {}) {
  return createCanonicalEntitlementRecord({
    subjectId: 'user_test_001',
    tier: 'clinic_ai',
    status: 'active',
    source: 'clinic_ai_paid',
    trialStarts: null,
    trialEnds: null,
    paidThrough: '2026-09-30',
    lastCompletedVisit: '2026-09-01',
    graceEnds: null,
    accessExpires: null,
    squareSubscriptionId: null,
    entitlementReason: 'preview test',
    lastAccessChange: '2026-09-01T12:00:00Z',
    override: null,
    overrideReason: null,
    ...overrides,
  })
}

const now = new Date('2026-09-11T16:00:00Z')
const today = '2026-09-11'

test('internal pilot remains allowed without clinic lifecycle', () => {
  const result = resolveCapabilityEntitlement({
    record: baseRecord({ tier: 'internal_pilot', source: 'internal_pilot', paidThrough: null }),
    capability: 'buddy:chat',
    today,
    now,
  })
  assert.equal(result.decision, 'allow')
  assert.equal(result.lifecycle, 'NOT_APPLICABLE')
  assert.equal(result.reason, 'INTERNAL_PILOT_ALLOWED')
})

test('Portal Basic never grants cost-bearing AI while preserving clinic portal access', () => {
  const result = resolveCapabilityEntitlement({
    record: baseRecord({ tier: 'portal_basic', source: 'clinic_visit', paidThrough: null }),
    capability: 'buddy:chat',
    today,
    now,
  })
  assert.equal(result.decision, 'deny')
  assert.equal(result.portalAccess, 'full')
  assert.equal(result.reason, 'PORTAL_BASIC_NO_AI')
})

test('active clinic AI trial allows AI during its governed window', () => {
  const result = resolveCapabilityEntitlement({
    record: baseRecord({
      status: 'trial',
      source: 'clinic_ai_trial',
      paidThrough: null,
      trialStarts: '2026-09-01T00:00:00Z',
      trialEnds: '2026-10-01T00:00:00Z',
    }),
    capability: 'food_scan:analyze',
    today,
    now,
  })
  assert.equal(result.decision, 'allow')
  assert.equal(result.reason, 'CLINIC_AI_TRIAL_ACTIVE')
})

test('expired clinic AI trial denies AI', () => {
  const result = resolveCapabilityEntitlement({
    record: baseRecord({
      status: 'trial',
      source: 'clinic_ai_trial',
      paidThrough: null,
      trialStarts: '2026-08-01T00:00:00Z',
      trialEnds: '2026-08-31T00:00:00Z',
    }),
    capability: 'buddy:chat',
    today,
    now,
  })
  assert.equal(result.decision, 'deny')
  assert.equal(result.reason, 'CLINIC_AI_TRIAL_EXPIRED')
})

test('paid clinic AI allows while Paid Through is current', () => {
  const result = resolveCapabilityEntitlement({
    record: baseRecord(),
    capability: 'restaurant_menu:analyze',
    today,
    now,
  })
  assert.equal(result.decision, 'allow')
  assert.equal(result.reason, 'CLINIC_AI_PAID_ACTIVE')
})

test('clinic AI without verified Paid Through fails closed as unresolved', () => {
  const result = resolveCapabilityEntitlement({
    record: baseRecord({ paidThrough: null }),
    capability: 'buddy:chat',
    today,
    now,
  })
  assert.equal(result.decision, 'unresolved')
  assert.equal(result.reason, 'CLINIC_AI_PAYMENT_UNVERIFIED')
})

test('INACTIVE clinic patient cannot keep clinic AI even when Paid Through is future', () => {
  const result = resolveCapabilityEntitlement({
    record: baseRecord({ lastCompletedVisit: '2026-07-01', paidThrough: '2026-12-31' }),
    capability: 'buddy:chat',
    today,
    now,
  })
  assert.equal(result.lifecycle, 'INACTIVE')
  assert.equal(result.portalAccess, 'read_only')
  assert.equal(result.decision, 'deny')
  assert.equal(result.reason, 'CLINIC_INACTIVE')
})

test('Kenkho Path is not constrained by clinic lifecycle', () => {
  const result = resolveCapabilityEntitlement({
    record: baseRecord({
      tier: 'kenkho_start',
      source: 'kenkho_path',
      lastCompletedVisit: null,
      paidThrough: null,
    }),
    capability: 'weekly_summary:generate',
    today,
    now,
  })
  assert.equal(result.decision, 'allow')
  assert.equal(result.lifecycle, 'NOT_APPLICABLE')
  assert.equal(result.reason, 'KENKHO_ALLOWED')
})

test('administrative allow override cannot bypass lifecycle in P3', () => {
  const result = resolveCapabilityEntitlement({
    record: baseRecord({ override: 'allow', overrideReason: 'test override' }),
    capability: 'buddy:chat',
    today,
    now,
  })
  assert.equal(result.decision, 'unresolved')
  assert.equal(result.reason, 'OVERRIDE_ALLOW_NOT_ENABLED')
})

test('governed deny override fails closed', () => {
  const result = resolveCapabilityEntitlement({
    record: baseRecord({ override: 'deny', overrideReason: 'administrative hold' }),
    capability: 'buddy:chat',
    today,
    now,
  })
  assert.equal(result.decision, 'deny')
  assert.equal(result.reason, 'OVERRIDE_DENY')
})
