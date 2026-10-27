import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import { createHash } from 'node:crypto'
import { planClinicClientOnboarding, type OnboardingEvidence } from '../lib/clinic-client-onboarding-policy.ts'
import { createCanonicalEntitlementRecord, ENTITLEMENT_RECORD_VERSION } from '../lib/entitlement-record.ts'
import { resolveCapabilityEntitlement } from '../lib/entitlement-resolver.ts'
import { lastCompletedVisitFromConsultations } from '../lib/clinic-visit-policy.ts'
import { isEligibleClinicAiTrialVisitType } from '../lib/clinic-ai-trial-policy.ts'
import { clinicGraceEndDate } from '../lib/entitlement-windows.ts'
const patientId = 'rec12345678901234', other = 'rec22345678901234', accountId = 'user_synthetic'
const now = new Date('2026-10-27T17:00:00Z')
const account = { id: accountId, boundPatientId: null, verified: true, protectedAccess: false }
function record() { return createCanonicalEntitlementRecord({ subjectId: accountId, tier: 'portal_basic', status: 'active', source: 'clinic_visit', trialStarts: null, trialEnds: null, paidThrough: null, lastCompletedVisit: '2026-10-20', graceEnds: null, accessExpires: null, squareSubscriptionId: null, entitlementReason: 'Synthetic onboarding', lastAccessChange: now.toISOString(), override: null, overrideReason: null }) }
function evidence(): OnboardingEvidence { return { patientId, email: 'synthetic@example.test', matchingPatientIds: [patientId], accounts: [{...account}], source: null, lastCompletedVisit: '2026-10-20', today: '2026-10-27' } }
async function load(file: string, mocks: Record<string, unknown>, extra = {}) {
  const source = await readFile(new URL(file, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports: Record<string, Function> = {}
  vm.runInNewContext(code, { exports, require: (id: string) => { assert.ok(id in mocks, `Missing mock ${id}`); return mocks[id] }, Response, URL, Date, Error, Intl, ...extra })
  return exports
}
test('ordinary verified clients receive only basic access from a genuine recent visit', () => {
  const plan = planClinicClientOnboarding(evidence())
  assert.equal(plan.operation, 'create_basic')
  assert.equal(plan.lifecycle, 'ACTIVE')
  assert.equal(resolveCapabilityEntitlement({ record: record(), capability: 'buddy:chat', today: '2026-10-27', now }).reason, 'PORTAL_BASIC_NO_AI')
})
test('onboarding blocks missing, duplicate, unverified and conflicting identity evidence', () => {
  const cases: Partial<OnboardingEvidence>[] = [
    { email: '' }, { accounts: [] }, { accounts: [account, account] },
    { matchingPatientIds: [] }, { matchingPatientIds: [patientId, other] },
    { accounts: [{...account, verified: false}] }, { accounts: [{...account, boundPatientId: other}] },
    { accounts: [{...account, protectedAccess: true}] }, { lastCompletedVisit: null },
    { lastCompletedVisit: '2026-10-28' }, { lastCompletedVisit: '2026-08-01' },
    { source: { airtableRecordId: other, storedSubjectId: 'someone-else', record: record() } },
  ]
  for (const c of cases) assert.equal(planClinicClientOnboarding({...evidence(), ...c}).operation, 'blocked', JSON.stringify(c))
  assert.equal(planClinicClientOnboarding({...evidence(), lastCompletedVisit: '2026-09-01'}).lifecycle, 'GRACE')
})
test('existing restricted, paid, trial and pilot grants are preserved without renewal or escalation', () => {
  for (const tier of ['internal_pilot', 'clinic_ai', 'kenkho_plus', 'portal_basic'] as const) {
    const source = { airtableRecordId: other, storedSubjectId: accountId, record: {...record(), tier, status: 'suspended' as const, override: 'deny' as const, overrideReason: 'Synthetic restriction'} }
    assert.equal(planClinicClientOnboarding({...evidence(), lastCompletedVisit: null, source}).operation, 'link_existing')
    assert.equal(planClinicClientOnboarding({...evidence(), source, accounts: [{...account, boundPatientId: patientId}]}).operation, 'already_linked')
    assert.equal(source.record.status, 'suspended')
  }
})

async function harness(trial = false) {
  let mode = 'production', source: any = null, writes = 0, metadataWrites = 0, failAccount = false, providerDown = false
  const F = Object.fromEntries(['SUBJECT_ID','PATIENT_RECORD_ID','TIER','STATUS','SOURCE','TRIAL_STARTS','TRIAL_ENDS','LAST_COMPLETED_VISIT','REASON','LAST_ACCESS_CHANGE','RECORD_VERSION','PREVIEW_ONLY'].map(x => [x,x]))
  const user: any = { id: accountId, emailAddresses: [{ emailAddress: evidence().email, verification: { status: 'verified' } }], privateMetadata: { unrelated: { keep: true } } }
  const users = {
    getUserList: async () => { if (providerDown) throw new Error('provider down'); return { data: [user] } },
    getUser: async () => user,
    updateUserMetadata: async (_id: string, input: any) => { metadataWrites++; if(failAccount) throw new Error('uncertain clerk response'); Object.assign(user.privateMetadata, input.privateMetadata) },
  }
  const service = await load('../lib/clinic-client-onboarding.ts', {
    'server-only': {}, 'node:crypto': { createHash }, '@clerk/nextjs/server': { clerkClient: async () => ({ users }) },
    './airtable': { getClienteById: async () => ({ id: patientId, fields: { Email: evidence().email } }), getClientesByEmail: async () => [{ id: patientId }] },
    './clinic-consultation-source': { getLinkedClinicConsultationsByPatientId: async () => [
      {fields: { 'ID Cliente': [patientId], 'Tipo de Consulta': trial ? 'Cliente Nuevo' : 'Cliente subsecuente', 'Fecha Consulta': '2026-10-20' }},
      {fields: { 'ID Cliente': [patientId], 'Tipo de Consulta': 'Actualización de peso', 'Fecha Consulta': '2026-10-26' }},
      {fields: { 'ID Cliente': [other], 'Tipo de Consulta': 'Cliente Nuevo', 'Fecha Consulta': '2026-10-27' }},
    ] },
    './clinic-ai-trial-policy': { isEligibleClinicAiTrialVisitType }, './clinic-visit-policy': { lastCompletedVisitFromConsultations }, './clinic-runtime-policy': { clinicRuntimeMode: () => mode },
    './clinic-client-onboarding-policy': { planClinicClientOnboarding }, './entitlement-record': { ENTITLEMENT_RECORD_VERSION },
    './nutrition/synthetic-preview-policy': { SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID: 'synthetic-base' },
    './preview-entitlement-store': { PREVIEW_ENTITLEMENT_FIELDS: F, PREVIEW_ENTITLEMENTS_TABLE: 'synthetic-access', getPortalAccessRecordByPatientRecordId: async () => source },
  }, { process: { env: { AIRTABLE_BASE_ID: 'synthetic-base', AIRTABLE_PAT: 'synthetic-token' } }, fetch: async (_url: string, init: any) => {
    writes++; const fields = JSON.parse(init.body).records[0].fields
    assert.equal(fields.PREVIEW_ONLY, false); assert.equal(fields.SUBJECT_ID, accountId)
    assert.equal(fields.LAST_COMPLETED_VISIT, '2026-10-20')
    assert.equal(fields.TIER, trial ? 'clinic_ai' : 'portal_basic'); assert.equal(fields.SOURCE, trial ? 'clinic_ai_trial' : 'clinic_visit')
    if (trial) { assert.equal(fields.TRIAL_STARTS,'2026-10-20T00:00:00.000Z'); assert.equal(fields.TRIAL_ENDS,'2026-11-19T00:00:00.000Z') } else assert.ok(!('TRIAL_STARTS' in fields))
    assert.ok(!('PAID_THROUGH' in fields))
    source = { isOperational: true, airtableRecordId: 'rec33333333333333', patientRecordId: patientId, storedSubjectId: accountId, record: {...record(), tier: fields.TIER, source: fields.SOURCE, status: fields.STATUS, trialStarts: fields.TRIAL_STARTS ?? null, trialEnds: fields.TRIAL_ENDS ?? null} }
    return new Response('{}', { status: 200 })
  } })
  return { service, user, counts: () => [writes, metadataWrites], setMode: (value: string) => { mode = value }, setSource: (value: any) => { source = value }, setFail: (value: boolean) => { failAccount = value }, setProviderDown: () => { providerDown = true } }
}
test('production execution verifies both stores, preserves metadata, and repeated alta performs no writes', async () => {
  const h = await harness()
  const snapshot = await h.service.resolveClinicClientOnboarding(patientId, now)
  assert.equal(snapshot.review.lastCompletedVisit, '2026-10-20')
  assert.equal(snapshot.review.operation, 'create_basic')
  const result = await h.service.executeClinicClientOnboarding({ patientId, fingerprint: snapshot.review.fingerprint, actorEmail: 'founder@example.test', now })
  assert.equal(result.verified, true); assert.deepEqual(h.counts(), [1,1])
  assert.equal(h.user.privateMetadata.aqslimPatientId, patientId); assert.equal(h.user.privateMetadata.unrelated.keep, true)
  const again = await h.service.resolveClinicClientOnboarding(patientId, now)
  assert.equal(again.review.operation, 'already_linked')
  await h.service.executeClinicClientOnboarding({ patientId, fingerprint: again.review.fingerprint, actorEmail: 'founder@example.test', now })
  assert.deepEqual(h.counts(), [1,1])
})
test('candidate execution and stale review are blocked before either provider is mutated', async () => {
  const h = await harness()
  h.setMode('candidate')
  await assert.rejects(h.service.executeClinicClientOnboarding({ patientId, fingerprint: '', actorEmail: '', now }), /READ_ONLY/)
  h.setMode('production')
  await assert.rejects(h.service.executeClinicClientOnboarding({ patientId, fingerprint: 'stale', actorEmail: '', now }), /REVIEW_CHANGED/)
  assert.deepEqual(h.counts(), [0,0])
})
test('provider lookup failure is not treated as absence and never creates a new grant', async () => {
  const h = await harness(); h.setProviderDown()
  await assert.rejects(h.service.resolveClinicClientOnboarding(patientId, now), /provider down/)
  assert.deepEqual(h.counts(), [0,0])
})
test('partial Clerk failure can resume after fresh review without duplicating or replacing entitlement', async () => {
  const h = await harness(); h.setFail(true)
  const first = await h.service.resolveClinicClientOnboarding(patientId, now)
  await assert.rejects(h.service.executeClinicClientOnboarding({ patientId, fingerprint: first.review.fingerprint, actorEmail: '', now }), /uncertain/)
  assert.deepEqual(h.counts(), [1,1])
  h.setFail(false)
  const retry = await h.service.resolveClinicClientOnboarding(patientId, now)
  assert.equal(retry.review.operation, 'link_existing')
  await h.service.executeClinicClientOnboarding({ patientId, fingerprint: retry.review.fingerprint, actorEmail: '', now })
  assert.deepEqual(h.counts(), [1,2])
})
test('linking an existing suspended grant never rewrites its restriction or commercial fields', async () => {
  const h = await harness()
  const source = { airtableRecordId: other, storedSubjectId: accountId, record: {...record(), status: 'suspended', override: 'deny', overrideReason: 'Synthetic restriction'} }
  h.setSource(source)
  const review = await h.service.resolveClinicClientOnboarding(patientId, now)
  await h.service.executeClinicClientOnboarding({ patientId, fingerprint: review.review.fingerprint, actorEmail: '', now })
  assert.deepEqual(h.counts(), [0,1]); assert.equal(source.record.status, 'suspended'); assert.equal(source.record.override, 'deny')
})

test('alta endpoint requires Founder, same origin, explicit confirmation and production runtime', async () => {
  let mode = 'candidate', actor: any = null, founder = true, writes = 0
  const { NextRequest, NextResponse } = await import('next/server')
  const route = await load('../app/api/preview/clinic-client-onboarding/route.ts', {
    'next/server': { NextRequest, NextResponse }, '@/lib/auth': { getActor: async () => actor },
    '@/lib/clinic-runtime-policy': { clinicRuntimeEnvironment: () => ({}), clinicRuntimeMode: () => mode, isClinicRuntimeFounderIdentity: () => founder },
    '@/lib/clinic-client-onboarding': { resolveClinicClientOnboarding: async () => ({review: {operation:'create_basic'}}), executeClinicClientOnboarding: async () => { writes++; return {verified:true} } },
  })
  const request = (origin = 'https://synthetic.test', confirmation = 'ALTA') => new NextRequest('https://synthetic.test/api/preview/clinic-client-onboarding', {method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({patientId,fingerprint:'x',confirmation})})
  assert.equal((await route.POST(request())).status,401)
  actor = {email:'founder@example.test'}; founder = false
  assert.equal((await route.POST(request())).status,403)
  founder = true
  assert.equal((await route.POST(request())).status,409); assert.equal(writes,0)
  mode = 'production'
  assert.equal((await route.POST(request('https://foreign.test'))).status,403)
  assert.equal((await route.POST(request(undefined,'wrong'))).status,409)
  const result = await route.POST(request()); assert.equal(result.status,200); assert.equal(writes,1)
  assert.match(result.headers.get('cache-control'), /no-store/)
})

async function storeHarness() {
  let mode = 'candidate', rows: any[] = [], visits: any[] = [], consultationReads = 0
  const names = ['SUBJECT_ID','PATIENT_RECORD_ID','TIER','STATUS','SOURCE','TRIAL_STARTS','TRIAL_ENDS','PAID_THROUGH','LAST_COMPLETED_VISIT','GRACE_ENDS','ACCESS_EXPIRES','SQUARE_SUBSCRIPTION_ID','REASON','LAST_ACCESS_CHANGE','OVERRIDE','OVERRIDE_REASON','RECORD_VERSION','PREVIEW_ONLY']
  const sourceText = await readFile(new URL('../lib/preview-entitlement-store.ts', import.meta.url), 'utf8')
  const fieldIds = Object.fromEntries(names.map(name => [name, new RegExp(`${name}: '(fld[^']+)'`).exec(sourceText)![1]]))
  const fields: any = { [fieldIds.SUBJECT_ID]: accountId, [fieldIds.PATIENT_RECORD_ID]: patientId, [fieldIds.TIER]: 'portal_basic', [fieldIds.STATUS]: 'active', [fieldIds.SOURCE]: 'clinic_visit', [fieldIds.RECORD_VERSION]: ENTITLEMENT_RECORD_VERSION, [fieldIds.LAST_ACCESS_CHANGE]: now.toISOString(), [fieldIds.LAST_COMPLETED_VISIT]: '2099-01-01' }
  rows = [{id:other,fields}]
  const store = await load('../lib/preview-entitlement-store.ts', {
    'server-only': {}, './clinic-runtime-policy': { CLINIC_RELEASE_BRANCH: 'release-synthetic', clinicRuntimeMode: () => mode },
    './clinic-consultation-source': { getLinkedClinicConsultationsByPatientId: async () => { consultationReads++; return visits } },
    './clinic-visit-policy': { lastCompletedVisitFromConsultations }, './entitlement-windows': { clinicGraceEndDate },
    './nutrition/synthetic-preview-policy': { SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID: 'synthetic-base', isEntitlementEnforcementPreviewBranch: () => false },
    './clinic-preview-policy': { CLINIC_PREVIEW_BRANCH: 'pilot-synthetic' },
    './entitlement-record': { createCanonicalEntitlementRecord, ENTITLEMENT_RECORD_VERSION },
  }, { process: {env:{VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'release-synthetic',AIRTABLE_BASE_ID:'synthetic-base',AIRTABLE_PAT:'synthetic'}}, URLSearchParams, fetch: async (url: string) => {
    const filter = new URL(url).searchParams.get('filterByFormula')!
    const result = filter.includes('TRUE()') ? rows.filter(row => row.fields[fieldIds.PREVIEW_ONLY] === true) : rows
    return new Response(JSON.stringify({records:result}), {status:200})
  } })
  return { store, fields, fieldIds, setRows:(value:any[])=>{rows=value}, setMode:(value:string)=>{mode=value}, setVisits:(value:any[])=>{visits=value}, reads:()=>consultationReads }
}
test('live access reader refreshes lifecycle from linked consultations, never onboarding snapshot or another patient', async () => {
  const h = await storeHarness()
  h.setVisits([{fields:{'ID Cliente':[other],'Fecha Consulta':'2026-10-27','Tipo de Consulta':'Cliente Nuevo'}}, {fields:{'ID Cliente':[patientId],'Fecha Consulta':'2026-10-26','Tipo de Consulta':'Actualización de peso'}}])
  let source = await h.store.getPortalAccessRecordByPatientRecordId({patientRecordId:patientId,canonicalSubjectId:accountId})
  assert.equal(source.record.lastCompletedVisit,null)
  h.setVisits([{fields:{'ID Cliente':[patientId],'Fecha Consulta':'2026-09-01','Tipo de Consulta':'Cliente Nuevo'}}])
  source = await h.store.getPortalAccessRecordByPatientRecordId({patientRecordId:patientId,canonicalSubjectId:accountId})
  assert.equal(source.record.lastCompletedVisit,'2026-09-01'); assert.equal(source.isOperational,true)
})
test('operational records require exact account subject; duplicate legacy/live records fail closed', async () => {
  const h = await storeHarness()
  await assert.rejects(h.store.getPortalAccessRecordByPatientRecordId({patientRecordId:patientId,canonicalSubjectId:'someone-else'}),/SUBJECT_MISMATCH/)
  assert.equal(h.reads(),0)
  const review = await h.store.getPortalAccessRecordByPatientRecordId({patientRecordId:patientId,canonicalSubjectId:`patient:${patientId}`,reviewOnly:true})
  assert.equal(review.storedSubjectId,accountId)
  h.setRows([{id:other,fields:h.fields},{id:'rec33333333333333',fields:{...h.fields,[h.fieldIds.PREVIEW_ONLY]:true}}])
  await assert.rejects(h.store.getPortalAccessRecordByPatientRecordId({patientRecordId:patientId,canonicalSubjectId:accountId}),/Duplicate/)
})
test('operational grants are invisible when Clinic production is disabled; legacy restriction remains visible', async () => {
  const h = await storeHarness(); h.setMode('disabled')
  assert.equal(await h.store.getPortalAccessRecordByPatientRecordId({patientRecordId:patientId,canonicalSubjectId:accountId}),null)
  h.setRows([{id:other,fields:{...h.fields,[h.fieldIds.PREVIEW_ONLY]:true,[h.fieldIds.STATUS]:'suspended'}}])
  const source = await h.store.getPortalAccessRecordByPatientRecordId({patientRecordId:patientId,canonicalSubjectId:accountId})
  assert.equal(source.record.status,'suspended'); assert.equal(source.isOperational,false)
})
test('a live basic grant denies AI despite legacy current-access and pilot hints', async () => {
  let source: any = {isOperational:true,record:record()}
  const service = await load('../lib/ai-entitlement-access.ts', {
    'server-only':{}, './entitlement-gate':{runEntitlementGateShadow:()=>{}},
    './p3-entitlement-gate':{runP3PreviewEntitlementGate:async()=>({enforced:false,decision:'not_evaluated',policyVersion:'synthetic'})},
    './preview-entitlement-store':{getPortalAccessRecordByPatientRecordId:async()=>source},
    './entitlement-resolver':{resolveCapabilityEntitlement},
  })
  const input = {clerkUserId:accountId,capability:'buddy:chat',currentAccessAllowed:true,hasPilotAccess:true,authenticatedPatientRecordId:patientId}
  assert.equal((await service.evaluateAiEntitlementAccess(input)).allowed,false)
  source = {isOperational:false,record:record()}
  assert.equal((await service.evaluateAiEntitlementAccess(input)).allowed,true)
})

test('eligible trial is anchored to the original consultation and never starts anew at alta', () => {
  const visit = {id:other,date:'2026-10-01',type:'Cliente Nuevo'}
  const plan = planClinicClientOnboarding({...evidence(),eligibleTrialVisit:visit})
  assert.equal(plan.newGrant.tier,'clinic_ai')
  assert.equal(plan.newGrant.trialStarts,'2026-10-01T00:00:00.000Z')
  assert.equal(plan.newGrant.trialEnds,'2026-10-31T00:00:00.000Z')
  assert.equal(planClinicClientOnboarding({...evidence(),eligibleTrialVisit:{...visit,date:'2026-09-01'}}).newGrant.tier,'portal_basic')
  const existing = {airtableRecordId:other,storedSubjectId:accountId,record:record()}
  assert.equal(planClinicClientOnboarding({...evidence(),source:existing,eligibleTrialVisit:visit}).operation,'link_existing')
})

test('eligible client execution stores only the original visit trial window and verifies readback', async () => {
  const h = await harness(true)
  const snapshot = await h.service.resolveClinicClientOnboarding(patientId, now)
  assert.equal(snapshot.review.newGrant.tier,'clinic_ai')
  const result = await h.service.executeClinicClientOnboarding({patientId,fingerprint:snapshot.review.fingerprint,actorEmail:'founder@example.test',now})
  assert.equal(result.verified,true); assert.deepEqual(h.counts(),[1,1])
})
