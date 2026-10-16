import { assertInventoryConfirmed } from './inventory-service'
import type { SupplementSaleReceipt } from '../../../lib/supplement-sales'
import { validReceiptEmail, type ConfirmedEmailReceipt } from './receipt-email-service'

// Receipt actions have a GET-only adapter, separate from sale/inventory persistence.
async function readRecord(table: string, id: string) {
  if (!/^rec[A-Za-z0-9]{14}$/.test(id) || !process.env.AIRTABLE_BASE_ID || !process.env.AIRTABLE_PAT) throw new Error('receipt_unavailable')
  const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${table}/${id}`, {
    method: 'GET', headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` }, cache: 'no-store', signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error('receipt_unavailable')
  return response.json()
}

export async function loadEmailReceipt(id: string): Promise<ConfirmedEmailReceipt> {
  const record = await readRecord('tblCA6HruBsrZdXbZ', id)
  const notes = record.fields?.['Notas del Terapeuta']
  if (record.id !== id || record.fields?.['Tipo de Consulta'] !== 'Suplementos' || typeof notes !== 'string') throw new Error('receipt_unavailable')
  assertInventoryConfirmed(notes)
  const line = notes.split('\n').findLast(line => line.startsWith('AQSLIM Recibo: '))
  if (!line) throw new Error('receipt_unavailable')
  const snapshot = JSON.parse(line.slice('AQSLIM Recibo: '.length)) as SupplementSaleReceipt
  if (!snapshot || typeof snapshot.fecha !== 'string' || typeof snapshot.metodoPago !== 'string' || !snapshot.items?.length || !snapshot.totals ||
    !['subtotal', 'discount', 'tax', 'shipping', 'supplementTotal', 'total'].every(key => Number.isFinite((snapshot.totals as unknown as Record<string, unknown>)[key])) ||
    !snapshot.items.every(item => typeof item.nombre === 'string' && Number.isFinite(item.precio) && Number.isInteger(item.cantidad) && item.cantidad > 0)) throw new Error('receipt_unavailable')
  const receipt = { ...snapshot, id }
  const clients = record.fields['ID Cliente']
  if (!Array.isArray(clients) || clients.length !== 1) return { receipt, email: null }
  const customer = await readRecord('tblek9goIGKMRJKXJ', clients[0])
  const email = customer.fields?.Email?.trim()
  return { receipt, email: validReceiptEmail(email) ? email : null }
}
