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
    console.error('[booking-webhook] email_body_fetch_failed', {
      errorType: error instanceof Error ? error.name : 'UnknownError',
    })
    return NextResponse.json({ ok: true })
  }

  const customerEmail = extractCustomerEmail(email.text)
  if (!customerEmail) {
    console.error('[booking-webhook] Could not extract customer email from body')
    return NextResponse.json({ ok: true })
  }

  const cliente = await getClienteByEmail(customerEmail).catch(() => null)
  if (!cliente) {
    console.log('[booking-webhook] patient_record_not_found')
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
    console.log('[booking-webhook] booking_recorded')
  } else {
    await updateCliente(cliente.id, {
      [CLIENTES_FIELDS.CITA_AGENDADA]:         false,
      [CLIENTES_FIELDS.PROXIMA_CITA]:          null,
      [CLIENTES_FIELDS.SERVICIO_PROXIMA_CITA]: null,
    })
    console.log('[booking-webhook] cancellation_recorded')
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

// Square email body format (actual):
//   "Monday, May 11, 2026"  (one line)
//   "5:15 PM - 5:45 PM PDT" (next line)
function extractAppointmentDatetime(text: string): string | null {
  // Capture date, start time, and optional timezone abbreviation (PDT/PST).
  const m = text.match(
    /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\w+ \d{1,2},\s+\d{4})\s*[\r\n]+\s*(\d{1,2}:\d{2}\s*(?:AM|PM))(?:[^\n]*(PDT|PST))?/i
  )
  if (!m) return null

  // new Date("May 11, 2026 5:15 PM") on Vercel's UTC server treats the time as
  // UTC. The appointment is actually Pacific time, so we must add the PT offset
  // to shift from the incorrectly-UTC-treated value back to true UTC.
  const d = new Date(`${m[1]} ${m[2]}`)
  if (isNaN(d.getTime())) return null

  const tz = (m[3] ?? 'PDT').toUpperCase()
  const ptOffsetMs = (tz === 'PST' ? 8 : 7) * 3_600_000  // PST=UTC-8, PDT=UTC-7
  return new Date(d.getTime() + ptOffsetMs).toISOString()
}

// Service name appears on its own line immediately after the time range line:
//   "5:15 PM - 5:45 PM PDT"
//   ""
//   "New Client"    ← this is what we want
function extractServiceName(text: string): string | null {
  const m = text.match(
    /\d{1,2}:\d{2}\s*(?:AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM)[^\n]*\n[\s\n]*([^\n]+)/i
  )
  if (!m) return null
  const val = m[1].trim()
  if (!val) return null
  // Skip if it looks like a phone number or email address
  if (/^\+?[\d\s().,-]{7,}$/.test(val)) return null
  if (/@/.test(val)) return null
  return val
}
