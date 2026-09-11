import assert from 'node:assert/strict'
import test from 'node:test'
import { usagePolicyForEntitlementTier } from '../lib/entitlement-usage-policy.ts'
import { buildThirtyDayTrialWindow, clinicGraceEndDate } from '../lib/entitlement-windows.ts'

test('clinic_ai uses the approved Preview-only 3/day and 90/month food scan envelope', () => {
  assert.deepEqual(usagePolicyForEntitlementTier('clinic_ai', 'food_scan'), {
    dailyLimit: 3,
    monthlyLimit: 90,
  })
})

test('Portal Basic has no cost-bearing food scan allowance', () => {
  assert.deepEqual(usagePolicyForEntitlementTier('portal_basic', 'food_scan'), {
    dailyLimit: 0,
    monthlyLimit: 0,
  })
})

test('existing Kenkho and internal pilot limits are preserved', () => {
  assert.deepEqual(usagePolicyForEntitlementTier('kenkho_start', 'food_scan'), { dailyLimit: 3, monthlyLimit: 90 })
  assert.deepEqual(usagePolicyForEntitlementTier('kenkho_plus', 'food_scan'), { dailyLimit: 10, monthlyLimit: 300 })
  assert.deepEqual(usagePolicyForEntitlementTier('kenkho_elite', 'food_scan'), { dailyLimit: 15, monthlyLimit: 450 })
  assert.deepEqual(usagePolicyForEntitlementTier('internal_pilot', 'food_scan'), { dailyLimit: 15, monthlyLimit: 450 })
})

test('eligible trial window is exactly 30 days', () => {
  const window = buildThirtyDayTrialWindow(new Date('2026-09-11T17:00:00Z'))
  assert.equal(window.trialStarts, '2026-09-11T17:00:00.000Z')
  assert.equal(window.trialEnds, '2026-10-11T17:00:00.000Z')
})

test('clinic grace snapshot ends 60 days after Last Completed Visit', () => {
  assert.equal(clinicGraceEndDate('2026-07-13'), '2026-09-11')
  assert.equal(clinicGraceEndDate('invalid'), null)
})
