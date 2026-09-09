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
  if (!path.endsWith('sale-service.ts')) source = source.replace("from './sale-service'", `from '${moduleUrl('../app/dashboard/ventas-suplementos/sale-service.ts')}'`)
  if (source.includes("from './inventory-service'")) source = source.replace("from './inventory-service'", `from '${moduleUrl('../app/dashboard/ventas-suplementos/inventory-service.ts')}'`)
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
    getProducts: async () => items.map(item => ({ id: item.id, fields: { Nombre: item.nombre, 'Precio de Venta ($)': item.precio, 'Inventario Actual': 20 } })),
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

const { createInventoryWriter, assertInventoryConfirmed } = await import(moduleUrl('../app/dashboard/ventas-suplementos/inventory-service.ts'))
const { previewSeptember8Reconciliation, executeSeptember8Reconciliation, SEPTEMBER_8_CONFIRMATION } = await import(moduleUrl('../app/dashboard/ventas-suplementos/historical-reconciliation.ts'))

function inventoryFixture() {
  const base = fixture()
  const stock = new Map(items.map(item => [item.id, 20]))
  const saved = new Map<string, any>()
  const events: string[] = []
  const io = {
    assertNoPending: async () => {
      if ([...saved.values()].some(record => record.journal.state !== 'complete')) throw new Error('pending inventory')
    },
    readStock: async (id: string) => stock.get(id),
    create: async (sale: any, journal: any) => {
      events.push('create')
      const receipt = { id: 'rec44444444444444', ...sale.receipt }
      saved.set(sale.requestId, { receipt, sale, journal: structuredClone(journal) })
      return receipt
    },
    journal: async (_id: string, sale: any, journal: any) => {
      events.push('journal:' + journal.state)
      saved.get(sale.requestId).journal = structuredClone(journal)
    },
    writeStock: async (id: string, value: number) => { events.push('stock:' + id); stock.set(id, value) },
    removeSale: async () => { events.push('remove'); saved.clear() },
    isRejected: (error: unknown) => error instanceof SaleProviderError && error.status >= 400 && error.status < 500 && error.status !== 408,
  }
  const writer = createInventoryWriter(io)
  const persistence = {
    onRecovered: writer.confirmed,
    find: async (id: string) => {
      const record = saved.get(id)
      if (!record) return null
      assertInventoryConfirmed('AQSLIM Inventario: ' + JSON.stringify(record.journal))
      return record.receipt
    },
    create: writer,
  }
  return { base, stock, saved, events, io, persistence, commit: createSaleCommitter(persistence) }
}

test('inventory owner decrements exactly 2/2/3 after the financial sale is persisted', async () => {
  const f = inventoryFixture(); const data = form()
  const result = await runSupplementSale(data, { ...f.base.deps, commit: f.commit })
  assert.equal(result.ok, true); assert.deepEqual([...f.stock.values()], [18, 18, 17])
  assert.equal(f.events[0], 'create'); assert.equal(f.events.filter(e => e.startsWith('stock:')).length, 3)
  assert.equal(f.saved.get(data.get('requestId')).journal.state, 'complete')
})

test('insufficient inventory prevents the sale and every stock write; corrected retry works', async () => {
  const f = inventoryFixture(); f.stock.set(items[1].id, 1)
  const data = form()
  const result = await runSupplementSale(data, { ...f.base.deps, commit: f.commit })
  assert.equal(result.ok, false); assert.match(result.message, /inventario suficiente/)
  assert.deepEqual(f.events, []); assert.deepEqual([...f.stock.values()], [20, 1, 20])
  f.stock.set(items[1].id, 20)
  assert.equal((await runSupplementSale(data, { ...f.base.deps, commit: f.commit })).ok, true)
})

for (const value of [-1, undefined, NaN, 1.5]) test(`invalid inventory ${value} is rejected before creating a sale`, async () => {
  const f = inventoryFixture(); f.stock.set(items[0].id, value as number)
  assert.equal((await runSupplementSale(form(), { ...f.base.deps, commit: f.commit })).ok, false)
  assert.deepEqual(f.events, [])
})

