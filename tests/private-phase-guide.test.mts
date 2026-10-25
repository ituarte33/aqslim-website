import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import { AuthorizationError } from '../lib/authorization-policy.ts'
import { privateGuideAccessAllowed } from '../lib/private-phase-guide-policy.ts'
import { createCanonicalEntitlementRecord } from '../lib/entitlement-record.ts'

const now = new Date('2026-10-25T17:00:00Z')
function activeRecord() {
  return createCanonicalEntitlementRecord({ subjectId: 'synthetic-user', tier: 'internal_pilot', status: 'active', source: 'internal_pilot', trialStarts: null, trialEnds: null, paidThrough: null, lastCompletedVisit: null, graceEnds: null, accessExpires: null, squareSubscriptionId: null, entitlementReason: 'Synthetic test', lastAccessChange: now.toISOString(), override: null, overrideReason: null })
}

test('private guide requires a current governed access record and honors revocation and expiry', () => {
  const record = activeRecord()
  assert.equal(privateGuideAccessAllowed(record, now), true)
  assert.equal(privateGuideAccessAllowed(null, now), false)
  for (const status of ['suspended', 'expired', 'canceled'] as const) assert.equal(privateGuideAccessAllowed({ ...record, status }, now), false)
  assert.equal(privateGuideAccessAllowed({ ...record, override: 'deny', overrideReason: 'Restricted by Clinic' }, now), false)
  assert.equal(privateGuideAccessAllowed({ ...record, accessExpires: '2026-10-24' }, now), false)
  assert.equal(privateGuideAccessAllowed({ ...record, accessExpires: 'not-a-date' }, now), false)
  assert.equal(privateGuideAccessAllowed({ ...record, override: 'allow', overrideReason: 'Unverified' }, now), false)
})
test('clinic portal-basic clients can read their guide without an AI subscription, within the existing visit lifecycle', () => {
  const record = { ...activeRecord(), tier: 'portal_basic' as const, source: 'clinic_visit' as const, lastCompletedVisit: '2026-10-01' }
  assert.equal(privateGuideAccessAllowed(record, now), true)
  assert.equal(privateGuideAccessAllowed({ ...record, lastCompletedVisit: '2026-09-01' }, now), true)
  assert.equal(privateGuideAccessAllowed({ ...record, lastCompletedVisit: '2026-08-01' }, now), false)
  assert.equal(privateGuideAccessAllowed({ ...record, lastCompletedVisit: null }, now), false)
})

