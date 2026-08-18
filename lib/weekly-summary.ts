import type { MealLog } from './airtable'
import type { Fast36Session, Fast36Status } from './fast36-policy'

const PACIFIC_TIME_ZONE = 'America/Los_Angeles'

export type WeeklySummaryDay = {
  date: string
  mealCount: number
  calories: number
  carbs: number
  isFuture: boolean
}

export type WeeklySummaryData = {
  startDate: string
  endDate: string
  today: string
  daysElapsed: number
  totalScans: number
  confirmedMeals: number
  referenceOnly: number
  unconfirmed: number
  daysWithConfirmedMeals: number
  totalCalories: number
  totalCarbs: number
  totalFats: number
  totalProteins: number
  averageCarbsPerMeal: number | null
  days: WeeklySummaryDay[]
  fast36: {
    week: number
    status: Fast36Status
    startAt: string
    plannedEndAt: string
  } | null
}

function pacificDate(nowMs: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PACIFIC_TIME_ZONE }).format(new Date(nowMs))
}

function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days, 12)).toISOString().slice(0, 10)
}

function utcAtPacificMidnight(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const sampleUtc = new Date(Date.UTC(year, month - 1, day, 12))
  const pacificHour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TIME_ZONE,
    hour: 'numeric',
    hour12: false,
    hourCycle: 'h23',
  }).format(sampleUtc))
  const offsetHours = 12 - pacificHour
  return new Date(Date.UTC(year, month - 1, day, offsetHours)).toISOString()
}

export function weeklySummaryPeriod(nowMs = Date.now()) {
  const today = pacificDate(nowMs)
  const [year, month, day] = today.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday
  const startDate = shiftDate(today, mondayOffset)
  const endDate = shiftDate(startDate, 6)
  const nextMonday = shiftDate(startDate, 7)

  return {
    today,
    startDate,
    endDate,
    startUtc: utcAtPacificMidnight(startDate),
    endUtc: utcAtPacificMidnight(nextMonday),
    daysElapsed: Math.min(7, Math.max(1, -mondayOffset + 1)),
    dateKeys: Array.from({ length: 7 }, (_, index) => shiftDate(startDate, index)),
  }
}

function mealDate(log: MealLog): string {
  const storedDate = log.fields['Date']
  if (storedDate) return storedDate.slice(0, 10)
  const timestamp = log.fields['Timestamp'] ?? log.createdTime
  const parsed = Date.parse(timestamp)
  return Number.isFinite(parsed) ? pacificDate(parsed) : ''
}

function rounded(value: number): number {
  return Math.round(value * 10) / 10
}

export function buildWeeklySummary(
  logs: readonly MealLog[],
  fast36Sessions: readonly Fast36Session[],
  nowMs = Date.now(),
): WeeklySummaryData {
  const period = weeklySummaryPeriod(nowMs)
  const periodLogs = logs.filter(log => {
    const date = mealDate(log)
    return date >= period.startDate && date <= period.endDate
  })
  const confirmed = periodLogs.filter(log => log.fields['Consumption Status'] === 'Consumed')
  const referenceOnly = periodLogs.filter(log => log.fields['Consumption Status'] === 'Reference only').length
  const unconfirmed = periodLogs.filter(log => !log.fields['Consumption Status'] || log.fields['Consumption Status'] === 'Unconfirmed').length

  const daily = new Map(period.dateKeys.map(date => [date, {
    date,
    mealCount: 0,
    calories: 0,
    carbs: 0,
    isFuture: date > period.today,
  }]))
  let totalCalories = 0
  let totalCarbs = 0
  let totalFats = 0
  let totalProteins = 0

  for (const log of confirmed) {
    const date = mealDate(log)
    const day = daily.get(date)
    if (!day) continue
    const calories = log.fields['Calories'] ?? 0
    const carbs = log.fields['Carbs (g)'] ?? 0
    const fats = log.fields['Fats (g)'] ?? 0
    const proteins = log.fields['Proteins (g)'] ?? 0
    day.mealCount += 1
    day.calories += calories
    day.carbs += carbs
    totalCalories += calories
    totalCarbs += carbs
    totalFats += fats
    totalProteins += proteins
  }

  const periodStartMs = Date.parse(period.startUtc)
  const periodEndMs = Date.parse(period.endUtc)
  const fast36 = fast36Sessions.find(session => {
    const start = Date.parse(session.startAt)
    const end = Date.parse(session.actualEndAt ?? session.plannedEndAt)
    return Number.isFinite(start) && Number.isFinite(end) && start < periodEndMs && end >= periodStartMs
  }) ?? null

  return {
    startDate: period.startDate,
    endDate: period.endDate,
    today: period.today,
    daysElapsed: period.daysElapsed,
    totalScans: periodLogs.length,
    confirmedMeals: confirmed.length,
    referenceOnly,
    unconfirmed,
    daysWithConfirmedMeals: Array.from(daily.values()).filter(day => day.mealCount > 0).length,
    totalCalories: rounded(totalCalories),
    totalCarbs: rounded(totalCarbs),
    totalFats: rounded(totalFats),
    totalProteins: rounded(totalProteins),
    averageCarbsPerMeal: confirmed.length ? rounded(totalCarbs / confirmed.length) : null,
    days: Array.from(daily.values()).map(day => ({
      ...day,
      calories: rounded(day.calories),
      carbs: rounded(day.carbs),
    })),
    fast36: fast36 ? {
      week: fast36.week,
      status: fast36.status,
      startAt: fast36.startAt,
      plannedEndAt: fast36.plannedEndAt,
    } : null,
  }
}
