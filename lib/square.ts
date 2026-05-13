const BASE = process.env.SQUARE_ENVIRONMENT === 'sandbox'
  ? 'https://connect.squareupsandbox.com/v2'
  : 'https://connect.squareup.com/v2'

async function squareFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Square-Version': '2024-10-17',
      ...options?.headers,
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Square ${res.status}: ${text}`)
  }
  return res.json()
}

export interface SquarePayment {
  id: string
  created_at: string
  total_money: { amount: number; currency: string }
  status: string
  source_type: string
  card_details?: { card?: { last_4?: string; card_brand?: string } }
  note?: string
}

async function fetchAllPayments(beginTime: string): Promise<SquarePayment[]> {
  const payments: SquarePayment[] = []
  let cursor: string | undefined

  do {
    const params = new URLSearchParams({
      location_id: process.env.SQUARE_LOCATION_ID!,
      begin_time: beginTime,
      sort_order: 'DESC',
      limit: '100',
    })
    if (cursor) params.set('cursor', cursor)

    const data = await squareFetch(`/payments?${params}`)
    const batch: SquarePayment[] = data.payments ?? []
    payments.push(...batch.filter(p => p.status === 'COMPLETED'))
    cursor = data.cursor
  } while (cursor)

  return payments
}

function centsToUSD(cents: number): number {
  return cents / 100
}

function sum(payments: SquarePayment[]): number {
  return centsToUSD(
    payments.reduce((acc, p) => acc + (p.total_money?.amount ?? 0), 0)
  )
}

// Returns today/week/month totals + recent payments, all from a single API sweep.
export async function getFinancesSummary() {
  const now = new Date()

  // Derive current date in Pacific time so "today" / "this week" match the business timezone.
  const ptParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false,
  }).formatToParts(now)
  const ptGet = (t: string) => Number(ptParts.find(p => p.type === t)?.value ?? 0)
  const ptYear = ptGet('year'), ptMonth = ptGet('month'), ptDay = ptGet('day')

  // "PT clock treated as UTC" lets us recover the real PT→UTC offset at this instant.
  const ptAsUTC  = new Date(Date.UTC(ptYear, ptMonth - 1, ptDay, ptGet('hour'), ptGet('minute'), ptGet('second')))
  const offsetMs = now.getTime() - ptAsUTC.getTime()

  // PT midnight → UTC instant
  const todayStart = new Date(Date.UTC(ptYear, ptMonth - 1, ptDay) + offsetMs)

  // Day of week in PT (0=Sun…6=Sat); use noon UTC on that date to avoid DST edge cases.
  const dow = new Date(Date.UTC(ptYear, ptMonth - 1, ptDay, 12)).getUTCDay()
  const weekStart = new Date(todayStart.getTime() - (dow === 0 ? 6 : dow - 1) * 86_400_000)

  const monthStart = new Date(Date.UTC(ptYear, ptMonth - 1, 1) + offsetMs)
  const all = await fetchAllPayments(monthStart.toISOString())

  const todayISO = todayStart.toISOString()
  const weekISO  = weekStart.toISOString()

  return {
    month:  sum(all),
    week:   sum(all.filter(p => p.created_at >= weekISO)),
    today:  sum(all.filter(p => p.created_at >= todayISO)),
    recent: all.slice(0, 25),
  }
}

// ---------- Bookings ----------

export interface SquareBooking {
  id: string
  status: string
  start_at: string
  duration_minutes: number
  customer_id: string
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  service_name?: string
}

async function getCustomerInfo(customerId: string): Promise<{
  name?: string; email?: string; phone?: string
}> {
  try {
    const data = await squareFetch(`/customers/${customerId}`)
    const c = data.customer
    const name = [c.given_name, c.family_name].filter(Boolean).join(' ') || undefined
    return { name, email: c.email_address, phone: c.phone_number }
  } catch {
    return {}
  }
}

async function getServiceVariationName(variationId: string): Promise<string | undefined> {
  try {
    const data = await squareFetch(`/catalog/object/${variationId}?include_related_objects=true`)
    // Prefer the parent ITEM name (e.g. "New Client") over the variation name (e.g. "Regular")
    const parent = (data.related_objects ?? []).find((o: { type: string }) => o.type === 'ITEM')
    return parent?.item_data?.name ?? data.object?.item_variation_data?.name
  } catch {
    return undefined
  }
}

export async function getUpcomingBookings(): Promise<SquareBooking[]> {
  const params = new URLSearchParams({
    location_id: process.env.SQUARE_LOCATION_ID!,
    start_at_min: new Date().toISOString(),
    limit: '100',
  })

  const data = await squareFetch(`/bookings?${params}`)
  const CANCELLED = new Set(['CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_MERCHANT', 'DECLINED', 'NO_SHOW'])
  const raw: {
    id: string
    status: string
    start_at: string
    customer_id?: string
    appointment_segments?: { duration_minutes?: number; service_variation_id?: string }[]
  }[] = (data.bookings ?? []).filter((b: { status: string }) => !CANCELLED.has(b.status))

  // Deduplicate IDs before fetching to avoid redundant API calls
  const customerIds   = [...new Set(raw.map(b => b.customer_id).filter(Boolean) as string[])]
  const variationIds  = [...new Set(
    raw.flatMap(b => b.appointment_segments?.map(s => s.service_variation_id) ?? [])
       .filter(Boolean) as string[]
  )]

  const [customerMap, serviceMap] = await Promise.all([
    Promise.all(customerIds.map(async id => [id, await getCustomerInfo(id)] as const))
      .then(Object.fromEntries),
    Promise.all(variationIds.map(async id => [id, await getServiceVariationName(id)] as const))
      .then(Object.fromEntries),
  ])

  return raw
    .map(b => {
      const seg     = b.appointment_segments?.[0]
      const customer = b.customer_id ? customerMap[b.customer_id] ?? {} : {}
      return {
        id:               b.id,
        status:           b.status,
        start_at:         b.start_at,
        duration_minutes: seg?.duration_minutes ?? 0,
        customer_id:      b.customer_id ?? '',
        customer_name:    customer.name,
        customer_email:   customer.email,
        customer_phone:   customer.phone,
        service_name:     seg?.service_variation_id ? serviceMap[seg.service_variation_id] : undefined,
      } satisfies SquareBooking
    })
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
}

// ---------- Booking API types ----------

export interface SquareService {
  id: string            // catalog ITEM id
  variationId: string   // ITEM_VARIATION id
  name: string
  description?: string
  durationMinutes: number
  priceCents: number
}

export interface AvailableSlot {
  startAt: string
  teamMemberId: string
  serviceVariationId: string
  serviceVariationVersion: number
}

// ---------- Booking API helpers ----------

// Convert a YYYY-MM-DD Pacific date to UTC start/end for that calendar day.
function ptDateToUtcRange(dateStr: string): { start: string; end: string } {
  const [y, m, d] = dateStr.split('-').map(Number)
  // Sample noon UTC to determine the Pacific offset (PST=-8, PDT=-7)
  const sampleUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  const ptHour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      hour12: false,
    }).format(sampleUtc),
    10
  ) // 4 (PST) or 5 (PDT) when UTC=12
  const utcOffsetHours = ptHour - 12  // -8 or -7
  const startMs = Date.UTC(y, m - 1, d) - utcOffsetHours * 3_600_000
  return {
    start: new Date(startMs).toISOString(),
    end:   new Date(startMs + 24 * 3_600_000 - 1_000).toISOString(),
  }
}

// Fetch bookable catalog items. Pass allowedNames to filter by name (case-insensitive);
// omit or pass undefined to return every bookable service.
export async function getBookableServices(allowedNames?: string[]): Promise<SquareService[]> {
  const lower = allowedNames?.map(n => n.toLowerCase()) ?? null
  const services: SquareService[] = []
  let cursor: string | undefined

  do {
    const params = new URLSearchParams({ types: 'ITEM' })
    if (cursor) params.set('cursor', cursor)
    const data = await squareFetch(`/catalog/list?${params}`)

    for (const obj of data.objects ?? []) {
      if (obj.type !== 'ITEM') continue
      const item = obj.item_data
      if (lower && !lower.includes((item?.name ?? '').toLowerCase())) continue

      for (const variation of item?.variations ?? []) {
        const vd = variation.item_variation_data
        if (vd?.available_for_booking === false) continue
        services.push({
          id:              obj.id,
          variationId:     variation.id,
          name:            item.name,
          description:     item.description,
          durationMinutes: Math.round((vd?.service_duration ?? 0) / 60_000),
          priceCents:      vd?.price_money?.amount ?? 0,
        })
      }
    }
    cursor = data.cursor
  } while (cursor)

  return services
}

// Return available time slots for a service variation on a given Pacific date.
export async function searchAvailability(
  serviceVariationId: string,
  dateStr: string,
  locationId: string,
): Promise<AvailableSlot[]> {
  const { start, end } = ptDateToUtcRange(dateStr)
  const data = await squareFetch('/bookings/availability/search', {
    method: 'POST',
    body: JSON.stringify({
      query: {
        filter: {
          start_at_range: { start_at: start, end_at: end },
          location_id: locationId,
          segment_filters: [{ service_variation_id: serviceVariationId }],
        },
      },
    }),
  })

  return (data.availabilities ?? [])
    .filter((a: { appointment_segments?: unknown[] }) => (a.appointment_segments ?? []).length > 0)
    .map((a: {
      start_at: string
      appointment_segments: { team_member_id: string; service_variation_id: string; service_variation_version: number }[]
    }) => {
      const seg = a.appointment_segments[0]
      return {
        startAt:                seg.team_member_id ? a.start_at : a.start_at,
        teamMemberId:           seg.team_member_id,
        serviceVariationId:     seg.service_variation_id,
        serviceVariationVersion:seg.service_variation_version,
      } satisfies AvailableSlot
    })
}

// Find a Square customer by email, or create one if not found. Returns customer_id.
export async function findOrCreateSquareCustomer(
  email: string,
  givenName: string,
  familyName?: string,
  phone?: string,
): Promise<string> {
  const search = await squareFetch('/customers/search', {
    method: 'POST',
    body: JSON.stringify({ query: { filter: { email_address: { exact: email } } } }),
  })
  if (search.customers?.length > 0) return search.customers[0].id as string

  const body: Record<string, string> = {
    idempotency_key: `create-${email}-${Date.now()}`,
    given_name:      givenName,
    email_address:   email,
  }
  if (familyName) body.family_name = familyName
  if (phone)      body.phone_number = phone

  const created = await squareFetch('/customers', { method: 'POST', body: JSON.stringify(body) })
  return created.customer.id as string
}

// Create a booking for a customer using a slot from searchAvailability.
export async function createSquareBooking(
  customerId: string,
  slot: AvailableSlot,
  locationId: string,
): Promise<{ bookingId: string; startAt: string }> {
  const data = await squareFetch('/bookings', {
    method: 'POST',
    body: JSON.stringify({
      idempotency_key: `book-${customerId}-${slot.startAt}-${slot.serviceVariationId}`,
      booking: {
        start_at:    slot.startAt,
        location_id: locationId,
        customer_id: customerId,
        appointment_segments: [{
          service_variation_id:      slot.serviceVariationId,
          service_variation_version: slot.serviceVariationVersion,
          team_member_id:            slot.teamMemberId,
        }],
      },
    }),
  })
  return { bookingId: data.booking.id as string, startAt: data.booking.start_at as string }
}

// Return true if the customer with this email has any upcoming (non-cancelled) Square booking.
export async function hasUpcomingBookingByEmail(email: string): Promise<boolean> {
  try {
    const search = await squareFetch('/customers/search', {
      method: 'POST',
      body: JSON.stringify({ query: { filter: { email_address: { exact: email } } } }),
    })
    if (!search.customers?.length) return false
    const customerId = search.customers[0].id as string

    const params = new URLSearchParams({
      customer_id:   customerId,
      location_id:   process.env.SQUARE_LOCATION_ID!,
      start_at_min:  new Date().toISOString(),
      limit:         '5',
    })
    const bookings = await squareFetch(`/bookings?${params}`)
    const CANCELLED = new Set(['CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_MERCHANT', 'DECLINED', 'NO_SHOW'])
    return (bookings.bookings ?? []).some((b: { status: string }) => !CANCELLED.has(b.status))
  } catch {
    return false
  }
}

// Returns the count of remaining bookings for today (Pacific time, from now onward).
export async function getTodaysBookingCount(): Promise<number> {
  const now = new Date()

  // Compute end-of-day in Pacific time as a UTC instant
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false,
  }).formatToParts(now)
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0)

  // "PT time treated as UTC" lets us compute the real UTC↔PT offset at this moment
  const ptAsUTC = new Date(Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')))
  const offsetMs = now.getTime() - ptAsUTC.getTime()

  // End of PT today = 23:59:59 PT → expressed as UTC
  const endOfDayUTC = new Date(
    Date.UTC(get('year'), get('month') - 1, get('day'), 23, 59, 59, 999) + offsetMs
  )

  const params = new URLSearchParams({
    location_id: process.env.SQUARE_LOCATION_ID!,
    start_at_min: now.toISOString(),
    start_at_max: endOfDayUTC.toISOString(),
    limit: '100',
  })

  const data = await squareFetch(`/bookings?${params}`)
  const CANCELLED = new Set(['CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_MERCHANT', 'DECLINED', 'NO_SHOW'])
  return (data.bookings ?? []).filter(
    (b: { status: string }) => !CANCELLED.has(b.status)
  ).length
}

// Search Square customers by email (fuzzy) or phone. Returns raw customer objects.
export async function searchSquareCustomers(query: string): Promise<{
  id: string
  given_name?: string
  family_name?: string
  email_address?: string
  phone_number?: string
}[]> {
  const q = query.trim()
  if (!q) return []

  // Try email fuzzy first, then phone exact — run in parallel and merge
  const [byEmail, byPhone] = await Promise.all([
    squareFetch('/customers/search', {
      method: 'POST',
      body: JSON.stringify({ query: { filter: { email_address: { fuzzy: q } } }, limit: 10 }),
    }).then(d => d.customers ?? []).catch(() => [] as unknown[]),
    squareFetch('/customers/search', {
      method: 'POST',
      body: JSON.stringify({ query: { filter: { phone_number: { exact: q } } }, limit: 5 }),
    }).then(d => d.customers ?? []).catch(() => [] as unknown[]),
  ])

  const seen = new Set<string>()
  const results: { id: string; given_name?: string; family_name?: string; email_address?: string; phone_number?: string }[] = []
  for (const c of [...byEmail, ...byPhone] as { id: string; given_name?: string; family_name?: string; email_address?: string; phone_number?: string }[]) {
    if (!seen.has(c.id)) { seen.add(c.id); results.push(c) }
  }
  return results
}

// ---------- Revenue ----------

// Lightweight version for the Resumen dashboard card.
export async function getMonthlyRevenue(): Promise<number> {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const all = await fetchAllPayments(monthStart.toISOString())
  return sum(all)
}