test('inventory may reach exactly zero and can never be written below zero', async () => {
  const f = inventoryFixture(); items.forEach(item => f.stock.set(item.id, item.cantidad))
  assert.equal((await runSupplementSale(form(), { ...f.base.deps, commit: f.commit })).ok, true)
  assert.deepEqual([...f.stock.values()], [0, 0, 0])
  assert.equal((await runSupplementSale(form(), { ...f.base.deps, commit: f.commit })).ok, false)
})

test('failed financial POST makes no stock changes', async () => {
  const f = inventoryFixture(); f.io.create = async () => { throw new SaleProviderError(422) }
  const result = await runSupplementSale(form(), { ...f.base.deps, commit: f.commit })
  assert.equal(result.ok, false); assert.deepEqual([...f.stock.values()], [20, 20, 20]); assert.deepEqual(f.events, [])
})

test('double submit and repeated completed requests decrement only once', async () => {
  const f = inventoryFixture(); const data = form()
  const results = await Promise.all([1, 2].map(() => runSupplementSale(data, { ...f.base.deps, commit: f.commit })))
  assert.deepEqual(results[0], results[1]); assert.equal(results[0].ok, true)
  assert.equal((await runSupplementSale(data, { ...f.base.deps, commit: f.commit })).ok, true)
  const freshCommit = createSaleCommitter({ ...f.persistence, create: createInventoryWriter(f.io) })
  assert.equal((await runSupplementSale(data, { ...f.base.deps, commit: freshCommit })).ok, true)
  assert.deepEqual([...f.stock.values()], [18, 18, 17]); assert.equal(f.events.filter(e => e === 'create').length, 1)
})

test('distinct simultaneous sales in one instance serialize inventory reads and writes', async () => {
  const f = inventoryFixture()
  const results = await Promise.all([form(), form()].map(data => runSupplementSale(data, { ...f.base.deps, commit: f.commit })))
  assert.ok(results.every(result => result.ok)); assert.deepEqual([...f.stock.values()], [16, 16, 14])
})

test('shipping, tax and discount never change inventory quantities', async () => {
  const f = inventoryFixture()
  const result = await runSupplementSale(form({ shipping: '24', tax: '5', discount: '10' }), { ...f.base.deps, commit: f.commit })
  assert.equal(result.receipt.totals.total, 169); assert.deepEqual([...f.stock.values()], [18, 18, 17])
})

test('definite inventory rejection restores applied stock and removes the failed sale', async () => {
  const f = inventoryFixture(); const original = f.io.writeStock
  f.io.writeStock = async (id, value) => { if (id === items[1].id) throw new SaleProviderError(422); return original(id, value) }
  const data = form()
  assert.equal((await runSupplementSale(data, { ...f.base.deps, commit: f.commit })).ok, false)
  assert.deepEqual([...f.stock.values()], [20, 20, 20]); assert.equal(f.saved.size, 0); assert.ok(f.events.includes('remove'))
  f.io.writeStock = original
  assert.equal((await runSupplementSale(data, { ...f.base.deps, commit: f.commit })).ok, true)
  assert.deepEqual([...f.stock.values()], [18, 18, 17])
})

test('lost stock response persists pending state; retries and fresh instances do not decrement again', async () => {
  const f = inventoryFixture(); const original = f.io.writeStock
  f.io.writeStock = async (id, value) => { await original(id, value); throw new Error('lost response') }
  const data = form()
  assert.equal((await runSupplementSale(data, { ...f.base.deps, commit: f.commit })).ok, false)
  assert.deepEqual([...f.stock.values()], [18, 20, 20])
  assert.equal((await runSupplementSale(data, { ...f.base.deps, commit: f.commit })).ok, false)
  const freshCommit = createSaleCommitter({ ...f.persistence, create: createInventoryWriter(f.io) })
  assert.equal((await runSupplementSale(form(), { ...f.base.deps, commit: freshCommit })).ok, false)
  assert.deepEqual([...f.stock.values()], [18, 20, 20]); assert.equal(f.events.filter(e => e.startsWith('stock:')).length, 1)
})

