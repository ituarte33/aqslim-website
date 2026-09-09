import {
  calculateSupplementSale, formatSupplementSaleNotes, money, SUPPLEMENT_PAYMENT_VALUES,
  type SupplementSaleItem, type SupplementSaleResult, type SupplementSaleReceipt,
} from '../../../lib/supplement-sales'

export class SaleValidationError extends Error {}

export type SaleProduct = {
  id: string
  fields: {
    Nombre?: string
    'Precio de Venta ($)'?: number
    'Inventario Actual'?: number
    'Costo de Compra ($)'?: number
  }
}
export type PreparedSale = {
  requestId: string
  reconciliation?: 'september-8-2026'
  fields: Record<string, unknown>
  receipt: Omit<SupplementSaleReceipt, 'id'>
  inventory: Array<{ id: string; quantity: number; unitCost: number | null }>
}

function currency(form: FormData, name: string, message: string): number {
  const raw = form.get(name) ?? '0'
  if (typeof raw !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(raw.trim() || '0')) {
    throw new SaleValidationError(message)
  }
  const value = Number(raw.trim() || '0')
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000) throw new SaleValidationError(message)
  return money(value)
}

export async function prepareSupplementSale(form: FormData, deps: {
  getProducts(): Promise<SaleProduct[]>
  getCustomer(id: string): Promise<{ id: string } | null>
}): Promise<PreparedSale> {
  const requestId = String(form.get('requestId') ?? '')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    throw new SaleValidationError('Recarga la página para iniciar una venta segura.')
  }
  const clienteRecordId = String(form.get('clienteRecordId') ?? '').trim()
  const fecha = String(form.get('fecha') ?? '').trim()
  const metodoPago = String(form.get('metodoPago') ?? '').trim()
  const nota = String(form.get('nota') ?? '').trim().slice(0, 1000)
  const discount = currency(form, 'discount', 'El descuento no es válido.')
  const tax = currency(form, 'tax', 'El impuesto no es válido.')
  const shipping = currency(form, 'shipping', 'El monto de envío no es válido.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha) {
    throw new SaleValidationError('Selecciona una fecha válida.')
  }
  if (!Object.hasOwn(SUPPLEMENT_PAYMENT_VALUES, metodoPago)) throw new SaleValidationError('Selecciona una forma de pago.')
  if (clienteRecordId && !/^rec[A-Za-z0-9]{14}$/.test(clienteRecordId)) throw new SaleValidationError('El cliente seleccionado no es válido.')

  let requested: unknown
  try { requested = JSON.parse(String(form.get('items') ?? '[]')) }
  catch { throw new SaleValidationError('No se pudo leer la lista de suplementos.') }
  if (!Array.isArray(requested) || requested.length === 0) throw new SaleValidationError('Agrega al menos un suplemento.')
  if (requested.length > 100) throw new SaleValidationError('Hay demasiados suplementos en la venta.')
  const quantities = new Map<string, number>()
  for (const item of requested) {
    if (!item || typeof item.id !== 'string' || typeof item.cantidad !== 'number' || !Number.isInteger(item.cantidad) || item.cantidad < 1 || item.cantidad > 99) {
      throw new SaleValidationError('Uno de los suplementos o cantidades no es válido.')
    }
    const quantity = (quantities.get(item.id) ?? 0) + item.cantidad
    if (quantity > 99) throw new SaleValidationError('La cantidad máxima por suplemento es 99.')
    quantities.set(item.id, quantity)
  }
  if (clienteRecordId && !(await deps.getCustomer(clienteRecordId))) throw new SaleValidationError('El cliente seleccionado ya no está disponible.')
  const catalog = new Map((await deps.getProducts()).map(product => [product.id, product]))
  const inventory: PreparedSale['inventory'] = []
  const items: SupplementSaleItem[] = [...quantities].map(([id, cantidad]) => {
    const product = catalog.get(id)
    const price = product?.fields['Precio de Venta ($)']
    if (!product || typeof price !== 'number' || !Number.isFinite(price) || price < 0 || price > 1_000_000) {
      throw new SaleValidationError('Uno de los suplementos no está disponible o tiene un precio inválido.')
    }
    const cost = product.fields['Costo de Compra ($)']
    inventory.push({ id, quantity: cantidad, unitCost: typeof cost === 'number' && Number.isFinite(cost) && cost >= 0 ? money(cost) : null })
    return { id, nombre: (product.fields.Nombre ?? 'Suplemento').replace(/[\r\n]+/g, ' '), precio: money(price), cantidad }
  })
  const totals = calculateSupplementSale(items, discount, tax, shipping)
  if (discount > totals.subtotal) throw new SaleValidationError('El descuento no puede exceder el subtotal.')
  const fields: Record<string, unknown> = {
    'Fecha Consulta': fecha,
    'Tipo de Consulta': 'Suplementos',
    'Notas del Terapeuta': formatSupplementSaleNotes(items, totals, nota),
    'Monto Cobrado ($)': totals.total,
    'Consulta Cobrado ($)': 0,
    'Suplemento(s) Cobrado ($)': totals.supplementTotal,
    'Envio (Shipping) Cobrado ($)': totals.shipping,
    'Método de Pago': SUPPLEMENT_PAYMENT_VALUES[metodoPago],
  }
  if (clienteRecordId) fields['ID Cliente'] = [clienteRecordId]
  return { requestId, fields, receipt: { fecha, metodoPago, items, totals }, inventory }
}

// Expected errors cross the Server Action boundary as plain, serializable data.
export async function runSupplementSale(form: FormData, deps: {
  authorize(): Promise<unknown>
  getProducts(): Promise<SaleProduct[]>
  getCustomer(id: string): Promise<{ id: string } | null>
  commit(sale: PreparedSale): Promise<SupplementSaleReceipt>
  logUnexpected(reference: string): void
}): Promise<SupplementSaleResult> {
  try {
    await deps.authorize()
    const sale = await prepareSupplementSale(form, deps)
    return { ok: true, receipt: await deps.commit(sale) }
  } catch (error) {
    if (error instanceof SaleValidationError) return { ok: false, message: error.message }
    const reference = crypto.randomUUID()
    deps.logUnexpected(reference)
    return { ok: false, message: `No se pudo confirmar la venta. Conserva este formulario y verifica el registro antes de volver a intentar. Referencia: ${reference}` }
  }
}
