import assert from 'node:assert/strict'
import test from 'node:test'
import {
  evaluateFoodScanUsage,
  foodScanPeriodBoundaries,
  foodScanPolicyFor,
  normalizeFoodScanPlan,
} from '../lib/food-scan-policy.ts'

test('canonical and legacy plan names resolve to governed limits', () => {
  assert.equal(normalizeFoodScanPlan('mid'), 'start')
  assert.equal(normalizeFoodScanPlan('top'), 'elite')
  assert.deepEqual(
    { daily: foodScanPolicyFor('plus').dailyLimit, monthly: foodScanPolicyFor('plus').monthlyLimit },
    { daily: 10, monthly: 300 },
  )
  assert.deepEqual(
    { daily: foodScanPolicyFor('pilot').dailyLimit, monthly: foodScanPolicyFor('pilot').monthlyLimit },
    { daily: 15, monthly: 450 },
  )
})

test('daily and monthly limits fail closed independently', () => {
  const policy = foodScanPolicyFor('elite')
  assert.equal(evaluateFoodScanUsage(policy, 14, 449).allowed, true)
  assert.equal(evaluateFoodScanUsage(policy, 15, 100).reason, 'daily_limit')
  assert.equal(evaluateFoodScanUsage(policy, 4, 450).reason, 'monthly_limit')
})

test('Pacific boundaries account for daylight-saving changes', () => {
  const spring = foodScanPeriodBoundaries('2026-03-08')
  assert.equal(spring.dayStartUtc, '2026-03-08T08:00:00.000Z')
  assert.equal(spring.dayEndUtc, '2026-03-09T07:00:00.000Z')

  const summer = foodScanPeriodBoundaries('2026-08-14')
  assert.equal(summer.dayStartUtc, '2026-08-14T07:00:00.000Z')
  assert.equal(summer.dayEndUtc, '2026-08-15T07:00:00.000Z')
})
