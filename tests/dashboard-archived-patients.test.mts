import test from 'node:test'
import assert from 'node:assert/strict'
import { getClientesPage, getConsultasForPatient } from '../lib/airtable.ts'
import { administeredNotes } from '../lib/clinic-patient-administration-policy.ts'

test('client pagination advances past hidden archived pages and permits an explicit historical view', async t => {
  const previous = globalThis.fetch
  t.after(() => { globalThis.fetch = previous })
  const archived = { id: 'rec12345678901234', fields: { 'Notas Generales': administeredNotes('', 'archived', { action: 'archive', at: '2026-11-10T12:00:00Z', actor: 'synthetic', reason: 'fixture' }) } }
  const active = { id: 'rec22345678901234', fields: { 'Nombre Completo': 'Synthetic Active' } }
  const calls: URL[] = []
  globalThis.fetch = async input => {
    const url = new URL(String(input)); calls.push(url)
    return Response.json(url.searchParams.has('offset') ? { records: [active] } : { records: [archived], offset: 'second' })
  }
  assert.deepEqual((await getClientesPage()).records.map(patient => patient.id), [active.id])
  assert.equal(calls.length, 2)
  assert.deepEqual((await getClientesPage({ includeInactive: true })).records.map(patient => patient.id), [archived.id])
})

test('merged consultation history uses exact reciprocal record links without a patient-name lookup', async t => {
  const previous = globalThis.fetch
  t.after(() => { globalThis.fetch = previous })
  const id = 'recABCDEFGHIJKLMN'
  let reads = 0
  globalThis.fetch = async input => {
    assert.ok(String(input).endsWith(`/Consultas/${id}`)); reads++
    return Response.json({ id, fields: { 'Fecha Consulta': '2026-09-14', 'ID Cliente': ['recOriginal12345'] } })
  }
  const records = await getConsultasForPatient({ id: 'rec12345678901234', fields: { Consultas: [id, id] } } as any)
  assert.equal(records.length, 1); assert.equal(reads, 1)
  assert.equal((await getConsultasForPatient({ id: 'rec12345678901234', fields: {} } as any)).length, 0)
  await assert.rejects(getConsultasForPatient({ id: 'rec12345678901234', fields: { Consultas: ['bad'] } } as any))
})
