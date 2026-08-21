'use server'

import { createConsulta, getClienteById, getSupplementos } from '@/lib/airtable'
import { requireCapability } from '@/lib/auth'
import { calculateSupplementSale, formatSupplementSaleNotes, type SupplementSaleItem } from '@/lib/supplement-sales'

const PAYMENT_METHODS = new Set(['Efectivo', 'Tarjeta', 'Zelle', 'Venmo', 'Otro'])

export async function saveSupplementSale(formData: FormData): Promise<{ id: string; total: number }> {
  await requireCapability('consultations:write:any')

  const clienteRecordId = String(formData.get('clienteRecordId') ?? '').trim()
  const fecha = String(formData.get('fecha') ?? '').trim()
  const metodoPago = String(formData.get('metodoPago') ?? '').trim()
  const nota = String(formData.get('nota') ?? '').trim().slice(0, 1000)
  const discount = Number(formData.get('discount') ?? 0)
  const tax = Number(formData.get('tax') ?? 0)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error('Selecciona una fecha válida.')
  if (!PAYMENT_METHODS.has(metodoPago)) throw new Error('Selecciona una forma de pago válida.')
  if (!Number.isFinite(discount) || !Number.isFinite(tax) || discount < 0 || tax < 0) {
    throw new Error('El descuento y el impuesto deben ser cantidades válidas.')
  }
  if (clienteRecordId) {
    if (!/^rec[A-Za-z0-9]{14}$/.test(clienteRecordId)) throw new Error('El cliente seleccionado no es válido.')
    await getClienteById(clienteRecordId)
  }

  let requested: Array<{ id: string; cantidad: number }>
  try {
    requested = JSON.parse(String(formData.get('items') ?? '[]'))
  } catch {
    throw new Error('No se pudo leer la lista de suplementos.')
  }
  if (!Array.isArray(requested) || requested.length === 0) throw new Error('Agrega al menos un suplemento.')

  const catalog = new Map((await getSupplementos()).map(product => [product.id, product]))
  const items: SupplementSaleItem[] = requested.map(item => {
    const product = catalog.get(item.id)
    const cantidad = Number(item.cantidad)
    if (!product || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) {
      throw new Error('Uno de los suplementos o cantidades no es válido.')
    }
    return {
      id: product.id,
      nombre: product.fields.Nombre ?? 'Suplemento',
      precio: product.fields['Precio de Venta ($)'] ?? 0,
      cantidad,
    }
  })

  const totals = calculateSupplementSale(items, discount, tax)
  if (discount > totals.subtotal) throw new Error('El descuento no puede exceder el subtotal.')

  const fields: Record<string, unknown> = {
    'Fecha Consulta': fecha,
    'Tipo de Consulta': 'Suplementos',
    'Notas del Terapeuta': formatSupplementSaleNotes(items, totals, nota),
    'Monto Cobrado ($)': totals.total,
    'Consulta Cobrado ($)': 0,
    'Suplemento(s) Cobrado ($)': totals.supplementTotal,
    'Método de Pago': metodoPago,
  }
  if (clienteRecordId) fields['ID Cliente'] = [clienteRecordId]

  const record = await createConsulta(fields)
  return { id: record.id, total: totals.total }
}