test('failed rollback keeps the journal pending and prevents further sales', async () => {
  const f = inventoryFixture(); const original = f.io.writeStock
  f.io.writeStock = async (id, value) => { if (id === items[1].id || value === 20) throw new SaleProviderError(422); return original(id, value) }
  assert.equal((await runSupplementSale(form(), { ...f.base.deps, commit: f.commit })).ok, false)
  assert.equal(f.saved.size, 1)
  assert.equal((await runSupplementSale(form(), { ...f.base.deps, commit: f.commit })).ok, false)
})

test('historical preview checks existing $174 records before catalog access', async () => {
  const candidate = { id: 'rec66666666666666', fields: { 'Monto Cobrado ($)': 174 } }
  const preview = await previewSeptember8Reconciliation({ findCandidates: async () => [candidate], getProducts: async () => { assert.fail('catalog must not be queried when a candidate already exists') } })
  assert.equal(preview.status, 'review'); assert.deepEqual(preview.recordIds, [candidate.id])
})

test('exact historical $174 candidate is a no-op, including inventory', async () => {
  const sale = await prepareSupplementSale(form(), fixture().deps)
  const result = await executeSeptember8Reconciliation(SEPTEMBER_8_CONFIRMATION, {
    authorize: async () => {}, findCandidates: async () => [{ id: 'rec66666666666666', fields: sale.fields }],
    getProducts: async () => { assert.fail('no catalog needed') }, commit: async () => { assert.fail('no historical write permitted for existing sale') },
  })
  assert.equal(result.status, 'existing')
})

test('exact $174 reconciliation plan fixes historical prices and uses Card with zero consultation', async () => {
  const products = (await fixture().deps.getProducts()).map(product => ({ ...product, fields: { ...product.fields, 'Precio de Venta ($)': 999 } }))
  const preview = await previewSeptember8Reconciliation({ findCandidates: async () => [], getProducts: async () => products })
  assert.equal(preview.status, 'ready')
  assert.deepEqual(preview.sale.receipt.items, items)
  assert.equal(preview.sale.fields['Monto Cobrado ($)'], 174); assert.equal(preview.sale.fields['Suplemento(s) Cobrado ($)'], 150)
  assert.equal(preview.sale.fields['Envio (Shipping) Cobrado ($)'], 24); assert.equal(preview.sale.fields['Consulta Cobrado ($)'], 0)
  assert.equal(preview.sale.fields['Método de Pago'], 'Card'); assert.equal(preview.sale.fields['Tipo de Consulta'], 'Suplementos')
  assert.equal(preview.sale.fields['Fecha Consulta'], '2026-09-08')
})

test('historical execution requires exact confirmation and authenticated authorization', async () => {
  let authorized = false
  await assert.rejects(executeSeptember8Reconciliation('', {
    authorize: async () => { authorized = true }, findCandidates: async () => { assert.fail('no query without confirmation') },
    getProducts: async () => [], commit: async () => { assert.fail('no write') },
  }), /confirmation_required/)
  assert.equal(authorized, true)
})

test('historical execution is one-time with the same durable identity and 2/2/3 decrement', async () => {
  const f = inventoryFixture()
  const deps = {
    authorize: async () => {}, getProducts: f.base.deps.getProducts,
    findCandidates: async () => [...f.saved.values()].map(record => ({ id: record.receipt.id, fields: record.sale.fields })),
    commit: f.commit,
  }
  assert.equal((await executeSeptember8Reconciliation(SEPTEMBER_8_CONFIRMATION, deps)).status, 'completed')
  assert.equal((await executeSeptember8Reconciliation(SEPTEMBER_8_CONFIRMATION, deps)).status, 'existing')
  assert.deepEqual([...f.stock.values()], [18, 18, 17]); assert.equal(f.saved.size, 1)
})

