import test from 'node:test'
import assert from 'node:assert/strict'
import { businessDate, businessDateTimeToUtc, businessMidnight, businessPeriod } from '../lib/business-time.ts'
import { getFinancesSummary, getMonthlyRevenue, getUpcomingBookings, getTodaysBookingCount } from '../lib/square.ts'

test('business periods resolve Pacific midnight independently across DST and month boundaries', () => {
  assert.equal(businessMidnight('2026-11-01'), '2026-11-01T07:00:00.000Z')
  assert.equal(businessMidnight('2026-11-02'), '2026-11-02T08:00:00.000Z')
  assert.equal(businessMidnight('2026-03-08'), '2026-03-08T08:00:00.000Z')
  assert.equal(businessMidnight('2026-03-09'), '2026-03-09T07:00:00.000Z')
  assert.equal(businessDate(new Date('2026-11-01T06:59:00Z')), '2026-10-31')
  const period = businessPeriod(new Date('2026-11-01T19:00:00Z'))
  assert.equal(period.weekStart, '2026-10-26T07:00:00.000Z')
  assert.equal(period.monthStart, '2026-11-01T07:00:00.000Z')
})

test('Square week includes preceding-month payments without inflating month totals', async t => {
  const previous = globalThis.fetch
  t.after(() => { globalThis.fetch = previous })
  const urls: URL[] = []
  const payment = (id: string, created_at: string, amount: number, status = 'COMPLETED') => ({ id, created_at, status, total_money: { amount, currency: 'USD' }, source_type: 'CARD' })
  globalThis.fetch = async input => {
    const url = new URL(String(input)); urls.push(url)
    return Response.json(url.searchParams.has('cursor') ? { payments: [payment('p3', '2026-11-01T18:00:00Z', 4000)] } : {
      payments: [payment('p1', '2026-10-31T23:00:00Z', 3000), payment('p2', '2026-11-01T08:00:00Z', 2000), payment('p4', '2026-11-01T09:00:00Z', 9000, 'FAILED')], cursor: 'next',
    })
  }
  const summary = await getFinancesSummary(new Date('2026-11-01T19:00:00Z'))
  assert.equal(summary.week, 90)
  assert.equal(summary.month, 60)
  assert.equal(summary.today, 60)
  assert.equal(summary.recent.length, 2)
  assert.equal(urls[0].searchParams.get('begin_time'), '2026-10-26T07:00:00.000Z')
  urls.length = 0
  await getMonthlyRevenue(new Date('2026-11-01T06:59:00Z'))
  assert.equal(urls[0].searchParams.get('begin_time'), '2026-10-01T07:00:00.000Z')
})

test('Square appointments paginate, deduplicate and reject past/cancelled/invalid rows', async t => {
  const previous = globalThis.fetch
  t.after(() => { globalThis.fetch = previous })
  const row = (id: string, start_at: string, status = 'ACCEPTED') => ({ id, start_at, status })
  globalThis.fetch = async input => {
    const url = new URL(String(input))
    return Response.json(url.searchParams.has('cursor') ? { bookings: [row('b1', '2026-11-02T19:00:00Z'), row('b2', '2026-11-03T08:00:00Z')] } : {
      bookings: [row('old', '2026-11-01T19:00:00Z'), row('b1', '2026-11-02T19:00:00Z'), row('cancelled', '2026-11-02T20:00:00Z', 'CANCELLED_BY_CUSTOMER'), row('invalid', 'bad date')], cursor: 'second',
    })
  }
  const now = new Date('2026-11-02T18:00:00Z')
  assert.deepEqual((await getUpcomingBookings(now)).map(booking => booking.id), ['b1', 'b2'])
  assert.equal(await getTodaysBookingCount(now), 1)
})


test('manual next-appointment times use Pacific time and reject nonexistent DST times', () => {
  assert.equal(businessDateTimeToUtc('2026-11-17T15:24'), '2026-11-17T23:24:00.000Z')
  assert.equal(businessDateTimeToUtc('2026-08-17T15:24'), '2026-08-17T22:24:00.000Z')
  assert.throws(() => businessDateTimeToUtc('2026-03-08T02:30'), /BUSINESS_DATE_INVALID/)
  assert.throws(() => businessDateTimeToUtc('2026-02-30T10:00'), /BUSINESS_DATE_INVALID/)
})
