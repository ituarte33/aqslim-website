import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { Resend } from 'resend'
import { getClienteByEmail, updateCliente, CLIENTES_FIELDS } from '@/lib/airtable'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  const payload = await request.text()

  // Verify Resend webhook signature via Svix
  const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!)
  let event: { type: string; data: { email_id: string; from: string; subject: string } }
  try {
    event = wh.verify(payload, {
      'svix-id':        request.headers.get('svix-id') ?? '',
      'svix-timestamp': request.headers.get('svix-timestamp') ?? '',
      'svix-signature': request.headers.get('svix-signature') ?? '',
    }) as typeof event
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  if (event.type !== 'email.received') return NextResponse.json({ ok: true })

  const { email_id, from, subject } = event.data

  // Only process Square appointment notifications
  if (!from.toLowerCase().includes('squareup.com') && !from.toLowerCase().includes('square.com')) {
    return NextResponse.json({ ok: true })
  }

  const subjectLower = subject.toLowerCase()
  const isBooking      = subjectLower.includes('new appointment')
  const isCancellation = subjectLower.includes('cancel')

  if (!isBooking && !isCancellation) return NextResponse.json({ ok: true })

  // Fetch the full email body to extract the customer's email address
  const { data: email, error } = await resend.emails.receiving.get(email_id)
  if (error || !email?.text) {
    console.error('[booking-webhook] Failed to fetch email body:', error)
    return NextResponse.json({ ok: true })
  }

  const customerEmail = extractCustomerEmail(email.text)
  if (!customerEmail) {
    console.error('[booking-webhook] Could not extract customer email from body')
    return NextResponse.json({ ok: true })
  }

  const cliente = await getClienteByEmail(customerEmail).catch(() => null)
  if (!cliente) {
    console.log('[booking-webhook] No Airtable record for email:', customerEmail)
    return NextResponse.json({ ok: true })
  }

  const citaAgendada = isBooking
  await updateCliente(cliente.id, { [CLIENTES_FIELDS.CITA_AGENDADA]: citaAgendada })
  console.log(`[booking-webhook] Set Cita Agendada=${citaAgendada} for ${customerEmail}`)

  return NextResponse.json({ ok: true })
}

// Square booking/cancellation emails include the customer's email on its own line
function extractCustomerEmail(text: string): string | null {
  const m = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/)
  return m ? m[0] : null
}