test('historical preview blocks the observed negative stocks without writing anything', async () => {
  const products = (await fixture().deps.getProducts()).map((product, index) => ({ ...product, fields: { ...product.fields, 'Inventario Actual': [-365, 90, -3][index] } }))
  const result = await executeSeptember8Reconciliation(SEPTEMBER_8_CONFIRMATION, {
    authorize: async () => {}, findCandidates: async () => [], getProducts: async () => products,
    commit: async () => { assert.fail('negative stock must block historical execution') },
  })
  assert.equal(result.status, 'blocked'); assert.equal(result.issues.length, 2)
  assert.equal(result.sale.fields['Monto Cobrado ($)'], 174)
})

test('historical execution rechecks for a new candidate after an earlier empty preview', async () => {
  const f = fixture(); let exists = false
  const deps = { getProducts: f.deps.getProducts, findCandidates: async () => exists ? [{ id: 'rec66666666666666', fields: { 'Monto Cobrado ($)': 174 } }] : [] }
  assert.equal((await previewSeptember8Reconciliation(deps)).status, 'ready')
  exists = true
  const result = await executeSeptember8Reconciliation(SEPTEMBER_8_CONFIRMATION, { ...deps, authorize: async () => {}, commit: async () => { assert.fail('must not trust a stale preview') } })
  assert.equal(result.status, 'review')
})

test('actual inventory HTTP adapter writes only Airtable stock fields after POST and recovers without another decrement', async t => {
  const { inventoryPersistence, findSavedSale } = await import(moduleUrl('../app/dashboard/ventas-suplementos/sale-persistence.ts'))
  const oldBase = process.env.AIRTABLE_BASE_ID; const oldPat = process.env.AIRTABLE_PAT
  process.env.AIRTABLE_BASE_ID = 'synthetic-base'; process.env.AIRTABLE_PAT = 'synthetic-token'
  t.after(() => { if (oldBase === undefined) delete process.env.AIRTABLE_BASE_ID; else process.env.AIRTABLE_BASE_ID = oldBase; if (oldPat === undefined) delete process.env.AIRTABLE_PAT; else process.env.AIRTABLE_PAT = oldPat })
  const stocks = new Map(items.map(item => [item.id, 20])); let saved: any = null
  const methods: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.ok(url.startsWith('https://api.airtable.com/')); assert.ok(!url.includes('square'))
    const u = new URL(url); const id = u.pathname.split('/').at(-1)!
    const method = options.method ?? 'GET'; methods.push(method)
    if (u.pathname.includes('tblNfS4o1qbZrkL8F')) {
      if (method === 'GET') return Response.json({ id, fields: { 'Inventario Actual': stocks.get(id) } })
      assert.equal(method, 'PATCH'); assert.ok(saved, 'financial record must exist before inventory writes')
      const fields = JSON.parse(String(options.body)).fields
      assert.deepEqual(Object.keys(fields), ['fldPWw9SVriMBSl1s']); assert.ok(fields.fldPWw9SVriMBSl1s >= 0)
      stocks.set(id, fields.fldPWw9SVriMBSl1s); return Response.json({ id })
    }
    if (method === 'GET') return Response.json({ records: saved ? [saved] : [] })
    const fields = JSON.parse(String(options.body)).fields
    if (method === 'POST') saved = { id: 'rec44444444444444', fields: { 'Notas del Terapeuta': fields.fldtCuN8vn9O3xD7v } }
    else saved.fields['Notas del Terapeuta'] = fields.fldtCuN8vn9O3xD7v
    return Response.json(saved)
  })
  const data = form(); const commit = createSaleCommitter({ find: findSavedSale, create: createInventoryWriter(inventoryPersistence) })
  const result = await runSupplementSale(data, { ...fixture().deps, commit })
  assert.equal(result.ok, true); assert.deepEqual([...stocks.values()], [18, 18, 17])
  const writes = methods.filter(method => method !== 'GET').length
  assert.equal((await runSupplementSale(data, { ...fixture().deps, commit })).ok, true)
  assert.equal(methods.filter(method => method !== 'GET').length, writes)
})

