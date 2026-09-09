import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const urls = new Map<string, string>()
function moduleUrl(name: string): string {
  if (urls.has(name)) return urls.get(name)!
  let source = readFileSync(new URL(name, import.meta.url), 'utf8')
  source = source.replace(/from '\.\.\/\.\.\/\.\.\/lib\/supplement-sales'/g, `from '${new URL('../../../lib/supplement-sales.ts', import.meta.url).href}'`)
  source = source.replace(/from '(\.\/[^']+)'/g, (_, path) => `from '${moduleUrl(path + '.ts')}'`)
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText
  const url = `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`
  urls.set(name, url); return url
}
const { receiptHtml, receiptPdf, receiptRows } = await import(moduleUrl('./receipt-document.ts'))
const { createReceiptEmailSender, validReceiptEmail } = await import(moduleUrl('./receipt-email-service.ts'))
const { loadEmailReceipt } = await import(moduleUrl('./receipt-read.ts'))
const receipt = { id: 'rec44444444444444', fecha: '2026-09-08', metodoPago: 'Tarjeta', items: [
  { id: 'rec11111111111111', nombre: 'Colon Optimizer - Fiber', cantidad: 2, precio: 24 },
  { id: 'rec22222222222222', nombre: 'Veggie Laxative', cantidad: 2, precio: 18 },
  { id: 'rec33333333333333', nombre: 'AQ JOINTS', cantidad: 3, precio: 22 },
], totals: { subtotal: 150, discount: 0, tax: 0, shipping: 24, supplementTotal: 150, total: 174 } }

