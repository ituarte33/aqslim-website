import type { SupplementSaleReceipt } from '../../../lib/supplement-sales'
import { receiptHtml, receiptRows } from './receipt-document'

export const validReceiptEmail = (value: unknown): value is string => typeof value === 'string' && value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
export type ConfirmedEmailReceipt = { receipt: SupplementSaleReceipt; email: string | null }
export type ReceiptEmailResult = { ok: boolean; message: string }
export function createReceiptEmailSender(deps: {
  authorize(): Promise<unknown>
  load(id: string): Promise<ConfirmedEmailReceipt>
  send(message: { to: string; subject: string; html: string; text: string }, key: string): Promise<void>
}) {
  const running = new Map<string, Promise<ReceiptEmailResult>>()
  return async (id: string): Promise<ReceiptEmailResult> => {
    try {
      await deps.authorize()
      if (!/^rec[A-Za-z0-9]{14}$/.test(id)) throw new Error('invalid_receipt')
      const existing = running.get(id)
      if (existing) return existing
      const operation = (async (): Promise<ReceiptEmailResult> => {
        try {
          const { receipt, email } = await deps.load(id)
          if (!validReceiptEmail(email)) return { ok: false, message: 'Este recibo no tiene un cliente asociado con email válido.' }
          await deps.send({ to: email, subject: 'AQSLIM — Recibo de compra', html: receiptHtml(receipt), text: receiptRows(receipt).join('\n') }, `supplement-receipt/${id}`)
          return { ok: true, message: 'Recibo enviado por email.' }
        } catch { return { ok: false, message: 'No se pudo enviar el recibo. La venta sigue guardada. Puedes volver a intentar.' } }
      })()
      running.set(id, operation)
      try { return await operation } finally { running.delete(id) }
    } catch { return { ok: false, message: 'No se pudo enviar el recibo. Revisa tu sesión e intenta nuevamente.' } }
  }
}
