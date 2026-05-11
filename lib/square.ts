const BASE = 'https://connect.squareup.com/v2'

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

// Lightweight version for the Resumen dashboard card.
export async function getMonthlyRevenue(): Promise<number> {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const all = await fetchAllPayments(monthStart.toISOString())
  return sum(all)
}
