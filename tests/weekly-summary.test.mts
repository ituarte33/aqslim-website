import assert from 'node:assert/strict'
import test from 'node:test'
import { buildWeeklySummary, weeklySummaryPeriod } from '../lib/weekly-summary.ts'
import type { MealLog } from '../lib/airtable.ts'
import type { Fast36Session } from '../lib/fast36-policy.ts'

function meal(id: string, date: string, status: 'Consumed' | 'Reference only' | 'Unconfirmed', carbs: number, calories = 200): MealLog {
  return {
    id,
    createdTime: `${date}T18:00:00.000Z`,
    fields: {
      Date: date,
      Timestamp: `${date}T18:00:00.000Z`,
      'Consumption Status': status,
      'Carbs (g)': carbs,
      Calories: calories,
      'Fats (g)': 10,
      'Proteins (g)': 15,
    },
  }
}

test('uses a Pacific Monday-to-Sunday week with DST-safe UTC boundaries', () => {
  const period = weeklySummaryPeriod(Date.parse('2026-08-18T19:00:00Z'))
  assert.equal(period.today, '2026-08-18')
  assert.equal(period.startDate, '2026-08-17')
  assert.equal(period.endDate, '2026-08-23')
  assert.equal(period.startUtc, '2026-08-17T07:00:00.000Z')
  assert.equal(period.endUtc, '2026-08-24T07:00:00.000Z')
  assert.equal(period.daysElapsed, 2)
})

test('counts only confirmed meals in nutrition totals and preserves other scan states', () => {
  const logs = [
    meal('recMealExample01', '2026-08-17', 'Consumed', 12, 280),
    meal('recMealExample02', '2026-08-18', 'Consumed', 8, 220),
    meal('recMealExample03', '2026-08-18', 'Unconfirmed', 70, 900),
    meal('recMealExample04', '2026-08-18', 'Reference only', 50, 600),
  ]
  const summary = buildWeeklySummary(logs, [], Date.parse('2026-08-18T19:00:00Z'))
  assert.equal(summary.totalScans, 4)
  assert.equal(summary.confirmedMeals, 2)
  assert.equal(summary.daysWithConfirmedMeals, 2)
  assert.equal(summary.unconfirmed, 1)
  assert.equal(summary.referenceOnly, 1)
  assert.equal(summary.totalCarbs, 20)
  assert.equal(summary.totalCalories, 500)
  assert.equal(summary.averageCarbsPerMeal, 10)
})

test('shows only a documented overlapping Fast 36 session without inferring completion', () => {
  const session: Fast36Session = {
    id: 'recFast36Example1',
    week: 1,
    startAt: '2026-08-17T05:00:00.000Z',
    plannedEndAt: '2026-08-18T17:00:00.000Z',
    actualEndAt: null,
    status: 'active',
  }
  const summary = buildWeeklySummary([], [session], Date.parse('2026-08-19T19:00:00Z'))
  assert.equal(summary.fast36?.status, 'active')
  assert.equal(summary.fast36?.week, 1)
})
