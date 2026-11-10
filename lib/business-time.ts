export const BUSINESS_TIME_ZONE = 'America/Los_Angeles'

export function businessDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE }).format(now)
}

export function shiftBusinessDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days, 12)).toISOString().slice(0, 10)
}

// Resolve the offset at the requested wall-clock time, including DST transitions.
export function businessDateTimeToUtc(value: string): string {
  if (/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    const parsed = new Date(value)
    if (!Number.isFinite(parsed.getTime())) throw new Error('BUSINESS_DATE_INVALID')
    return parsed.toISOString()
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) throw new Error('BUSINESS_DATE_INVALID')
  const [, y, m, d, h, min, sec = '0'] = match
  const [year, month, day, hour, minute, second] = [y, m, d, h, min, sec].map(Number)
  const target = Date.UTC(year, month - 1, day, hour, minute, second)
  if (new Date(target).toISOString().slice(0, 19) !== `${y}-${m}-${d}T${h}:${min}:${sec.padStart(2, '0')}`) throw new Error('BUSINESS_DATE_INVALID')
  let instant = target
  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
    }).formatToParts(new Date(instant))
    const value = (key: string) => Number(parts.find(part => part.type === key)?.value)
    const actual = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'))
    if (actual === target) return new Date(instant).toISOString()
    instant += target - actual
  }
  throw new Error('BUSINESS_DATE_INVALID')
}

export function businessPeriod(now = new Date()) {
  const today = businessDate(now)
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay()
  const week = shiftBusinessDate(today, weekday === 0 ? -6 : 1 - weekday)
  const month = today.slice(0, 7) + '-01'
  return {
    today, week, month,
    todayStart: businessMidnight(today),
    weekStart: businessMidnight(week),
    monthStart: businessMidnight(month),
    tomorrowStart: businessMidnight(shiftBusinessDate(today, 1)),
  }
}

export function businessMidnight(date: string): string {
  return businessDateTimeToUtc(`${date}T00:00`)
}
