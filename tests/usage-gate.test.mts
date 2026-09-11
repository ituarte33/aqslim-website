import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluateUsageGate } from '../lib/usage-gate.ts'

test('usage gate allows requests below both limits', () => {
  assert.deepEqual(
    evaluateUsageGate(
      { dailyLimit: 3, monthlyLimit: 90 },
      { dailyUsed: 2, monthlyUsed: 20 },
    ),
    {
      allowed: true,
      reason: 'allowed',
      dailyRemaining: 1,
      monthlyRemaining: 70,
    },
  )
})

test('usage gate denies at the daily limit before monthly evaluation', () => {
  const decision = evaluateUsageGate(
    { dailyLimit: 3, monthlyLimit: 90 },
    { dailyUsed: 3, monthlyUsed: 20 },
  )
  assert.equal(decision.allowed, false)
  assert.equal(decision.reason, 'daily_limit')
  assert.equal(decision.dailyRemaining, 0)
})

test('usage gate denies at the monthly limit', () => {
  const decision = evaluateUsageGate(
    { dailyLimit: 3, monthlyLimit: 90 },
    { dailyUsed: 1, monthlyUsed: 90 },
  )
  assert.equal(decision.allowed, false)
  assert.equal(decision.reason, 'monthly_limit')
  assert.equal(decision.monthlyRemaining, 0)
})

test('usage gate normalizes negative usage to zero', () => {
  const decision = evaluateUsageGate(
    { dailyLimit: 3, monthlyLimit: 90 },
    { dailyUsed: -2, monthlyUsed: -5 },
  )
  assert.equal(decision.allowed, true)
  assert.equal(decision.dailyRemaining, 3)
  assert.equal(decision.monthlyRemaining, 90)
})
