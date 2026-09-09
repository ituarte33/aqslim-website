import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { calculateSupplementSale, supplementReceiptLines } from '../lib/supplement-sales.ts'

// Load the production TypeScript modules without Next's server-only bootstrap.
const urls = new Map<string, string>()
function moduleUrl(path: string) {
  const existing = urls.get(path)
  if (existing) return existing
  let source = readFileSync(new URL(path, import.meta.url), 'utf8')
  source = source.replace(/from '\.\.\/\.\.\/\.\.\/lib\/supplement-sales'/g, `from '${new URL('../lib/supplement-sales.ts', import.meta.url).href}'`)
  if (path.endsWith('sale-persistence.ts')) source = source.replace("from './sale-service'", `from '${moduleUrl('../app/dashboard/ventas-suplementos/sale-service.ts')}'`)
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText
  const url = `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`
  urls.set(path, url)
  return url
}
const { prepareSupplementSale, runSupplementSale } = await import(moduleUrl('../app/dashboard/ventas-suplementos/sale-service.ts'))
const { createSaleCommitter, SaleProviderError } = await import(moduleUrl('../app/dashboard/ventas-suplementos/sale-persistence.ts'))
const items = [
  { id: 'rec11111111111111', nombre: 'Colon Optimizer - Fiber', cantidad: 2, precio: 24 },
  { id: 'rec22222222222222', nombre: 'Veggie Laxative', cantidad: 2, precio: 18 },
  { id: 'rec33333333333333', nombre: 'AQ JOINTS', cantidad: 3, precio: 22 },
]
function form(overrides: Record<string, string> = {}) {
  const data = new FormData()
  for (const [key, value] of Object.entries({ requestId: crypto.randomUUID(), fecha: '2026-09-08', metodoPago: 'Tarjeta', shipping: '24', items: JSON.stringify(items), ...overrides })) data.set(key, value)
  return data
}
function fixture() {
  const events: string[] = []
  const stocks = new Map(items.map(item => [item.id, 20]))
  const receipts = new Map()
  const deps = {
    authorize: async () => {},
    getProducts: async () => items.map(item => ({ id: item.id, fields: { Nombre: item.nombre, 'Precio de Venta ($)': item.precio } })),
    getCustomer: async (id: string) => { events.push('customer'); return { id } },
    logUnexpected: () => { events.push('logged') },
  }
  const db = {
    find: async (id: string) => receipts.get(id) ?? null,
    create: async (sale: any) => {
      events.push('create')
      const receipt = { id: 'rec44444444444444', ...sale.receipt }
      receipts.set(sale.requestId, receipt)
      return receipt
    },
  }
  const commit = createSaleCommitter({ find: (id: string) => db.find(id), create: (sale: any) => db.create(sale) })
  return { events, stocks, deps, db, commit, receipts }
}