test('a recovered completed journal clears the local uncertain gate without repeating inventory', async () => {
  const f = inventoryFixture(); const original = f.io.journal
  let loseCompletion = true
  f.io.journal = async (id, sale, journal) => {
    await original(id, sale, journal)
    if (journal.state === 'complete' && loseCompletion) { loseCompletion = false; throw new Error('completion response lost') }
  }
  const data = form()
  assert.equal((await runSupplementSale(data, { ...f.base.deps, commit: f.commit })).ok, false)
  assert.equal((await runSupplementSale(data, { ...f.base.deps, commit: f.commit })).ok, true)
  assert.deepEqual([...f.stock.values()], [18, 18, 17])
  assert.equal((await runSupplementSale(form(), { ...f.base.deps, commit: f.commit })).ok, true)
  assert.deepEqual([...f.stock.values()], [16, 16, 14])
})

const { isInventoryEnforcementEnabled, commitSavedSale: configuredSaleCommit } = await import(moduleUrl('../app/dashboard/ventas-suplementos/sale-persistence.ts'))

test('inventory enforcement requires explicit true and defaults OFF', t => {
  const previous = process.env.AIRTABLE_INVENTORY_ENFORCEMENT
  t.after(() => { if (previous === undefined) delete process.env.AIRTABLE_INVENTORY_ENFORCEMENT; else process.env.AIRTABLE_INVENTORY_ENFORCEMENT = previous })
  delete process.env.AIRTABLE_INVENTORY_ENFORCEMENT
  assert.equal(isInventoryEnforcementEnabled(), false)
  for (const value of ['false', '', 'TRUE', '1', 'yes', ' true ']) assert.equal(isInventoryEnforcementEnabled(value), false)
  assert.equal(isInventoryEnforcementEnabled('true'), true)
})

