import test from 'node:test'
import assert from 'node:assert/strict'
import { getConsultasRevenueSummary } from '../lib/airtable.ts'

test('monthly AQSLIM summary includes a second Airtable page', async t => {
  const previous = globalThis.fetch
  t.after(() => { globalThis.fetch = previous })
  const urls: URL[] = []
  globalThis.fetch = async input => {
    const url = new URL(String(input)); urls.push(url)
    const second = url.searchParams.has('offset')
    return Response.json({ records: [{ id: second ? 'recSecond' : 'recFirst', fields: { 'Monto Cobrado ($)': second ? 40 : 30, 'Método de Pago': second ? 'Venmo' : 'Efectivo', 'Fecha Consulta': '2026-11-10' } }], ...(second ? {} : { offset: 'page 2' }) })
  }
  const summary = await getConsultasRevenueSummary()
  assert.equal(summary.total, 70)
  assert.equal(summary.cash, 30)
  assert.equal(summary.other, 40)
  assert.equal(summary.consultaCount, 2)
  assert.equal(urls.length, 2)
  assert.equal(urls[1].searchParams.get('offset'), 'page 2')
})