test('walk-in sale has no client link and is supplement-only', async () => {
  const f = fixture(); const sale = await prepareSupplementSale(form(), f.deps)
  assert.equal(sale.fields['ID Cliente'], undefined)
  assert.equal(sale.fields['Tipo de Consulta'], 'Suplementos')
  assert.equal(sale.fields['Consulta Cobrado ($)'], 0)
  assert.ok(!f.events.includes('customer'))
})
test('linked customer is verified and linked', async () => {
  const f = fixture(); const id = 'rec55555555555555'
  const sale = await prepareSupplementSale(form({ clienteRecordId: id }), f.deps)
  assert.deepEqual(sale.fields['ID Cliente'], [id]); assert.ok(f.events.includes('customer'))
})
test('zero shipping preserves product totals', async () => {
  const f = fixture(); const sale = await prepareSupplementSale(form({ shipping: '0' }), f.deps)
  assert.equal(sale.receipt.totals.total, 150); assert.equal(sale.fields['Envio (Shipping) Cobrado ($)'], 0)
})
test('shipping is stored separately: products 150, shipping 24, collected 174', async () => {
  const sale = await prepareSupplementSale(form(), fixture().deps)
  assert.equal(sale.fields['Suplemento(s) Cobrado ($)'], 150)
  assert.equal(sale.fields['Envio (Shipping) Cobrado ($)'], 24)
  assert.equal(sale.fields['Monto Cobrado ($)'], 174)
})
for (const value of ['-1', 'NaN', 'Infinity', 'abc', '0.001', '1000001']) test(`rejects shipping ${value}`, async () => {
  await assert.rejects(prepareSupplementSale(form({ shipping: value }), fixture().deps), /El monto de envío no es válido/)
})
test('requires a payment method', async () => {
  await assert.rejects(prepareSupplementSale(form({ metodoPago: '' }), fixture().deps), /Selecciona una forma de pago/)
})
test('rejects an empty cart', async () => {
  await assert.rejects(prepareSupplementSale(form({ items: '[]' }), fixture().deps), /Agrega al menos un suplemento/)
})
for (const value of ['[null]', '[{}]', '[{"id":"x","cantidad":1.5}]']) test(`rejects malformed cart ${value}`, async () => {
  await assert.rejects(prepareSupplementSale(form({ items: value }), fixture().deps), /suplementos o cantidades/)
})
test('maps Tarjeta to the verified Airtable Card option', async () => {
  const sale = await prepareSupplementSale(form(), fixture().deps)
  assert.equal(sale.fields['Método de Pago'], 'Card')
})
test('valid save returns a serializable receipt and preserves inventory pending ownership verification', async () => {
  const f = fixture(); const result = await runSupplementSale(form(), { ...f.deps, commit: f.commit })
  assert.equal(result.ok, true); assert.equal(result.receipt.totals.total, 174)
  assert.deepEqual([...f.stocks.values()], [20, 20, 20])
  assert.equal(f.events.filter(e => e.startsWith('stock:')).length, 0)
  assert.deepEqual(result.receipt.items.map((item: any) => item.cantidad), [2, 2, 3])
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result)
})
test('discount and tax affect collected total without inflating shipping or product revenue', () => {
  const totals = calculateSupplementSale(items, 10, 5, 24)
  assert.equal(totals.subtotal, 150); assert.equal(totals.supplementTotal, 140); assert.equal(totals.total, 169)
})
test('receipt displays products, discount, tax, shipping and total separately', () => {
  assert.deepEqual(supplementReceiptLines(calculateSupplementSale(items, 0, 0, 24)), [
    { label: 'Productos', amount: 150 }, { label: 'Descuento', amount: -0 }, { label: 'Impuesto', amount: 0 }, { label: 'Envío', amount: 24 }, { label: 'Total', amount: 174 },
  ])
})
test('failed sale creation never decrements inventory or returns a receipt', async () => {
  const f = fixture(); f.db.create = async () => { throw new Error('secret provider error') }
  const data = form(); const result = await runSupplementSale(data, { ...f.deps, commit: f.commit })
  assert.equal(result.ok, false); assert.deepEqual([...f.stocks.values()], [20, 20, 20])
  assert.ok(!JSON.stringify(result).includes('secret')); assert.ok(!('receipt' in result))
  const retry = await runSupplementSale(data, { ...f.deps, commit: f.commit })
  assert.match(retry.message, /este reintento no creará un duplicado/)
})
test('repeat submission returns the same receipt without another sale or decrement', async () => {
  const f = fixture(); const data = form()
  const a = await runSupplementSale(data, { ...f.deps, commit: f.commit })
  const b = await runSupplementSale(data, { ...f.deps, commit: f.commit })
  assert.deepEqual(a, b); assert.equal(f.events.filter(e => e === 'create').length, 1)
  assert.deepEqual([...f.stocks.values()], [20, 20, 20])
})
test('concurrent duplicate requests cannot both commit', async () => {
  const f = fixture(); const data = form()
  const results = await Promise.all([runSupplementSale(data, { ...f.deps, commit: f.commit }), runSupplementSale(data, { ...f.deps, commit: f.commit })])
  assert.equal(results.filter(r => r.ok).length, 2); assert.equal(f.events.filter(e => e === 'create').length, 1)
})
test('shipping does not create an extra inventory item', async () => {
  const sale = await prepareSupplementSale(form(), fixture().deps)
  assert.deepEqual(sale.inventory.map((item: any) => ({ id: item.id, quantity: item.quantity })), items.map(item => ({ id: item.id, quantity: item.cantidad })))
})
test('lost create response recovers the saved receipt without another POST', async () => {
  const f = fixture(); const original = f.db.create
  f.db.create = async sale => { await original(sale); throw new Error('response lost') }
  const data = form()
  assert.equal((await runSupplementSale(data, { ...f.deps, commit: f.commit })).ok, false)
  const retry = await runSupplementSale(data, { ...f.deps, commit: f.commit })
  assert.equal(retry.ok, true); assert.equal(f.events.filter(e => e === 'create').length, 1)
})
test('a fresh server instance recovers a completed sale from Airtable', async () => {
  const f = fixture(); const data = form()
  const first = await runSupplementSale(data, { ...f.deps, commit: f.commit })
  const freshCommit = createSaleCommitter(f.db)
  const second = await runSupplementSale(data, { ...f.deps, commit: freshCommit })
  assert.deepEqual(first, second); assert.equal(f.events.filter(e => e === 'create').length, 1)
})
test('definite rejected write permits correction and retry', async () => {
  const f = fixture(); const original = f.db.create
  f.db.create = async () => { throw new SaleProviderError(422) }
  const data = form()
  assert.equal((await runSupplementSale(data, { ...f.deps, commit: f.commit })).ok, false)
  f.db.create = original
  assert.equal((await runSupplementSale(data, { ...f.deps, commit: f.commit })).ok, true)
})
test('Otro is rejected and Transferencia uses the existing Airtable option', async () => {
  const f = fixture()
  await assert.rejects(prepareSupplementSale(form({ metodoPago: 'Otro' }), f.deps), /Selecciona una forma de pago/)
  const sale = await prepareSupplementSale(form({ metodoPago: 'Transferencia' }), f.deps)
  assert.equal(sale.fields['Método de Pago'], 'Transferencia')
})
test('expected validation returns Spanish data instead of throwing across RSC', async () => {
  const f = fixture()
  const result = await runSupplementSale(form({ shipping: '-24' }), { ...f.deps, commit: f.commit })
  assert.deepEqual(result, { ok: false, message: 'El monto de envío no es válido.' })
  assert.ok(!f.events.includes('create')); assert.ok(!f.events.includes('logged'))
})

