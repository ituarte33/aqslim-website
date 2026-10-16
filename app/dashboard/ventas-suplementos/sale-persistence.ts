import type { SupplementSaleReceipt } from '../../../lib/supplement-sales'
import { assertInventoryConfirmed, createInventoryWriter, inventoryNotes, INVENTORY_PENDING, InventoryPreflightError, type InventoryJournal } from './inventory-service'
import { SaleValidationError, type PreparedSale } from './sale-service'

// Governed Consultas schema verified read-only on 2026-09-08.
const TABLE = 'tblCA6HruBsrZdXbZ'
const FIELD_IDS: Record<string, string> = {
  'Fecha Consulta': 'fldIikCUgEi1Mpv1X',
  'Tipo de Consulta': 'fldgpr0tn58OZKV1G',
  'Notas del Terapeuta': 'fldtCuN8vn9O3xD7v',
  'Monto Cobrado ($)': 'fldy4827OopECJivK',
  'Consulta Cobrado ($)': 'flddz6F9X0d8qjRhB',
  'Suplemento(s) Cobrado ($)': 'fldQmGAfuC8VedVac',
  'Envio (Shipping) Cobrado ($)': 'fldEaHNuZQaF9dJOm',
  'Método de Pago': 'flduOI73qhsjzailL',
  'ID Cliente': 'fldF0RVTPAsTOdzdm',
}
export class SaleProviderError extends Error {
  status: number
  constructor(status: number) { super('sale_provider_failed'); this.status = status }
}

async function request(path: string, options?: RequestInit, table = TABLE) {
  if (!process.env.AIRTABLE_BASE_ID || !process.env.AIRTABLE_PAT) throw new Error('airtable_configuration_missing')
  const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${table}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    console.error('[supplement-sales] provider_request_failed', { status: response.status, method: options?.method ?? 'GET' })
    throw new SaleProviderError(response.status)
  }
  return response.json()
}

export async function findSavedSale(requestId: string): Promise<SupplementSaleReceipt | null> {
  if (!/^[a-f0-9-]{36}$/i.test(requestId)) throw new Error('invalid_request_id')
  const params = new URLSearchParams({
    filterByFormula: `FIND("AQSLIM Venta: ${requestId}", {Notas del Terapeuta})`,
    maxRecords: '2',
  })
  const data = await request(`?${params}`)
  if (!Array.isArray(data.records)) throw new Error('invalid_sale_lookup')
  if (data.records.length === 0) return null
  if (data.records.length > 1) throw new SaleValidationError('Esta venta requiere revisión porque hay más de un registro con el mismo identificador.')
  const record = data.records[0]
  const notes = record.fields?.['Notas del Terapeuta']
  if (typeof notes === 'string') assertInventoryConfirmed(notes)
  const line = typeof notes === 'string' ? notes.split('\n').findLast(line => line.startsWith('AQSLIM Recibo: ')) : undefined
  if (!line || typeof record.id !== 'string') throw new Error('saved_receipt_unavailable')
  const receipt = JSON.parse(line.slice('AQSLIM Recibo: '.length)) as Omit<SupplementSaleReceipt, 'id'>
  if (!receipt || typeof receipt.fecha !== 'string' || typeof receipt.metodoPago !== 'string' ||
    !Array.isArray(receipt.items) || !receipt.items.length || !receipt.totals ||
    !['subtotal', 'discount', 'tax', 'shipping', 'supplementTotal', 'total'].every(key => Number.isFinite((receipt.totals as unknown as Record<string, unknown>)[key])) ||
    !receipt.items.every(item => item && typeof item.id === 'string' && typeof item.nombre === 'string' && Number.isFinite(item.precio) && Number.isInteger(item.cantidad) && item.cantidad > 0)
  ) throw new Error('invalid_saved_receipt')
  return { ...receipt, id: record.id }
}

export async function createSavedSale(sale: PreparedSale, journal?: InventoryJournal): Promise<SupplementSaleReceipt> {
  if (sale.reconciliation === 'september-8-2026' && (await findSeptember8Candidates()).length) throw new InventoryPreflightError('Ya existe una venta de $174 del 8 de septiembre. Revisa la conciliación antes de continuar.')
  const fields = { ...sale.fields, 'Notas del Terapeuta': journal ? inventoryNotes(sale, journal) : `${sale.fields['Notas del Terapeuta']}\n\nAQSLIM Venta: ${sale.requestId}\nAQSLIM Recibo: ${JSON.stringify(sale.receipt)}\nDetalle productos: ${JSON.stringify(sale.inventory)}` }
  const record = await request('', {
    method: 'POST',
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([name, value]) => {
      if (!FIELD_IDS[name]) throw new Error('unknown_sale_field')
      return [FIELD_IDS[name], value]
    })) }),
  })
  if (typeof record.id !== 'string') throw new Error('sale_id_missing')
  return { id: record.id, ...sale.receipt }
}

