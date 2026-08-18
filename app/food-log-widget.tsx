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
    'Consumption Status'?: 'Unconfirmed' | 'Consumed' | 'Reference only'
  }
}

type Period = 'today' | 'week' | 'month'

const COPY = {
  es: {
    loading:   'Cargando registro…',
    noMeals:   'Aún no hay escaneos registrados.',
    scan:      'Escanea un plato',
    toStart:   'para comenzar.',
    title:     'Historial de Escaneos',
    tabs:      { today: 'Hoy', week: 'Esta Semana', month: 'Este Mes' },
    meals:     (n: number) => `${n} comida${n !== 1 ? 's' : ''} confirmada${n !== 1 ? 's' : ''}`,
    noPeriod:  (p: Period) => p === 'today' ? 'Sin escaneos hoy.' : p === 'week' ? 'Sin escaneos esta semana.' : 'Sin escaneos este mes.',
    status: { Unconfirmed: 'Sin confirmar', Consumed: 'Consumido', 'Reference only': 'Solo referencia' } as Record<string, string>,
    kcal: 'kcal', carbs: 'carbos', fats: 'grasas', protein: 'proteína',
  },
  en: {
    loading:   'Loading meal log…',
    noMeals:   'No scans saved yet.',
    scan:      'Scan a plate',
    toStart:   'to start tracking.',
    title:     'Scan History',
    tabs:      { today: 'Today', week: 'This Week', month: 'This Month' },
    meals:     (n: number) => `${n} confirmed meal${n !== 1 ? 's' : ''}`,
    noPeriod:  (p: Period) => p === 'today' ? 'No scans today.' : p === 'week' ? 'No scans this week.' : 'No scans this month.',
    status: { Unconfirmed: 'Unconfirmed', Consumed: 'Consumed', 'Reference only': 'Reference only' } as Record<string, string>,
    kcal: 'kcal', carbs: 'carbs', fats: 'fats', protein: 'protein',
  },
}

interface Props {
  logs?: LogEntry[]
  today?: string
  weekStart?: string
  monthStart?: string
  lang?: 'es' | 'en'
}

export function FoodLogWidget({ logs: propLogs, today: propToday, weekStart: propWeekStart, monthStart: propMonthStart, lang = 'en' }: Props) {
  const selfFetch = propLogs === undefined

  const [fetched, setFetched] = useState<{
    logs: LogEntry[]
    today: string
    weekStart: string
    monthStart: string
  } | null>(null)
  const [loading, setLoading] = useState(selfFetch)
  const [period, setPeriod] = useState<Period>('today')

  const t = COPY[lang]

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

  if (loading) return <div className="flw-wrap"><div className="flw-loading">{t.loading}</div></div>

  if (!logs.length) return (
    <div className="flw-wrap">
      <div className="flw-empty">
        {t.noMeals}{' '}
        <a href="/food-scanner" style={{ color: 'var(--gold)', textDecoration: 'none' }}>{t.scan}</a>{' '}
        {t.toStart}
      </div>
    </div>
  )

  const cutoff   = period === 'today' ? today : period === 'week' ? weekStart : monthStart
  const filtered = logs.filter(l => (l.fields['Date'] ?? '') >= cutoff)
  const consumed = filtered.filter(l => l.fields['Consumption Status'] === 'Consumed')

  const totals = consumed.reduce(
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
        <div className="flw-title">{t.title}</div>
        <div className="flw-tabs">
          {(['today', 'week', 'month'] as Period[]).map(p => (
            <button key={p} className={`flw-tab${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)} type="button">
              {t.tabs[p]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="flw-summary">
          <div className="flw-summary-item">
            <span className="flw-summary-val">{totals.calories}</span>
            <span className="flw-summary-lbl">{t.kcal}</span>
          </div>
          <div className="flw-summary-sep" />
          <div className="flw-summary-item">
            <span className="flw-summary-val" style={{ color: '#C9A84C' }}>{totals.carbs}g</span>
            <span className="flw-summary-lbl">{t.carbs}</span>
          </div>
          <div className="flw-summary-item">
            <span className="flw-summary-val" style={{ color: '#9A9590' }}>{totals.fats}g</span>
            <span className="flw-summary-lbl">{t.fats}</span>
          </div>
          <div className="flw-summary-item">
            <span className="flw-summary-val" style={{ color: '#E2C87A' }}>{totals.proteins}g</span>
            <span className="flw-summary-lbl">{t.protein}</span>
          </div>
          <div className="flw-summary-count">{t.meals(consumed.length)}</div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flw-empty">{t.noPeriod(period)}</div>
      ) : (
        <div className="flw-list">
          {filtered.map(log => (
            <div key={log.id} className="flw-row">
              <div className="flw-row-food">
                {log.fields['Meal Type'] && <span className="flw-row-type">{log.fields['Meal Type']}</span>}
                {log.fields['Food Description'] ?? '—'}
                <span className={`flw-row-status flw-row-status--${(log.fields['Consumption Status'] ?? 'Unconfirmed').toLowerCase().replace(/\s+/g, '-')}`}>
                  {t.status[log.fields['Consumption Status'] ?? 'Unconfirmed']}
                </span>
              </div>
              <div className="flw-row-macros">
                <span className="flw-row-cal">{log.fields['Calories'] ?? 0} {t.kcal}</span>
                <span style={{ color: '#C9A84C' }}>C {log.fields['Carbs (g)'] ?? 0}g</span>
                <span style={{ color: '#9A9590' }}>F {log.fields['Fats (g)'] ?? 0}g</span>
                <span style={{ color: '#E2C87A' }}>P {log.fields['Proteins (g)'] ?? 0}g</span>
              </div>
              <div className="flw-row-date">
                {log.fields['Timestamp']
                  ? new Date(log.fields['Timestamp']).toLocaleTimeString(lang === 'es' ? 'es-MX' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                  : log.fields['Date'] ?? ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
