import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import * as runtime from '../lib/clinic-runtime-policy.ts'
import { administeredNotes, patientIsUnavailable } from '../lib/clinic-patient-administration-policy.ts'

const keys = ['VERCEL_ENV','VERCEL_GIT_COMMIT_REF','MYAQ_CLINIC_ENABLED','MYAQ_CLINIC_WRITES_PAUSED']
async function paused(run: () => Promise<void>) {
  const saved = keys.map(key => process.env[key])
  Object.assign(process.env, { VERCEL_ENV:'production', VERCEL_GIT_COMMIT_REF:'main', MYAQ_CLINIC_ENABLED:'enabled', MYAQ_CLINIC_WRITES_PAUSED:'true' })
  try { await run() } finally { keys.forEach((key,i) => saved[i] === undefined ? delete process.env[key] : process.env[key] = saved[i]) }
}

test('incident pause blocks Clinic writes while retaining operational runtime, patient denial and live record scope', async () => paused(async () => {
  assert.equal(runtime.clinicRuntimeMode(), 'production')
  assert.equal(runtime.clinicWritesPaused(), true)
  assert.throws(runtime.assertClinicSourceWriteAllowed, /CLINIC_WRITES_PAUSED/)
  assert.equal(runtime.clinicUsesPreviewRecords(), false)
  assert.equal(runtime.clinicPlanDraftKey('rec12345678901234'), 'live:rec12345678901234:v1')
  assert.match(runtime.clinicRecordFilter('rec12345678901234','Note Key'), /NOT\(\{Preview Only\}\)/)
  const event = {action:'archive' as const,at:'2026-10-27T12:00:00Z',actor:'synthetic@example.test',reason:'Synthetic pause test'}
  const patient = {id:'rec12345678901234',fields:{'Notas Generales':administeredNotes('', 'archived', event)}}
  assert.equal(patientIsUnavailable(patient), true)
  delete process.env.MYAQ_CLINIC_WRITES_PAUSED
  assert.doesNotThrow(runtime.assertClinicSourceWriteAllowed)
  assert.equal(patientIsUnavailable(patient), true)
}))

test('pause rejects administration, onboarding and renewal before contacting providers', async () => paused(async () => {
  for (const [file, entry] of [
    ['clinic-patient-administration','executePatientAdministration'],
    ['clinic-client-onboarding','executeClinicClientOnboarding'],
    ['clinic-access-renewal','executeClinicAccessRenewal'],
  ]) {
    const source = await readFile(new URL(`../lib/${file}.ts`,import.meta.url),'utf8')
    const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
    let providerCalls = 0
    const forbidden = () => { providerCalls++; throw new Error('Provider must not be called') }
    const provider = new Proxy({PREVIEW_ENTITLEMENT_FIELDS:{}},{get:(target,key)=>key in target ? target[key as keyof typeof target] : forbidden})
    const exports: Record<string,Function> = {}
    vm.runInNewContext(code,{exports,process,require:(id:string)=>id==='./clinic-runtime-policy' ? runtime : provider,fetch:forbidden})
    await assert.rejects(exports[entry]({patientId:'rec12345678901234',action:'archive',fingerprint:'synthetic',actorEmail:'synthetic@example.test'}), /CLINIC_WRITES_PAUSED/)
    assert.equal(providerCalls,0,entry)
  }
}))
