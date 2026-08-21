import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateSupplementSale, formatSupplementSaleNotes } from '../lib/supplement-sales.ts'

test('calculates supplement-only sale totals with discount and tax', () => {
  const items = [{ id: 'rec123', nombre: 'Producto A', precio: 25, cantidad: 2 }]
  assert.deepEqual(calculateSupplementSale(items, 5, 3.5), {
    subtotal: 50, discount: 5, tax: 3.5, supplementTotal: 45, total: 48.5,
  })
})

test('formats notes compatible with finance supplement parsing', () => {
  const items = [{ id: 'rec123', nombre: 'Producto A', precio: 25, cantidad: 2 }]
  const totals = calculateSupplementSale(items, 0, 0)
  const notes = formatSupplementSaleNotes(items, totals, 'Mostrador')
  assert.match(notes, /Suplementos vendidos:/)
  assert.match(notes, /- 2 × Producto A \(\$50\.00\)/)
  assert.match(notes, /Nota: Mostrador/)
})
