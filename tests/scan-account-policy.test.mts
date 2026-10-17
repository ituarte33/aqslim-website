import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { hasAccountScanOverride, scanUsageResponse } from '../lib/scan-account-policy.ts'

const email = 'member@example.test'
const hash = createHash('sha256').update(email).digest('hex')
const user = { primaryEmailAddressId: 'primary', emailAddresses: [{ id: 'primary', emailAddress: email, verification: { status: 'verified' } }] }

test('only the configured verified primary account receives the exception', () => {
  assert.equal(hasAccountScanOverride(user, hash), true)
  assert.equal(hasAccountScanOverride(user, undefined), false)
  assert.equal(hasAccountScanOverride(null, hash), false)
  assert.equal(hasAccountScanOverride(user, 'member@example.test'), false)
  assert.equal(hasAccountScanOverride({ ...user, primaryEmailAddressId: null }, hash), false)
  assert.equal(hasAccountScanOverride({ ...user, emailAddresses: [{ ...user.emailAddresses[0], verification: { status: 'unverified' } }] }, hash), false)
  assert.equal(hasAccountScanOverride({ ...user, primaryEmailAddressId: 'other', emailAddresses: [...user.emailAddresses, { id: 'other', emailAddress: 'other@example.test', verification: { status: 'verified' } }] }, hash), false)
})

test('normalization does not change which account is granted access', () => {
  assert.equal(hasAccountScanOverride({ ...user, emailAddresses: [{ ...user.emailAddresses[0], emailAddress: ' Member@Example.Test ' }] }, `invalid, ${hash.toUpperCase()} `), true)
})

test('unlimited scans have no daily or monthly cap even beyond all current plans', () => {
  assert.deepEqual(scanUsageResponse({ dailyLimit: 1, monthlyLimit: 30 }, 501, 10001, true), {
    unlimited: true, used: 501, limit: null, remaining: null,
    monthlyUsed: 10001, monthlyLimit: null, monthlyRemaining: null,
  })
})

test('other accounts keep the existing daily and monthly limits', () => {
  assert.deepEqual(scanUsageResponse({ dailyLimit: 3, monthlyLimit: 90 }, 3, 90, false), {
    unlimited: false, used: 3, limit: 3, remaining: 0,
    monthlyUsed: 90, monthlyLimit: 90, monthlyRemaining: 0,
  })
})
