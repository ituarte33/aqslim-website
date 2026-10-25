import assert from 'node:assert/strict'
import test from 'node:test'
import { getClinicPortalWeights } from '../lib/clinic-portal-weight-store.ts'
import { CLINIC_PORTAL_WEIGHT_FIELDS as F } from '../lib/clinic-portal-weight.ts'
import { SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID } from '../lib/nutrition/synthetic-preview-policy.ts'

test('preview weight reader is gated, paginated, patient-scoped and read only', async () => {
  const originalFetch = globalThis.fetch
  const keys = ['VERCEL_ENV', 'VERCEL_GIT_COMMIT_REF', 'AIRTABLE_BASE_ID', 'AIRTABLE_PAT']
  const saved = keys.map(key => process.env[key])
  let calls = 0
  const patient = 'recRdlkniEv0MB4gT'
  const record = {id: 'rec12345678901234', fields: {
    [F.patientId]: patient, [F.patient]: [patient], [F.preview]: true,
    [F.type]: 'Actualización de peso', [F.date]: '2026-10-24', [F.weight]: 222, [F.unit]: 'lb',
  }}
  try {
    Object.assign(process.env, {VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'myaq-clinic-functional-v1', AIRTABLE_BASE_ID: SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID, AIRTABLE_PAT: 'test-only'})
    globalThis.fetch = async (input, init) => {
      calls++
      assert.ok(!init?.method || init.method === 'GET')
      assert.equal(init?.cache, 'no-store')
      const url = new URL(String(input))
      assert.ok(url.searchParams.get('filterByFormula')?.includes(patient))
      if (calls === 1) return Response.json({records: [record], offset: 'page2'})
      assert.equal(url.searchParams.get('offset'), 'page2')
      return Response.json({records: [record, {...record, id: 'rec22345678901234', fields: {...record.fields, [F.patientId]: 'rec32345678901234'}}]})
    }
    assert.deepEqual(await getClinicPortalWeights(patient, 'lb'), [])
    process.env.VERCEL_ENV = 'preview'
    process.env.VERCEL_GIT_COMMIT_REF = 'main'
    assert.deepEqual(await getClinicPortalWeights(patient, 'lb'), [])
    process.env.VERCEL_GIT_COMMIT_REF = 'myaq-clinic-functional-v1'
    process.env.AIRTABLE_BASE_ID = 'wrong-base'
    assert.deepEqual(await getClinicPortalWeights(patient, 'lb'), [])
    assert.equal(calls, 0)
    process.env.AIRTABLE_BASE_ID = SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID
    const weights = await getClinicPortalWeights(patient, 'lb')
    assert.equal(calls, 2)
    assert.equal(weights.length, 1)
    assert.equal(weights[0].weight, 222)
    globalThis.fetch = async () => new Response('', {status: 503})
    await assert.rejects(getClinicPortalWeights(patient, 'lb'), /UNAVAILABLE/)
  } finally {
    globalThis.fetch = originalFetch
    keys.forEach((key, index) => saved[index] === undefined ? delete process.env[key] : process.env[key] = saved[index])
  }
})