export function createSaleCommitter(deps: {
  find(requestId: string): Promise<SupplementSaleReceipt | null>
  create(sale: PreparedSale): Promise<SupplementSaleReceipt>
  onRecovered?(requestId: string): void
}) {
  // Same-instance concurrency protection only. Airtable lookup recovers a
  // completed request after a restart; it is NOT a cross-instance unique lock.
  const inFlight = new Map<string, Promise<SupplementSaleReceipt>>()
  const uncertain = new Set<string>()
  return function commit(sale: PreparedSale): Promise<SupplementSaleReceipt> {
    const running = inFlight.get(sale.requestId)
    if (running) return running
    const operation = (async () => {
      const saved = await deps.find(sale.requestId)
      if (saved) { uncertain.delete(sale.requestId); deps.onRecovered?.(sale.requestId); return saved }
      if (uncertain.has(sale.requestId)) throw new SaleValidationError('No se pudo confirmar esta venta. Revisa Airtable antes de iniciar otra venta; este reintento no creará un duplicado.')
      // Retain ambiguous requests for this instance's lifetime. Never evict them
      // and silently retry a possibly committed POST. Bound growth by failing closed.
      if (uncertain.size >= 1000) throw new SaleValidationError('Hay ventas pendientes de revisión. Contacta al administrador antes de guardar otra venta.')
      uncertain.add(sale.requestId)
      try {
        const receipt = await deps.create(sale)
        uncertain.delete(sale.requestId)
        return receipt
      } catch (error) {
        if (error instanceof InventoryPreflightError) { uncertain.delete(sale.requestId); throw error }
        if (error instanceof SaleProviderError && error.status >= 400 && error.status < 500 && error.status !== 408) {
          uncertain.delete(sale.requestId)
          // A rejected POST is different from a lost response: it is safe to
          // correct the form and retry. Never expose the provider response body.
          const message = error.status === 422
            ? 'Airtable rechazó los datos de la venta. No se guardó ni se generó un recibo. Revisa los datos y los campos configurados antes de reintentar.'
            : error.status === 429
              ? 'Airtable está ocupado. La venta no se guardó; espera un momento y vuelve a intentar.'
              : 'Airtable rechazó el guardado. La venta no se guardó; contacta al administrador para revisar el acceso y la configuración.'
          throw new SaleValidationError(message)
        }
        throw error
      }
    })()
    inFlight.set(sale.requestId, operation)
    void operation.finally(() => inFlight.delete(sale.requestId)).catch(() => {})
    return operation
  }
}

const PRODUCTS_TABLE = 'tblNfS4o1qbZrkL8F'
const STOCK_FIELD = 'fldPWw9SVriMBSl1s'

export async function assertNoPendingInventory() {
  const params = new URLSearchParams({ filterByFormula: `FIND("${INVENTORY_PENDING}", {Notas del Terapeuta})`, maxRecords: '1' })
  const data = await request(`?${params}`)
  if (!Array.isArray(data.records) || data.records.length) throw new InventoryPreflightError('Hay una venta pendiente de revisión de inventario. Resuélvela antes de registrar otra venta.')
}

export const inventoryPersistence = {
  assertNoPending: assertNoPendingInventory,
  readStock: async (id: string): Promise<number | undefined> => {
    if (!/^rec[A-Za-z0-9]{14}$/.test(id)) throw new InventoryPreflightError('El suplemento no es válido.')
    const record = await request(`/${id}`, undefined, PRODUCTS_TABLE)
    return record.fields?.['Inventario Actual']
  },
  create: createSavedSale,
  journal: async (id: string, sale: PreparedSale, journal: InventoryJournal) => {
    await request(`/${id}`, { method: 'PATCH', body: JSON.stringify({ fields: { [FIELD_IDS['Notas del Terapeuta']]: inventoryNotes(sale, journal) } }) })
  },
  writeStock: async (id: string, value: number) => {
    if (!/^rec[A-Za-z0-9]{14}$/.test(id) || !Number.isSafeInteger(value) || value < 0) throw new Error('invalid_inventory_write')
    await request(`/${id}`, { method: 'PATCH', body: JSON.stringify({ fields: { [STOCK_FIELD]: value } }) }, PRODUCTS_TABLE)
  },
  removeSale: async (id: string) => { await request(`/${id}`, { method: 'DELETE' }) },
  isRejected: (error: unknown) => error instanceof SaleProviderError && error.status >= 400 && error.status < 500 && error.status !== 408,
}

// Server-only, opt-in configuration. Missing, false, or unrecognized values
// must never activate inventory enforcement during production sales.
export function isInventoryEnforcementEnabled(value = process.env.AIRTABLE_INVENTORY_ENFORCEMENT): boolean {
  return value === 'true'
}

const createWithInventory = createInventoryWriter(inventoryPersistence)
export const commitSavedSale = createSaleCommitter({
  find: findSavedSale,
  create: sale => {
    if (isInventoryEnforcementEnabled()) return createWithInventory(sale)
    // Deferring normal-sale enforcement is not authorization to execute the
    // historical reconciliation without its physical-stock verification.
    if (sale.reconciliation) throw new InventoryPreflightError('La conciliación histórica está aplazada hasta verificar el inventario y activar su control.')
    return createSavedSale(sale)
  },
  onRecovered: createWithInventory.confirmed,
})

// Read-only candidate search: use broad criteria so an incomplete historical
// record is never duplicated merely because its payment or shipping is wrong.
export async function findSeptember8Candidates() {
  const params = new URLSearchParams({
    filterByFormula: 'AND(IS_SAME({Fecha Consulta}, "2026-09-08", "day"), {Monto Cobrado ($)} = 174)',
    pageSize: '100',
  })
  const records: Array<{ id: string; fields: Record<string, unknown> }> = []
  let offset: string | undefined
  do {
    if (offset) params.set('offset', offset)
    const data = await request(`?${params}`)
    if (!Array.isArray(data.records)) throw new Error('invalid_historical_lookup')
    records.push(...data.records)
    offset = data.offset
  } while (offset)
  return records
}
