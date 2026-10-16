export type SupplementSaleItem = {
  id: string
  nombre: string
  precio: number
  cantidad: number
}

// Use the existing Airtable methods with Spanish labels. Airtable's governed value for Tarjeta is Card.
export const SUPPLEMENT_PAYMENT_METHODS = ['Efectivo', 'Tarjeta', 'Zelle', 'Venmo', 'Transferencia'] as const
export const SUPPLEMENT_PAYMENT_VALUES: Record<string, string> = {
  Efectivo: 'Efectivo', Tarjeta: 'Card', Zelle: 'Zelle', Venmo: 'Venmo', Transferencia: 'Transferencia',
}

export function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateSupplementSale(
  items: SupplementSaleItem[],
  discount: number,
  tax: number,
  shipping = 0,
) {
  const subtotal = money(items.reduce((sum, item) => sum + money(item.precio * item.cantidad), 0))
  const safeDiscount = money(Math.max(0, Math.min(discount, subtotal)))
  const safeTax = money(Math.max(0, tax))
  const safeShipping = money(Math.max(0, shipping))
  return {
    subtotal,
    discount: safeDiscount,
    tax: safeTax,
    shipping: safeShipping,
    supplementTotal: money(subtotal - safeDiscount),
    total: money(subtotal - safeDiscount + safeTax + safeShipping),
  }
}

export type SupplementSaleTotals = ReturnType<typeof calculateSupplementSale>
export type SupplementSaleReceipt = {
  id: string
  fecha: string
  metodoPago: string
  items: SupplementSaleItem[]
  totals: SupplementSaleTotals
}
export type SupplementSaleResult =
  | { ok: true; receipt: SupplementSaleReceipt }
  | { ok: false; message: string }

export function supplementReceiptLines(totals: SupplementSaleTotals) {
  return [
    { label: 'Productos', amount: totals.subtotal },
    { label: 'Descuento', amount: -totals.discount },
    { label: 'Impuesto', amount: totals.tax },
    { label: 'Envío', amount: totals.shipping },
    { label: 'Total', amount: totals.total },
  ]
}

export function formatSupplementSaleNotes(
  items: SupplementSaleItem[],
  totals: SupplementSaleTotals,
  note = '',
) {
  const lines = [
    'Suplementos vendidos:',
    ...items.map(item => `- ${item.cantidad} × ${item.nombre} ($${money(item.precio * item.cantidad).toFixed(2)})`),
    `Subtotal: $${totals.subtotal.toFixed(2)}`,
    `Descuento: -$${totals.discount.toFixed(2)}`,
    `Impuesto: $${totals.tax.toFixed(2)}`,
    `Envío (Shipping): $${totals.shipping.toFixed(2)}`,
    `Total: $${totals.total.toFixed(2)}`,
  ]
  if (note.trim()) lines.push('', `Nota: ${note.trim()}`)
  return lines.join('\n')
}
