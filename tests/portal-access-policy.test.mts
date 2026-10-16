import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createCanonicalEntitlementRecord } from '../lib/entitlement-record.ts'
import { portalAccessIsRestricted } from '../lib/portal-access-policy.ts'

const layoutSource = await readFile(new URL('../app/my-aqslim/layout.tsx', import.meta.url), 'utf8')
const storeSource = await readFile(new URL('../lib/preview-entitlement-store.ts', import.meta.url), 'utf8')

function record(status: 'active' | 'suspended' | 'expired' | 'canceled', override: 'allow' | 'deny' | null = null, overrideReason: string | null = null) {
  return createCanonicalEntitlementRecord({
    subjectId: 'user_test', tier: 'internal_pilot', status, source: 'internal_pilot',
    trialStarts: null, trialEnds: null, paidThrough: null, lastCompletedVisit: null,
    graceEnds: null, accessExpires: null, squareSubscriptionId: null,
    entitlementReason: 'test', lastAccessChange: '2026-10-16T00:00:00.000Z',
    override, overrideReason,
  })
}

test('active entitlement keeps My AQSLIM available', () => {
  assert.equal(portalAccessIsRestricted(record('active')), false)
})

test('suspended, expired and canceled entitlements restrict My AQSLIM', () => {
  assert.equal(portalAccessIsRestricted(record('suspended')), true)
  assert.equal(portalAccessIsRestricted(record('expired')), true)
  assert.equal(portalAccessIsRestricted(record('canceled')), true)
})

test('governed deny override restricts access', () => {
  assert.equal(portalAccessIsRestricted(record('active', 'deny', 'Founder restriction')), true)
  assert.equal(portalAccessIsRestricted(record('active', 'deny', null)), false)
})

test('the official My AQSLIM portal reads access status without enabling production mutations', () => {
  assert.match(layoutSource, /getPortalAccessRecordByPatientRecordId/)
  assert.match(storeSource, /process\.env\.VERCEL_ENV === 'production'/)
  assert.match(storeSource, /all provisioning and mutation paths remain Preview-only/)
  assert.match(storeSource, /enabled = isPreviewStoreEnabled\(\)/)
})