test('receipt export preserves all totals, separate shipping, unit prices, privacy and print CSS', () => {
  const before = structuredClone(receipt)
  const html = receiptHtml({ ...receipt, notes: 'secret internal notes' })
  for (const value of ['AQSLIM', receipt.id, '2026-09-08', 'Tarjeta', '$150.00', '$24.00', '$174.00', 'Descuento', 'Impuesto', 'Envío', 'Precio unitario', '@media print']) assert.ok(html.includes(value), value)
  assert.ok(!html.includes('rec11111111111111')); assert.ok(!html.includes('secret internal notes'))
  assert.deepEqual(receipt, before)
})
test('HTML escapes user-facing product text', () => {
  assert.ok(receiptHtml({ ...receipt, items: [{ ...receipt.items[0], nombre: '<script>alert(1)</script>' }] }).includes('&lt;script&gt;'))
})
test('PDF is a real paginated PDF with correct xref, shipping and all receipt totals', () => {
  const pdf = Buffer.from(receiptPdf(receipt)).toString('latin1')
  assert.ok(pdf.startsWith('%PDF-1.4'))
  assert.ok(pdf.includes('Envío: $24.00')); assert.ok(pdf.includes('Total: $174.00'))
  const xref = Number(pdf.match(/startxref\n(\d+)/)![1]); assert.equal(pdf.slice(xref, xref + 4), 'xref')
  const large = Buffer.from(receiptPdf({ ...receipt, items: Array.from({ length: 100 }, () => receipt.items[0]) })).toString('latin1')
  assert.ok(!large.includes('/Count 1 '))
})
for (const email of [null, '', 'invalid', 'name@host', 'bad\n@example.com']) test(`email unavailable: ${String(email)}`, async () => {
  assert.equal(validReceiptEmail(email), false)
  const send = createReceiptEmailSender({ authorize: async () => {}, load: async () => ({ receipt, email }), send: async () => assert.fail('must not send') })
  assert.equal((await send(receipt.id)).ok, false)
})
test('linked email uses confirmed snapshot, deduplicates concurrent requests and stable provider key', async () => {
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve })
  let count = 0
  const send = createReceiptEmailSender({ authorize: async () => {}, load: async () => ({ receipt, email: 'test@example.com' }), send: async (message: any, key: string) => {
    count++; assert.equal(key, `supplement-receipt/${receipt.id}`); assert.equal(message.to, 'test@example.com'); assert.equal(message.text, receiptRows(receipt).join('\n')); await gate
  } })
  const first = send(receipt.id); const second = send(receipt.id)
  await new Promise(resolve => setImmediate(resolve)); assert.equal(count, 1); release()
  assert.equal((await first).ok, true); assert.equal((await second).ok, true)
})
test('provider failure is sanitized, preserves saved sale, and allows retry', async () => {
  const before = structuredClone(receipt); let attempts = 0
  const send = createReceiptEmailSender({ authorize: async () => {}, load: async () => ({ receipt, email: 'test@example.com' }), send: async () => { if (++attempts === 1) throw new Error('SECRET provider stack') } })
  const result = await send(receipt.id)
  assert.equal(result.ok, false); assert.ok(result.message.includes('venta sigue guardada')); assert.ok(!result.message.includes('SECRET'))
  assert.equal((await send(receipt.id)).ok, true); assert.deepEqual(receipt, before)
})
test('unconfirmed sale and unauthorized access never send', async () => {
  for (const denied of [true, false]) {
    const send = createReceiptEmailSender({ authorize: async () => { if (denied) throw new Error() }, load: async () => { throw new Error('not saved') }, send: async () => assert.fail('must not send') })
    assert.equal((await send(receipt.id)).ok, false)
  }
})
test('receipt loading only GETs sale and linked customer; no inventory access or Airtable writes', async () => {
  const original = globalThis.fetch; const previous = { base: process.env.AIRTABLE_BASE_ID, pat: process.env.AIRTABLE_PAT }
  process.env.AIRTABLE_BASE_ID = 'test'; process.env.AIRTABLE_PAT = 'test'
  const calls: string[] = []
  let client: string[] = ['rec55555555555555']
  globalThis.fetch = async (url: any, options: any) => {
    assert.equal(options.method, 'GET'); calls.push(String(url))
    return Response.json(String(url).includes('tblCA6HruBsrZdXbZ') ? { id: receipt.id, fields: { 'Tipo de Consulta': 'Suplementos', 'ID Cliente': client, 'Notas del Terapeuta': `AQSLIM Recibo: ${JSON.stringify(receipt)}` } } : { fields: { Email: 'test@example.com' } })
  }
  try {
    assert.equal((await loadEmailReceipt(receipt.id)).email, 'test@example.com')
    client = []; assert.equal((await loadEmailReceipt(receipt.id)).email, null)
    assert.equal(calls.length, 3); assert.ok(calls.every(url => !url.includes('tblNfS4o1qbZrkL8F')))
  } finally {
    globalThis.fetch = original
    for (const [name, value] of [['AIRTABLE_BASE_ID', previous.base], ['AIRTABLE_PAT', previous.pat]]) { if (value === undefined) delete process.env[name!]; else process.env[name!] = value }
  }
})
test('UI confirmation gate, persistent receipt, actions and synchronous email click guard', () => {
  const client = readFileSync(new URL('./supplement-sales-client.tsx', import.meta.url), 'utf8')
  const panel = readFileSync(new URL('./receipt-panel.tsx', import.meta.url), 'utf8')
  assert.ok(client.includes('{receipt && <ReceiptPanel'))
  assert.ok(client.indexOf('if (!result.ok)') < client.indexOf('setReceipt(result.receipt)'))
  assert.ok(client.indexOf('setReceipt(result.receipt)') < client.indexOf('setCart([])'))
  for (const text of ['Imprimir recibo', 'Enviar por email', 'Descargar PDF', 'busy.current || sent', 'disabled={!email.available || sending || sent}', 'target.print()', "type: 'application/pdf'"]) assert.ok(panel.includes(text), text)
  assert.ok(!panel.includes('saveSupplementSale')); assert.ok(!panel.includes('inventory'))
})
