import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  P5_FOUNDER_CANARY_EMAIL,
  P5_FOUNDER_CANARY_REASON_MARKER,
  isP5FounderCanaryEnvironment,
  isP5FounderCanaryIdentity,
  isP5FounderCanaryRecord,
} from '../lib/p5-founder-canary-policy.ts'
import { createCanonicalEntitlementRecord } from '../lib/entitlement-record.ts'
import { ENTITLEMENT_P5_PREVIEW_BRANCH } from '../lib/nutrition/synthetic-preview-policy.ts'

const clinicAiCanary = createCanonicalEntitlementRecord({
  subjectId: 'patient:synthetic',
  tier: 'clinic_ai',
  status: 'trial',
  source: 'clinic_ai_trial',
  trialStarts: '2026-09-11T00:00:00.000Z',
  trialEnds: '2026-10-11T00:00:00.000Z',
  paidThrough: null,
  lastCompletedVisit: '2026-09-11',
  graceEnds: '2026-11-10',
  accessExpires: null,
  squareSubscriptionId: null,
  entitlementReason: `${P5_FOUNDER_CANARY_REASON_MARKER}; test`,
  lastAccessChange: '2026-09-11T00:00:00.000Z',
  override: null,
  overrideReason: null,
})

const P5_ENV = {
  VERCEL_ENV: 'preview',
  VERCEL_GIT_COMMIT_REF: ENTITLEMENT_P5_PREVIEW_BRANCH,
  MYAQ_P5_FOUNDER_CANARY: 'enabled',
} as const

test('P5 Founder canary requires Preview, exact branch, and explicit flag', () => {
  assert.equal(isP5FounderCanaryEnvironment(P5_ENV), true)
  assert.equal(isP5FounderCanaryEnvironment({
    ...P5_ENV,
    VERCEL_ENV: 'production',
  }), false)
  assert.equal(isP5FounderCanaryEnvironment({
    ...P5_ENV,
    VERCEL_GIT_COMMIT_REF: 'main',
  }), false)
  assert.equal(isP5FounderCanaryEnvironment({
    ...P5_ENV,
    MYAQ_P5_FOUNDER_CANARY: 'off',
  }), false)
})

test('P5 Founder identity is exact and cannot widen admin email fallback', () => {
  assert.equal(isP5FounderCanaryIdentity({ email: P5_FOUNDER_CANARY_EMAIL, environment: P5_ENV }), true)
  assert.equal(isP5FounderCanaryIdentity({ email: 'another-admin@example.com', environment: P5_ENV }), false)
  assert.equal(isP5FounderCanaryIdentity({
    email: P5_FOUNDER_CANARY_EMAIL,
    environment: { ...P5_ENV, VERCEL_GIT_COMMIT_REF: 'main' },
  }), false)
})

test('P5 record must be clinic_ai trial with explicit Founder canary marker', () => {
  assert.equal(isP5FounderCanaryRecord(clinicAiCanary), true)
  assert.equal(isP5FounderCanaryRecord({
    ...clinicAiCanary,
    entitlementReason: 'ordinary clinic_ai trial',
  }), false)
  assert.equal(isP5FounderCanaryRecord({
    ...clinicAiCanary,
    tier: 'internal_pilot',
    source: 'internal_pilot',
  }), false)
})

test('P5 entitlement context checks Founder canary before internal pilot priority', async () => {
  const source = await readFile(new URL('../lib/entitlement-context.ts', import.meta.url), 'utf8')
  const founderLookup = source.indexOf('const founderCanarySource = await getP5FounderCanarySource')
  const pilotFallback = source.indexOf('if (hasPilotAccess)')
  assert.ok(founderLookup >= 0 && pilotFallback > founderLookup)
  assert.match(source, /sourceKind: 'founder_canary_preview_store'/)
  assert.match(source, /useStoredLifecycleSnapshot: true/)
})

test('P5 claimed entitlement resolves by authenticated subject before patient metadata fallback', async () => {
  const source = await readFile(new URL('../lib/entitlement-context.ts', import.meta.url), 'utf8')
  const functionStart = source.indexOf('async function getP5FounderCanarySource')
  const functionEnd = source.indexOf('export async function buildCanonicalEntitlementContext')
  const p5Lookup = source.slice(functionStart, functionEnd)
  const subjectLookup = p5Lookup.indexOf('getPreviewEntitlementSourceRecord(subjectId)')
  const missingPatientGuard = p5Lookup.indexOf('if (!authenticatedPatientRecordId) return null')
  const patientLookup = p5Lookup.indexOf('getPreviewEntitlementSourceRecordByPatientRecordId')
  assert.ok(subjectLookup >= 0)
  assert.ok(missingPatientGuard > subjectLookup)
  assert.ok(patientLookup > missingPatientGuard)
  assert.match(source, /authenticatedPatientRecordId \?\? founderCanarySource\.patientRecordId/)
})

test('P5 Founder binding fallback remains branch-and-identity scoped', async () => {
  const source = await readFile(new URL('../lib/auth.ts', import.meta.url), 'utf8')
  assert.match(source, /isP5FounderCanaryIdentity\(/)
  assert.match(source, /if \(\(role === 'patient' \|\| founderCanaryIdentity\) && !boundPatientId\)/)
  assert.match(source, /Admin identities never use this fallback except the exact Founder identity/)
})

test('P5 branch keeps P3 enforcement and P5 canary flag isolated in vercel.json', async () => {
  const source = await readFile(new URL('../vercel.json', import.meta.url), 'utf8')
  assert.match(source, /"MYAQ_P3_ENFORCEMENT"\s*:\s*"enabled"/)
  assert.match(source, /"MYAQ_P5_FOUNDER_CANARY"\s*:\s*"enabled"/)
})
