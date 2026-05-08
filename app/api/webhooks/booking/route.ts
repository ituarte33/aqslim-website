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

  // Fetch the full email body
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

  if (isBooking) {
    const appointmentDatetime = extractAppointmentDatetime(email.text)
    const serviceName = extractServiceName(email.text)

    if (!appointmentDatetime) console.warn('[booking-webhook] Could not extract appointment datetime')
    if (!serviceName) console.warn('[booking-webhook] Could not extract service name')

    await updateCliente(cliente.id, {
      [CLIENTES_FIELDS.CITA_AGENDADA]:         true,
      [CLIENTES_FIELDS.PROXIMA_CITA]:          appointmentDatetime ?? null,
      [CLIENTES_FIELDS.SERVICIO_PROXIMA_CITA]: serviceName ?? null,
    })
    console.log(`[booking-webhook] Booked for ${customerEmail} — ${serviceName} @ ${appointmentDatetime}`)
  } else {
    await updateCliente(cliente.id, {
      [CLIENTES_FIELDS.CITA_AGENDADA]:         false,
      [CLIENTES_FIELDS.PROXIMA_CITA]:          null,
      [CLIENTES_FIELDS.SERVICIO_PROXIMA_CITA]: null,
    })
    console.log(`[booking-webhook] Cancelled for ${customerEmail}`)
  }

  return NextResponse.json({ ok: true })
}

// Square booking emails include the customer email — extract the first non-Square address
function extractCustomerEmail(text: string): string | null {
  const matches = text.matchAll(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g)
  for (const m of matches) {
    const addr = m[0].toLowerCase()
    if (!addr.includes('squareup.com') && !addr.includes('square.com') && !addr.includes('aqslim.com')) {
      return addr
    }
  }
  return null
}

// Square emails typically have "Date: Thursday, January 15, 2026" and "Time: 10:00 AM"
function extractAppointmentDatetime(text: string): string | null {
  const dateMatch = text.match(/Date:\s*(?:\w+,\s+)?(\w+ \d{1,2},?\s+\d{4})/i)
  const timeMatch = text.match(/Time:\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i)

  if (dateMatch && timeMatch) {
    const d = new Date(`${dateMatch[1]} ${timeMatch[1]}`)
    if (!isNaN(d.getTime())) return d.toISOString()
  }

  // Fallback: day-of-week + month + date + year + time on same region
  const combined = text.match(
    /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\w+ \d{1,2},?\s+\d{4})\s+(?:at\s+)?(\d{1,2}:\d{2}\s*(?:AM|PM))/i
  )
  if (combined) {
    const d = new Date(`${combined[1]} ${combined[2]}`)
    if (!isNaN(d.getTime())) return d.toISOString()
  }

  return null
}

function extractServiceName(text: string): string | null {
  const m = text.match(/Service:\s*([^\n\r]+)/i)
  if (m) return m[1].trim()
  const m2 = text.match(/Appointment[^:]*:\s*([^\n\r]+)/i)
  if (m2) return m2[1].trim()
  return null
}
