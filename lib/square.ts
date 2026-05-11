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

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const dow = now.getUTCDay() // 0=Sun … 6=Sat — use Monday as week start
  const weekStart = new Date(todayStart)
  weekStart.setUTCDate(todayStart.getUTCDate() - (dow === 0 ? 6 : dow - 1))

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
  const raw: {
    id: string
    status: string
    start_at: string
    customer_id?: string
    appointment_segments?: { duration_minutes?: number; service_variation_id?: string }[]
  }[] = (data.bookings ?? []).filter(
    (b: { status: string }) => b.status === 'ACCEPTED' || b.status === 'PENDING'
  )

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
  return (data.bookings ?? []).filter(
    (b: { status: string }) => b.status === 'ACCEPTED' || b.status === 'PENDING'
  ).length
}

// ---------- Revenue ----------

// Lightweight version for the Resumen dashboard card.
export async function getMonthlyRevenue(): Promise<number> {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const all = await fetchAllPayments(monthStart.toISOString())
  return sum(all)
}
