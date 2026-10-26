import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import { createHash } from 'node:crypto'
import { AuthorizationError } from '../lib/authorization-policy.ts'
import * as guidePolicy from '../lib/private-phase-guide-policy.ts'
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
  vm.runInNewContext(code, { exports, require: (id: string) => { assert.ok(id in mocks, `Missing mock: ${id}`); return mocks[id] }, Response, URL, Uint8Array, Error, Buffer, ReadableStream })
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
    '@/lib/phase-materials': { getPhaseGuide: (value: string) => ['Jing','Qi','Xue','Yang Sheng'].includes(value) ? { phase: value } : null },
    '@/lib/private-phase-guide-policy': { ...guidePolicy, privateGuideAccessAllowed: (record: unknown) => Boolean(record) },
    '@/lib/private-phase-guide-store': { readPrivatePhasePdf: async (guide: { phase: string }) => { assert.equal(guide.phase, phase); reads++; return missingPdf ? null : new TextEncoder().encode('%PDF-synthetic') } },
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
  missingPdf = false
  for (const current of Object.values(guidePolicy.PRIVATE_PHASE_GUIDES)) {
    phase = current.phase
    for (const requested of Object.values(guidePolicy.PRIVATE_PHASE_GUIDES)) {
      const before = reads
      const result = await route.GET(request(`phase=${requested.slug}`))
      assert.equal(result.status, current.slug === requested.slug ? 200 : 404)
      assert.equal(reads, before + (current.slug === requested.slug ? 1 : 0))
      if (result.ok) assert.equal(result.headers.get('content-disposition'), `inline; filename="${current.filename}"`)
    }
  }
  for (const slug of ['__proto__', 'constructor', '', 'Jing', '../qi']) assert.equal((await route.GET(request(`phase=${slug}`))).status, 404)
})

test('guide import rejects other identities, cross-origin requests and unapproved files without changing clinical data', async () => {
  let founder = false, imports = 0, valid = false
  const route = await loadRoute('../app/api/preview/clinic-private-guide/route.ts', {
    '@/lib/auth': { getActor: async () => ({ email: 'synthetic@test.invalid' }) },
    '@/lib/clinic-runtime-policy': { clinicRuntimeEnvironment: () => ({}), isClinicRuntimeFounderIdentity: () => founder },
    '@/lib/private-phase-guide-policy': guidePolicy,
    '@/lib/private-phase-guide-store': {
      readPrivatePhasePdf: async () => null,
      readBoundedGuideBody: async () => new Uint8Array([1,2,3]),
      importPrivatePhasePdf: async () => { if (!valid) throw new Error('INVALID_GUIDE'); imports++ },
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
  for (const guide of Object.values(guidePolicy.PRIVATE_PHASE_GUIDES)) {
    assert.equal((await route.POST(new Request(`https://example.test/api/preview/clinic-private-guide?phase=${guide.slug}`, { method: 'POST', headers: { origin: 'https://example.test', 'content-type': 'application/pdf' }, body: '%PDF-synthetic' }))).status, 200)
  }
  assert.equal((await route.POST(new Request('https://example.test/api/preview/clinic-private-guide?phase=constructor', { method: 'POST', headers: { origin: 'https://example.test', 'content-type': 'application/pdf' }, body: '%PDF-synthetic' }))).status, 400)
  const status = await route.GET()
  assert.equal(status.status, 200)
  const body = await status.json()
  assert.equal(body.guides.length, 4)
  assert.ok(body.guides.every((entry: { ready: boolean; available: boolean }) => entry.available && !entry.ready))
  founder = false; assert.equal((await route.GET()).status, 403)
})

test('private storage validates per-phase bytes, bounds the body, never overwrites and verifies persistence', async () => {
  const stored = new Map<string, Buffer>()
  let puts = 0, corrupt = false, cancelled = false
  const store = await loadRoute('../lib/private-phase-guide-store.ts', {
    'server-only': {}, 'node:crypto': { createHash }, './private-phase-guide-policy.ts': guidePolicy,
    '@vercel/blob': {
      get: async (path: string, options: {access: string}) => {
        assert.equal(options.access, 'private')
        const bytes = stored.get(path)
        return bytes ? { statusCode: 200, stream: new ReadableStream({ start(controller) { controller.enqueue(corrupt ? Buffer.from('%PDF-corrupt') : bytes); controller.close() } }) } : null
      },
      put: async (path: string, bytes: Buffer, options: {access: string; allowOverwrite: boolean; addRandomSuffix: boolean}) => {
        assert.equal(options.access, 'private'); assert.equal(options.allowOverwrite, false); assert.equal(options.addRandomSuffix, false)
        assert.ok(!stored.has(path)); stored.set(path, bytes); puts++
      },
    },
  })
  for (const entry of Object.values(guidePolicy.PRIVATE_PHASE_GUIDES)) {
    const bytes = Buffer.from(`%PDF-synthetic-${entry.slug}`)
    const guide = { ...entry, sha256: createHash('sha256').update(bytes).digest('hex') }
    assert.equal(store.isApprovedGuidePdf(guide, bytes), true)
    assert.equal(store.isApprovedGuidePdf(guide, Buffer.from('%PDF-other-phase')), false)
    await assert.rejects(() => store.importPrivatePhasePdf(guide, Buffer.from('%PDF-other-phase')), /INVALID_GUIDE/)
    assert.equal(await store.readPrivatePhasePdf(guide), null)
    await store.importPrivatePhasePdf(guide, bytes)
    assert.deepEqual(await store.readPrivatePhasePdf(guide), bytes)
    const before = puts
    await store.importPrivatePhasePdf(guide, bytes)
    assert.equal(puts, before)
    corrupt = true; await assert.rejects(() => store.readPrivatePhasePdf(guide), /GUIDE_UNAVAILABLE/); corrupt = false
  }
  assert.equal(puts, 4)
  const oversized = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(guidePolicy.PRIVATE_GUIDE_MAX_BYTES + 1)) }, cancel() { cancelled = true } })
  await assert.rejects(() => store.readBoundedGuideBody(oversized), /INVALID_GUIDE/)
  assert.equal(cancelled, true)
})
