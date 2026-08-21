export type SupplementSaleItem = {
  id: string
  nombre: string
  precio: number
  cantidad: number
}

export function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateSupplementSale(
  items: SupplementSaleItem[],
  discount: number,
  tax: number,
) {
  const subtotal = money(items.reduce((sum, item) => sum + item.precio * item.cantidad, 0))
  const safeDiscount = money(Math.max(0, Math.min(discount, subtotal)))
  const safeTax = money(Math.max(0, tax))
  return {
    subtotal,
    discount: safeDiscount,
    tax: safeTax,
    supplementTotal: money(subtotal - safeDiscount),
    total: money(subtotal - safeDiscount + safeTax),
  }
}

export function formatSupplementSaleNotes(
  items: SupplementSaleItem[],
  totals: ReturnType<typeof calculateSupplementSale>,
  note = '',
) {
  const lines = [
    'Suplementos vendidos:',
    ...items.map(item => `- ${item.cantidad} × ${item.nombre} ($${money(item.precio * item.cantidad).toFixed(2)})`),
    `Subtotal: $${totals.subtotal.toFixed(2)}`,
  ]
  if (totals.discount > 0) lines.push(`Descuento: -$${totals.discount.toFixed(2)}`)
  if (totals.tax > 0) lines.push(`Impuesto: $${totals.tax.toFixed(2)}`)
  lines.push(`Total: $${totals.total.toFixed(2)}`)
  if (note.trim()) lines.push('', `Nota: ${note.trim()}`)
  return lines.join('\n')
}