async function loadRoute(file: string, mocks: Record<string, unknown>) {
  const source = await readFile(new URL(file, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports: Record<string, Function> = {}
  vm.runInNewContext(code, { exports, require: (id: string) => { assert.ok(id in mocks, `Missing mock: ${id}`); return mocks[id] }, Response, URL, Uint8Array, Error })
  return exports
}

test('PDF delivery checks session, ownership, access and current phase before reading any private bytes; no public redirect or cache', async () => {
  const patientId = 'rec12345678901234', planId = 'rec22345678901234'
  let enabled = true, loggedIn = true, owner = true, ambiguous = false, allowed = true, storeFailure = false, missingPdf = false
  let phase = 'Jing', linked = true, reads = 0
  const route = await loadRoute('../app/my-aqslim/materials/phase-document/route.ts', {
    '@/lib/auth': {
      AuthorizationError,
      getActor: async () => loggedIn ? { clerkUserId: 'synthetic-user', boundPatientId: owner ? patientId : 'rec33333333333333' } : null,
      requireOwnPatient: async (capability: string) => { assert.equal(capability, 'portal:read:self'); if (ambiguous) throw new AuthorizationError('PATIENT_IDENTITY_AMBIGUOUS'); return { id: patientId, fields: { 'Plan AQSLIM': [planId] } } },
    },
    '@/lib/airtable': { getPlanById: async (id: string) => { assert.equal(id, planId); return { id, fields: { 'Fase Actual': phase, 'ID Cliente': linked ? [patientId] : ['rec33333333333333'] } } } },
    '@/lib/preview-entitlement-store': { getPortalAccessRecordByPatientRecordId: async (input: {patientRecordId: string; canonicalSubjectId: string}) => { assert.equal(input.patientRecordId, patientId); assert.equal(input.canonicalSubjectId, 'synthetic-user'); if (storeFailure) throw new Error('backend detail'); return allowed ? { record: activeRecord() } : null } },
    '@/lib/clinic-runtime-policy': { clinicRuntimeEnvironment: () => ({}), isClinicRuntimeEnvironment: () => enabled },
    '@/lib/phase-materials': { getPhaseGuide: (value: string) => ['Jing','Qi'].includes(value) ? { phase: value } : null },
    '@/lib/private-phase-guide-policy': { PRIVATE_JING_GUIDE: { slug: 'jing', phase: 'Jing' }, privateGuideAccessAllowed: (record: unknown) => Boolean(record) },
    '@/lib/private-phase-guide-store': { readPrivateJingPdf: async () => { reads++; return missingPdf ? null : new TextEncoder().encode('%PDF-synthetic') } },
  })
  const request = (query = 'phase=jing') => new Request(`https://example.test/my-aqslim/materials/phase-document?${query}`)
  enabled = false; assert.equal((await route.GET(request())).status, 404); enabled = true
  loggedIn = false; assert.equal((await route.GET(request())).status, 401); loggedIn = true
  owner = false; assert.equal((await route.GET(request())).status, 403); owner = true
  ambiguous = true; assert.equal((await route.GET(request())).status, 403); ambiguous = false
  allowed = false; assert.equal((await route.GET(request())).status, 403); allowed = true
  phase = 'Qi'; assert.equal((await route.GET(request())).status, 404); phase = 'Jing'
  linked = false; assert.equal((await route.GET(request())).status, 404); linked = true
  assert.equal((await route.GET(request('phase=../../secret'))).status, 404)
  storeFailure = true; const failed = await route.GET(request()); assert.equal(failed.status, 503); assert.doesNotMatch(await failed.text(), /backend detail/); storeFailure = false
  assert.equal(reads, 0)
  const success = await route.GET(request('phase=jing&patientId=rec33333333333333'))
  assert.equal(success.status, 200)
  assert.match(success.headers.get('cache-control')!, /private, no-store/)
  assert.equal(success.headers.get('vercel-cdn-cache-control'), 'no-store')
  assert.equal(success.headers.get('content-type'), 'application/pdf')
  assert.equal(success.headers.get('location'), null)
  assert.equal(await success.text(), '%PDF-synthetic')
  allowed = false; assert.equal((await route.GET(request())).status, 403); assert.equal(reads, 1)
  allowed = true; missingPdf = true; assert.equal((await route.GET(request())).status, 503)
})

test('guide import rejects other identities, cross-origin requests and unapproved files without changing clinical data', async () => {
  let founder = false, imports = 0, valid = false
  const route = await loadRoute('../app/api/preview/clinic-private-guide/route.ts', {
    '@/lib/auth': { getActor: async () => ({ email: 'synthetic@test.invalid' }) },
    '@/lib/clinic-runtime-policy': { clinicRuntimeEnvironment: () => ({}), isClinicRuntimeFounderIdentity: () => founder },
    '@/lib/private-phase-guide-store': {
      readPrivateJingPdf: async () => null,
      readBoundedGuideBody: async () => new Uint8Array([1,2,3]),
      importPrivateJingPdf: async () => { if (!valid) throw new Error('INVALID_GUIDE'); imports++ },
    },
  })
  const request = (origin = 'https://example.test', type = 'application/pdf') => new Request('https://example.test/api/preview/clinic-private-guide', { method: 'POST', headers: { origin, 'content-type': type }, body: '%PDF-synthetic' })
  assert.equal((await route.POST(request())).status, 403)
  founder = true
  assert.equal((await route.POST(request('https://other.test'))).status, 403)
  assert.equal((await route.POST(request('https://example.test', 'text/plain'))).status, 400)
  assert.equal((await route.POST(request())).status, 400)
  assert.equal(imports, 0)
  valid = true; const response = await route.POST(request()); assert.equal(response.status, 200); assert.equal((await response.json()).verified, true)
  assert.equal(imports, 1)
})
