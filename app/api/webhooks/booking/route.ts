import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { getClienteByEmail, updateCliente, CLIENTES_FIELDS } from '@/lib/airtable'

interface ResendEmailReceived {
  text?: string
  html?: string
}

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
  const subjectLower = subject.toLowerCase()

  // Only process Square appointment notifications
  if (!from.toLowerCase().includes('squareup.com') && !from.toLowerCase().includes('square.com')) {
    return NextResponse.json({ ok: true })
  }

  // Determine whether this is a booking or cancellation
  const isBooking     = subjectLower.includes('new appointment')
  const isCancellation = subjectLower.includes('cancel')

  if (!isBooking && !isCancellation) {
    return NextResponse.json({ ok: true })
  }

  // Fetch full email from Resend — the text field has the customer email on its own line
  const emailData = await fetchReceivedEmail(email_id)
  const body = emailData?.text ?? (emailData?.html ?? '').replace(/<[^>]+>/g, ' ')

  const customerEmail = extractCustomerEmail(body)
  if (!customerEmail) {
    console.error('[booking-webhook] Could not extract customer email', { email_id, subject })
    return NextResponse.json({ ok: true })
  }

  const cliente = await getClienteByEmail(customerEmail).catch(() => null)
  if (!cliente) {
    console.log('[booking-webhook] No Airtable record for:', customerEmail)
    return NextResponse.json({ ok: true })
  }

  const citaAgendada = isBooking  // true on booking, false on cancellation
  await updateCliente(cliente.id, { [CLIENTES_FIELDS.CITA_AGENDADA]: citaAgendada })
  console.log(`[booking-webhook] Set Cita Agendada=${citaAgendada} for ${customerEmail}`)

  return NextResponse.json({ ok: true })
}

async function fetchReceivedEmail(emailId: string): Promise<ResendEmailReceived | null> {
  const res = await fetch(`https://api.resend.com/emails/received/${emailId}`, {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  })
  if (!res.ok) {
    console.error('[booking-webhook] Failed to fetch email body', res.status)
    return null
  }
  return res.json() as Promise<ResendEmailReceived>
}

function extractCustomerEmail(body: string): string | null {
  const matches = body.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g) ?? []
  return (
    matches.find(
      (e) =>
        !e.includes('squareup.com') &&
        !e.includes('square.com') &&
        !e.includes('squarecdn.com') &&
        !e.includes('amazonses.com') &&
        !e.includes('resend') &&
        !e.toLowerCase().includes('noreply') &&
        !e.toLowerCase().includes('no-reply')
    ) ?? null
  )
}
