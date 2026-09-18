import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { isP3PreviewEnforcementEnabled } from '../lib/p3-enforcement-policy.ts'
import { ENTITLEMENT_P3_PREVIEW_BRANCH } from '../lib/nutrition/synthetic-preview-policy.ts'

test('P3 enforcement requires Preview + exact P3 branch + explicit enabled flag', () => {
  assert.equal(isP3PreviewEnforcementEnabled({
    VERCEL_ENV: 'preview',
    VERCEL_GIT_COMMIT_REF: ENTITLEMENT_P3_PREVIEW_BRANCH,
    MYAQ_P3_ENFORCEMENT: 'enabled',
  }), true)
})

test('P3 enforcement cannot activate in Production, main, another Preview branch, or without flag', () => {
  assert.equal(isP3PreviewEnforcementEnabled({
    VERCEL_ENV: 'production',
    VERCEL_GIT_COMMIT_REF: ENTITLEMENT_P3_PREVIEW_BRANCH,
    MYAQ_P3_ENFORCEMENT: 'enabled',
  }), false)
  assert.equal(isP3PreviewEnforcementEnabled({
    VERCEL_ENV: 'preview',
    VERCEL_GIT_COMMIT_REF: 'main',
    MYAQ_P3_ENFORCEMENT: 'enabled',
  }), false)
  assert.equal(isP3PreviewEnforcementEnabled({
    VERCEL_ENV: 'preview',
    VERCEL_GIT_COMMIT_REF: 'myaq-ent-p2-preenforcement-preview',
    MYAQ_P3_ENFORCEMENT: 'enabled',
  }), false)
  assert.equal(isP3PreviewEnforcementEnabled({
    VERCEL_ENV: 'preview',
    VERCEL_GIT_COMMIT_REF: ENTITLEMENT_P3_PREVIEW_BRANCH,
  }), false)
})

test('AQ Buddy only denies on an explicitly enforced P3 gate result', async () => {
  const [authSource, accessSource] = await Promise.all([
    readFile(new URL('../lib/auth.ts', import.meta.url), 'utf8'),
    readFile(new URL('../lib/ai-entitlement-access.ts', import.meta.url), 'utf8'),
  ])
  assert.match(authSource, /evaluateAiEntitlementAccess\(/)
  assert.match(accessSource, /runP3PreviewEntitlementGate\(/)
  assert.match(accessSource, /allowed: p3Gate\.enforced[\s\S]*?p3Gate\.decision === 'allow'[\s\S]*?: currentAccessAllowed/)
  assert.match(authSource, /if \(!access\.allowed\)/)
  assert.match(authSource, /throw new AuthorizationError\('FORBIDDEN'\)/)
})

test('P3 gate fails closed when enforcement is on but no canonical entitlement exists', async () => {
  const gateSource = await readFile(new URL('../lib/p3-entitlement-gate.ts', import.meta.url), 'utf8')
  assert.match(gateSource, /NO_CANONICAL_ENTITLEMENT/)
  assert.match(gateSource, /decision: 'deny'/)
  assert.match(gateSource, /originalDecision: resolution\.decision/)
})
