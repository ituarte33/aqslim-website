import { prepareSupplementSale, type PreparedSale, type SaleProduct } from './sale-service'

export const SEPTEMBER_8_REQUEST_ID = 'b8b84174-0908-4000-8000-000000000174'
export const SEPTEMBER_8_CONFIRMATION = 'CONCILIAR VENTA 2026-09-08 $174 UNA SOLA VEZ'
export const SEPTEMBER_8_ITEMS = [
  { nombre: 'Colon Optimizer - Fiber', cantidad: 2, precio: 24 },
  { nombre: 'Veggie Laxative', cantidad: 2, precio: 18 },
  { nombre: 'AQ JOINTS', cantidad: 3, precio: 22 },
] as const

type Candidate = { id: string; fields: Record<string, unknown> }
export type ReconciliationPreview =
  | { status: 'existing' | 'review'; recordIds: string[]; message: string }
  | { status: 'ready'; sale: PreparedSale; message: string }
  | { status: 'blocked'; sale: PreparedSale; issues: string[]; message: string }

const normalized = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-MX')
function matches(candidate: Candidate): boolean {
  const f = candidate.fields
  if (String(f['Fecha Consulta']).slice(0, 10) !== '2026-09-08' || f['Monto Cobrado ($)'] !== 174 || f['Suplemento(s) Cobrado ($)'] !== 150 || f['Envio (Shipping) Cobrado ($)'] !== 24 || f['Consulta Cobrado ($)'] !== 0 || f['Método de Pago'] !== 'Card' || f['Tipo de Consulta'] !== 'Suplementos') return false
  const lines = String(f['Notas del Terapeuta'] ?? '').split('\n').filter(line => line.startsWith('- '))
  return lines.length === 3 && SEPTEMBER_8_ITEMS.every(item => lines.includes(`- ${item.cantidad} × ${item.nombre} ($${(item.cantidad * item.precio).toFixed(2)})`))
}

// This function is deliberately read-only; it does not accept a write dependency.
export async function previewSeptember8Reconciliation(deps: {
  findCandidates(): Promise<Candidate[]>
  getProducts(): Promise<SaleProduct[]>
}): Promise<ReconciliationPreview> {
  // FIRST operation, before resolving a catalog or constructing any write plan.
  const candidates = await deps.findCandidates()
  if (candidates.length) {
    const exact = candidates.length === 1 && matches(candidates[0])
    return {
      status: exact ? 'existing' : 'review',
      recordIds: candidates.map(record => record.id),
      message: exact
        ? 'La venta de $174 ya existe. No se creará otra venta ni se cambiará inventario; verifica por separado si su inventario fue aplicado.'
        : 'Ya hay registros de $174 del 8 de septiembre. Revisión manual requerida; no se creará una venta ni se cambiará inventario.',
    }
  }
  const products = await deps.getProducts()
  const resolved = SEPTEMBER_8_ITEMS.map(item => {
    const matches = products.filter(product => normalized(product.fields.Nombre ?? '') === normalized(item.nombre))
    if (matches.length !== 1) throw new Error('historical_product_missing_or_ambiguous')
    // Preserve the actual historical unit prices, not today's catalog prices.
    return { ...matches[0], fields: { ...matches[0].fields, 'Precio de Venta ($)': item.precio, 'Costo de Compra ($)': undefined }, cantidad: item.cantidad }
  })
  const form = new FormData()
  for (const [key, value] of Object.entries({
    requestId: SEPTEMBER_8_REQUEST_ID, fecha: '2026-09-08', metodoPago: 'Tarjeta',
    discount: '0', tax: '0', shipping: '24', clienteRecordId: '',
    nota: 'Conciliación histórica de venta completada el 8 de septiembre de 2026.',
    items: JSON.stringify(resolved.map(product => ({ id: product.id, cantidad: product.cantidad }))),
  })) form.set(key, value)
  const sale = await prepareSupplementSale(form, { getProducts: async () => resolved, getCustomer: async () => null })
  sale.reconciliation = 'september-8-2026'
  const issues = resolved.filter(product => {
    const stock = product.fields['Inventario Actual']
    return typeof stock !== 'number' || !Number.isSafeInteger(stock) || stock < product.cantidad
  }).map(product => `Inventario no válido o insuficiente: ${product.fields.Nombre}`)
  if (issues.length) return { status: 'blocked', sale, issues, message: 'Propuesta sin ejecutar: primero verifica y corrige el inventario mediante una revisión autorizada.' }
  return { status: 'ready', sale, message: 'Vista previa únicamente. No se ha escrito ningún registro ni modificado inventario.' }
}

// No automatic invocation, route, or UI button calls this operation. It must be
// deliberately invoked by an authorized administrator after reviewing a preview.
export async function executeSeptember8Reconciliation(confirmation: string, deps: {
  authorize(): Promise<unknown>
  findCandidates(): Promise<Candidate[]>
  getProducts(): Promise<SaleProduct[]>
  commit(sale: PreparedSale): Promise<unknown>
}) {
  await deps.authorize()
  if (confirmation !== SEPTEMBER_8_CONFIRMATION) throw new Error('historical_confirmation_required')
  // Recheck every time; never trust an earlier preview's "ready" result.
  const preview = await previewSeptember8Reconciliation(deps)
  if (preview.status !== 'ready') return preview
  return { status: 'completed' as const, receipt: await deps.commit(preview.sale) }
}