for (const mode of [undefined, 'false', 'true']) {
  for (const invalidStock of [false, true]) test(`production save with flag ${mode ?? 'missing'} and ${invalidStock ? 'negative' : 'valid'} stock`, async t => {
    const oldBase = process.env.AIRTABLE_BASE_ID; const oldPat = process.env.AIRTABLE_PAT; const oldFlag = process.env.AIRTABLE_INVENTORY_ENFORCEMENT
    process.env.AIRTABLE_BASE_ID = 'synthetic-base'; process.env.AIRTABLE_PAT = 'synthetic-token'
    if (mode === undefined) delete process.env.AIRTABLE_INVENTORY_ENFORCEMENT; else process.env.AIRTABLE_INVENTORY_ENFORCEMENT = mode
    t.after(() => {
      if (oldBase === undefined) delete process.env.AIRTABLE_BASE_ID; else process.env.AIRTABLE_BASE_ID = oldBase
      if (oldPat === undefined) delete process.env.AIRTABLE_PAT; else process.env.AIRTABLE_PAT = oldPat
      if (oldFlag === undefined) delete process.env.AIRTABLE_INVENTORY_ENFORCEMENT; else process.env.AIRTABLE_INVENTORY_ENFORCEMENT = oldFlag
    })
    const initial = invalidStock ? [-365, 90, -3] : [20, 20, 20]
    const stocks = new Map(items.map((item, i) => [item.id, initial[i]]))
    const calls: Array<{ url: string; method: string }> = []
    let stored: any = null
    t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
      assert.ok(url.startsWith('https://api.airtable.com/'))
      const method = options.method ?? 'GET'; calls.push({ url, method })
      const u = new URL(url); const id = u.pathname.split('/').at(-1)!
      if (u.pathname.includes('tblNfS4o1qbZrkL8F')) {
        assert.equal(mode, 'true', 'OFF must not read or write inventory')
        if (method === 'GET') return Response.json({ id, fields: { 'Inventario Actual': stocks.get(id) } })
        const fields = JSON.parse(String(options.body)).fields
        assert.deepEqual(Object.keys(fields), ['fldPWw9SVriMBSl1s'])
        stocks.set(id, fields.fldPWw9SVriMBSl1s); return Response.json({ id })
      }
      if (method === 'GET') {
        if (u.searchParams.get('filterByFormula')?.includes('Inventario pendiente')) {
          assert.equal(mode, 'true', 'OFF must not check historical pending inventory')
          return Response.json({ records: [] })
        }
        return Response.json({ records: stored ? [stored] : [] })
      }
      const fields = JSON.parse(String(options.body)).fields
      if (method === 'POST') {
        assert.equal(fields.fldQmGAfuC8VedVac, 150); assert.equal(fields.fldEaHNuZQaF9dJOm, 24)
        assert.equal(fields.fldy4827OopECJivK, 174); assert.equal(fields.flduOI73qhsjzailL, 'Card')
        stored = { id: 'rec44444444444444', fields: { 'Notas del Terapeuta': fields.fldtCuN8vn9O3xD7v } }
      } else stored.fields['Notas del Terapeuta'] = fields.fldtCuN8vn9O3xD7v
      return Response.json(stored)
    })
    const data = form()
    const deps = { ...fixture().deps, getProducts: async () => items.map(item => ({ id: item.id, fields: { Nombre: item.nombre, 'Precio de Venta ($)': item.precio, 'Inventario Actual': stocks.get(item.id) } })), commit: configuredSaleCommit }
    const results = await Promise.all([runSupplementSale(data, deps), runSupplementSale(data, deps)])
    assert.deepEqual(results[0], results[1])
    const result = results[0]
    if (mode === 'true' && invalidStock) {
      assert.equal(result.ok, false); assert.match(result.message, /inventario/)
      assert.equal(calls.filter(call => call.method !== 'GET').length, 0)
      assert.deepEqual([...stocks.values()], initial)
      return
    }
    assert.equal(result.ok, true); assert.equal(result.receipt.totals.total, 174)
    assert.deepEqual(result.receipt.items.map((item: any) => item.cantidad), [2, 2, 3])
    assert.deepEqual([...stocks.values()], mode === 'true' ? [18, 18, 17] : initial)
    assert.equal(calls.filter(call => call.method === 'POST').length, 1)
    const writes = calls.filter(call => call.method !== 'GET').length
    assert.deepEqual(await runSupplementSale(data, deps), result)
    assert.equal(calls.filter(call => call.method !== 'GET').length, writes, 'retry must not repeat any write')
    if (mode !== 'true') {
      assert.equal(writes, 1)
      assert.doesNotMatch(stored.fields['Notas del Terapeuta'], /AQSLIM Inventario:/)
      // Enabling enforcement later must not backfill a sale saved while OFF.
      process.env.AIRTABLE_INVENTORY_ENFORCEMENT = 'true'
      assert.deepEqual(await runSupplementSale(data, deps), result)
      assert.equal(calls.filter(call => call.method !== 'GET').length, writes)
      assert.deepEqual([...stocks.values()], initial)
    }
  })
}

test('OFF does not authorize creation of the deferred September 8 reconciliation', async t => {
  const previous = process.env.AIRTABLE_INVENTORY_ENFORCEMENT
  const oldBase = process.env.AIRTABLE_BASE_ID; const oldPat = process.env.AIRTABLE_PAT
  process.env.AIRTABLE_INVENTORY_ENFORCEMENT = 'false'
  process.env.AIRTABLE_BASE_ID = 'synthetic-base'; process.env.AIRTABLE_PAT = 'synthetic-token'
  t.after(() => {
    if (previous === undefined) delete process.env.AIRTABLE_INVENTORY_ENFORCEMENT; else process.env.AIRTABLE_INVENTORY_ENFORCEMENT = previous
    if (oldBase === undefined) delete process.env.AIRTABLE_BASE_ID; else process.env.AIRTABLE_BASE_ID = oldBase
    if (oldPat === undefined) delete process.env.AIRTABLE_PAT; else process.env.AIRTABLE_PAT = oldPat
  })
  t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    assert.ok(!options.method || options.method === 'GET', 'no historical writes while OFF')
    return Response.json({ records: [] })
  })
  const sale = await prepareSupplementSale(form(), fixture().deps)
  sale.reconciliation = 'september-8-2026'
  await assert.rejects(configuredSaleCommit(sale), /conciliación histórica está aplazada/)
})