test('the production Airtable payload uses governed IDs, Card, and one write with no inventory call', async t => {
  const { createSavedSale } = await import(moduleUrl('../app/dashboard/ventas-suplementos/sale-persistence.ts'))
  const oldBase = process.env.AIRTABLE_BASE_ID; const oldPat = process.env.AIRTABLE_PAT
  process.env.AIRTABLE_BASE_ID = 'synthetic-base'; process.env.AIRTABLE_PAT = 'synthetic-token'
  t.after(() => { if (oldBase === undefined) delete process.env.AIRTABLE_BASE_ID; else process.env.AIRTABLE_BASE_ID = oldBase; if (oldPat === undefined) delete process.env.AIRTABLE_PAT; else process.env.AIRTABLE_PAT = oldPat })
  const calls: any[] = []
  t.mock.method(globalThis, 'fetch', async (url: string, options: any) => {
    calls.push({ url, options }); return Response.json({ id: 'rec44444444444444' })
  })
  const sale = await prepareSupplementSale(form(), fixture().deps)
  await createSavedSale(sale)
  assert.equal(calls.length, 1); assert.equal(calls[0].options.method, 'POST')
  const fields = JSON.parse(calls[0].options.body).fields
  assert.equal(fields.fldQmGAfuC8VedVac, 150); assert.equal(fields.fldEaHNuZQaF9dJOm, 24)
  assert.equal(fields.fldy4827OopECJivK, 174); assert.equal(fields.flduOI73qhsjzailL, 'Card')
  assert.ok(!('fldF0RVTPAsTOdzdm' in fields))
  assert.match(fields.fldtCuN8vn9O3xD7v, /Envío \(Shipping\): \$24.00/)
  assert.match(fields.fldtCuN8vn9O3xD7v, /AQSLIM Venta:/)
})

test('supplement-only shipping sale does not count as any consultation', async () => {
  const { getFinanceMetrics } = await import('../lib/finance-metrics.ts')
  const metrics = getFinanceMetrics([{ date: '2026-09-08', tipoConsulta: 'Suplementos', montoCobrado: 174, suppTotal: 150, shippingTotal: 24, paciente: '' }])
  assert.equal(metrics.visitCount, 0); assert.equal(metrics.newVisitCount, 0)
  assert.equal(metrics.subsequentVisitCount, 0); assert.equal(metrics.restartVisitCount, 0)
  assert.equal(metrics.supplementRevenue, 150); assert.equal(metrics.shippingRevenue, 24)
})

