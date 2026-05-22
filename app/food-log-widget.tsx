'use client'

import { useState, useEffect } from 'react'

export interface LogEntry {
  id: string
  createdTime: string
  fields: {
    'Food Description'?: string
    'Calories'?: number
    'Carbs (g)'?: number
    'Fats (g)'?: number
    'Proteins (g)'?: number
    'Date'?: string
    'Timestamp'?: string
    'Meal Type'?: string
  }
}

type Period = 'today' | 'week' | 'month'

interface Props {
  logs?: LogEntry[]
  today?: string
  weekStart?: string
  monthStart?: string
}

export function FoodLogWidget({ logs: propLogs, today: propToday, weekStart: propWeekStart, monthStart: propMonthStart }: Props) {
  const selfFetch = propLogs === undefined

  const [fetched, setFetched] = useState<{
    logs: LogEntry[]
    today: string
    weekStart: string
    monthStart: string
  } | null>(null)
  const [loading, setLoading] = useState(selfFetch)
  const [period, setPeriod] = useState<Period>('today')

  useEffect(() => {
    if (!selfFetch) return
    fetch('/api/food-scan')
      .then(r => r.json())
      .then(d => setFetched({
        logs:       d.logs       ?? [],
        today:      d.today      ?? '',
        weekStart:  d.weekStart  ?? '',
        monthStart: d.monthStart ?? '',
      }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selfFetch])

  const logs       = selfFetch ? (fetched?.logs       ?? []) : propLogs!
  const today      = selfFetch ? (fetched?.today      ?? '') : propToday!
  const weekStart  = selfFetch ? (fetched?.weekStart  ?? '') : propWeekStart!
  const monthStart = selfFetch ? (fetched?.monthStart ?? '') : propMonthStart!

  if (loading) return <div className="flw-wrap"><div className="flw-loading">Loading meal log…</div></div>

  if (!logs.length) return (
    <div className="flw-wrap">
      <div className="flw-empty">
        No meals logged yet.{' '}
        <a href="/food-scanner" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Scan a meal</a>{' '}
        to start tracking.
      </div>
    </div>
  )

  const cutoff   = period === 'today' ? today : period === 'week' ? weekStart : monthStart
  const filtered = logs.filter(l => (l.fields['Date'] ?? '') >= cutoff)

  const totals = filtered.reduce(
    (acc, l) => ({
      calories: acc.calories + (l.fields['Calories']    ?? 0),
      carbs:    acc.carbs    + (l.fields['Carbs (g)']   ?? 0),
      fats:     acc.fats     + (l.fields['Fats (g)']    ?? 0),
      proteins: acc.proteins + (l.fields['Proteins (g)'] ?? 0),
    }),
    { calories: 0, carbs: 0, fats: 0, proteins: 0 }
  )

  return (
    <div className="flw-wrap">
      <div className="flw-header">
        <div className="flw-title">Meal Log</div>
        <div className="flw-tabs">
          {(['today', 'week', 'month'] as Period[]).map(p => (
            <button key={p} className={`flw-tab${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)} type="button">
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="flw-summary">
          <div className="flw-summary-item">
            <span className="flw-summary-val">{totals.calories}</span>
            <span className="flw-summary-lbl">kcal</span>
          </div>
          <div className="flw-summary-sep" />
          <div className="flw-summary-item">
            <span className="flw-summary-val" style={{ color: '#C9A84C' }}>{totals.carbs}g</span>
            <span className="flw-summary-lbl">carbs</span>
          </div>
          <div className="flw-summary-item">
            <span className="flw-summary-val" style={{ color: '#9A9590' }}>{totals.fats}g</span>
            <span className="flw-summary-lbl">fats</span>
          </div>
          <div className="flw-summary-item">
            <span className="flw-summary-val" style={{ color: '#E2C87A' }}>{totals.proteins}g</span>
            <span className="flw-summary-lbl">protein</span>
          </div>
          <div className="flw-summary-count">{filtered.length} meal{filtered.length !== 1 ? 's' : ''}</div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flw-empty">
          No meals logged {period === 'today' ? 'today' : period === 'week' ? 'this week' : 'this month'}.
        </div>
      ) : (
        <div className="flw-list">
          {filtered.map(log => (
            <div key={log.id} className="flw-row">
              <div className="flw-row-food">
                {log.fields['Meal Type'] && <span className="flw-row-type">{log.fields['Meal Type']}</span>}
                {log.fields['Food Description'] ?? '—'}
              </div>
              <div className="flw-row-macros">
                <span className="flw-row-cal">{log.fields['Calories'] ?? 0} kcal</span>
                <span style={{ color: '#C9A84C' }}>C {log.fields['Carbs (g)'] ?? 0}g</span>
                <span style={{ color: '#9A9590' }}>F {log.fields['Fats (g)'] ?? 0}g</span>
                <span style={{ color: '#E2C87A' }}>P {log.fields['Proteins (g)'] ?? 0}g</span>
              </div>
              <div className="flw-row-date">
                {log.fields['Timestamp']
                  ? new Date(log.fields['Timestamp']).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                  : log.fields['Date'] ?? ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
