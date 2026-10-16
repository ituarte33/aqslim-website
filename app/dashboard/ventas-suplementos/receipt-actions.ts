'use server'

import { Resend } from 'resend'
import { requireCapability } from '@/lib/auth'
import { createReceiptEmailSender } from './receipt-email-service'
import { loadEmailReceipt } from './receipt-read'

const authorize = () => requireCapability('consultations:write:any')
const send = createReceiptEmailSender({
  authorize,
  load: loadEmailReceipt,
  send: async (message, idempotencyKey) => {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const result = await resend.emails.send({ from: 'AQSLIM Website <contact@aqslim.com>', ...message }, { idempotencyKey })
    if (result.error) throw new Error('receipt_email_failed')
  },
})

export async function receiptEmailAvailability(id: string): Promise<{ available: boolean; reason: string }> {
  try {
    await authorize()
    const { email } = await loadEmailReceipt(id)
    return { available: !!email, reason: email ? '' : 'Sin cliente asociado con email válido.' }
  } catch { return { available: false, reason: 'No se pudo verificar el email del cliente.' } }
}

export async function sendReceiptEmail(id: string) { return send(id) }