// Exercise the real HTTP adapter, not a separate mock inventory implementation.
for (const status of [422, 429, 403, 500]) test(`HTTP ${status} returns safe failure data without a receipt or inventory write`, async t => {
  const { findSavedSale, createSavedSale } = await import(moduleUrl('../app/dashboard/ventas-suplementos/sale-persistence.ts'))
  const oldBase = process.env.AIRTABLE_BASE_ID; const oldPat = process.env.AIRTABLE_PAT
  process.env.AIRTABLE_BASE_ID = 'synthetic-base'; process.env.AIRTABLE_PAT = 'synthetic-token'
  t.after(() => {
    if (oldBase === undefined) delete process.env.AIRTABLE_BASE_ID; else process.env.AIRTABLE_BASE_ID = oldBase
    if (oldPat === undefined) delete process.env.AIRTABLE_PAT; else process.env.AIRTABLE_PAT = oldPat
  })
  const calls: Array<{ url: string; method: string }> = []
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    const method = options.method ?? 'GET'
    calls.push({ url, method })
    return method === 'GET' ? Response.json({ records: [] })
      : Response.json({ error: { message: 'private provider details' } }, { status })
  })
  const commit = createSaleCommitter({ find: findSavedSale, create: createSavedSale })
  const result = await runSupplementSale(form(), { ...fixture().deps, commit })
  assert.equal(result.ok, false)
  assert.ok(!('receipt' in result))
  assert.doesNotMatch(JSON.stringify(result), /private provider details|Server Components/)
  assert.match(result.message, status < 500 ? /no se guardó/i : /No se pudo confirmar/)
  assert.deepEqual(calls.map(call => call.method), ['GET', 'POST'])
  assert.ok(calls.every(call => call.url.includes('/tblCA6HruBsrZdXbZ')))
})

test('walk-in HTTP save and receipt recovery preserve the exact 2/2/3 sale with $24 shipping', async t => {
  const { findSavedSale, createSavedSale } = await import(moduleUrl('../app/dashboard/ventas-suplementos/sale-persistence.ts'))
  const oldBase = process.env.AIRTABLE_BASE_ID; const oldPat = process.env.AIRTABLE_PAT
  process.env.AIRTABLE_BASE_ID = 'synthetic-base'; process.env.AIRTABLE_PAT = 'synthetic-token'
  t.after(() => {
    if (oldBase === undefined) delete process.env.AIRTABLE_BASE_ID; else process.env.AIRTABLE_BASE_ID = oldBase
    if (oldPat === undefined) delete process.env.AIRTABLE_PAT; else process.env.AIRTABLE_PAT = oldPat
  })
  let stored: any = null
  let writes = 0
  t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    if (options.method !== 'POST') return Response.json({ records: stored ? [stored] : [] })
    writes++
    const body = JSON.parse(String(options.body))
    assert.ok(!('typecast' in body))
    assert.ok(!('fldF0RVTPAsTOdzdm' in body.fields))
    assert.equal(body.fields.flduOI73qhsjzailL, 'Card')
    assert.equal(body.fields.fldQmGAfuC8VedVac, 150)
    assert.equal(body.fields.fldEaHNuZQaF9dJOm, 24)
    assert.equal(body.fields.fldy4827OopECJivK, 174)
    stored = { id: 'rec44444444444444', fields: { 'Notas del Terapeuta': body.fields.fldtCuN8vn9O3xD7v } }
    return Response.json(stored)
  })
  const deps = fixture().deps
  const data = form()
  const result = await runSupplementSale(data, { ...deps, commit: createSaleCommitter({ find: findSavedSale, create: createSavedSale }) })
  assert.equal(result.ok, true)
  assert.deepEqual(result.receipt.items, items)
  assert.deepEqual(result.receipt.items.map((item: any) => item.precio * item.cantidad), [48, 36, 66])
  assert.equal(result.receipt.totals.subtotal, 150)
  assert.equal(result.receipt.totals.shipping, 24)
  assert.equal(result.receipt.totals.total, 174)
  const recovered = await runSupplementSale(data, { ...deps, commit: createSaleCommitter({ find: findSavedSale, create: createSavedSale }) })
  assert.deepEqual(recovered, result)
  assert.equal(writes, 1)
})

test('authorization rejection never reaches customer, product, or persistence operations', async () => {
  const f = fixture()
  const result = await runSupplementSale(form(), {
    ...f.deps,
    authorize: async () => { throw new Error('private auth error') },
    getProducts: async () => { assert.fail('must authorize before reading products') },
    commit: async () => { assert.fail('must authorize before saving') },
  })
  assert.equal(result.ok, false)
  assert.ok(!('receipt' in result))
  assert.doesNotMatch(JSON.stringify(result), /private auth error/)
})
