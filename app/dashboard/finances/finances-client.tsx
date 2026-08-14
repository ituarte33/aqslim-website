'use client'

import { useState, useMemo } from 'react'
import { DashboardShell } from '../dashboard-shell'
import { pt } from '@/lib/portal-type'
import type { FinanceRecord } from '@/lib/airtable'
import type { getFinancesSummary, SquarePayment } from '@/lib/square'
import { getFinanceMetrics, getGrowthMetrics } from '@/lib/finance-metrics'

// ─── Types ─────────────────────────────────────────────────────────────────────

type PeriodType = 'day' | 'week' | 'month' | 'year'

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
  records: FinanceRecord[]
  squareSummary: Awaited<ReturnType<typeof getFinancesSummary>> | null
  squareError: string | null
  airtableError: string | null
}

// ─── Format helpers ────────────────────────────────────────────────────────────

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(iso: string, lang: 'es' | 'en'): string {
  try {
    return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    }).format(new Date(iso))
  } catch { return iso }
}

function formatMethod(p: SquarePayment, lang: 'es' | 'en'): string {
  if (p.source_type === 'CARD' && p.card_details?.card) {
    const { card_brand, last_4 } = p.card_details.card
    return last_4 ? `${card_brand ?? 'Card'} ···${last_4}` : (card_brand ?? 'Card')
  }
  const labels: Record<string, { es: string; en: string }> = {
    CASH:         { es: 'Efectivo',      en: 'Cash'          },
    EXTERNAL:     { es: 'Externo',       en: 'External'      },
    WALLET:       { es: 'Billetera',     en: 'Wallet'        },
    BANK_ACCOUNT: { es: 'Transferencia', en: 'Bank Transfer' },
  }
  return labels[p.source_type]?.[lang] ?? p.source_type
}

function classifyMethod(method: string): 'cash' | 'card' | 'other' {
  const lower = method.toLowerCase()
  if (lower.includes('efectivo') || lower.includes('cash')) return 'cash'
  if (
    lower.includes('tarjeta') || lower.includes('card') ||
    lower.includes('crédito') || lower.includes('credito') ||
    lower.includes('débito')  || lower.includes('debito')
  ) return 'card'
  return 'other'
}

// ─── Period helpers ────────────────────────────────────────────────────────────

function getTodayStr(): string {
  return new Date().toLocaleDateString('en-CA')
}

function getMondayOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const dow = date.getUTCDay()
  date.setUTCDate(date.getUTCDate() + (dow === 0 ? -6 : 1 - dow))
  return date.toISOString().slice(0, 10)
}

function getInitialAnchor(type: PeriodType): string {
  const today = getTodayStr()
  if (type === 'year') return today.slice(0, 4) + '-01-01'
  if (type === 'month') return today.slice(0, 7) + '-01'
  if (type === 'week')  return getMondayOfWeek(today)
  return today
}

function getPeriodBounds(
  anchor: string,
  type: PeriodType,
  lang: 'es' | 'en',
): { start: string; end: string; label: string } {
  const [y, m, d] = anchor.split('-').map(Number)
  const locale = lang === 'es' ? 'es-MX' : 'en-US'

  if (type === 'year') {
    return { start: `${y}-01-01`, end: `${y}-12-31`, label: String(y) }
  }

  if (type === 'month') {
    const start = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const raw = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(y, m - 1, 1)))
    return { start, end, label: raw.charAt(0).toUpperCase() + raw.slice(1) }
  }

  if (type === 'week') {
    const start = anchor
    const endDate = new Date(Date.UTC(y, m - 1, d + 6))
    const end = endDate.toISOString().slice(0, 10)
    const fmt = (s: string) => {
      const [sy, sm, sd] = s.split('-').map(Number)
      return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })
        .format(new Date(Date.UTC(sy, sm - 1, sd)))
    }
    return { start, end, label: `${fmt(start)} — ${fmt(end)}, ${y}` }
  }

  const raw = new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)))
  return { start: anchor, end: anchor, label: raw.charAt(0).toUpperCase() + raw.slice(1) }
}

function navigateAnchor(anchor: string, type: PeriodType, dir: -1 | 1): string {
  const [y, m, d] = anchor.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (type === 'day')       date.setUTCDate(date.getUTCDate() + dir)
  else if (type === 'week') date.setUTCDate(date.getUTCDate() + dir * 7)
  else if (type === 'month') date.setUTCMonth(date.getUTCMonth() + dir)
  else                       date.setUTCFullYear(date.getUTCFullYear() + dir)
  return date.toISOString().slice(0, 10)
}

function isNextFuture(anchor: string, type: PeriodType): boolean {
  const today = getTodayStr()
  if (type === 'day')  return anchor > today
  if (type === 'week') return anchor > getMondayOfWeek(today)
  if (type === 'month') return anchor.slice(0, 7) > today.slice(0, 7)
  return anchor.slice(0, 4) > today.slice(0, 4)
}

function formatShortDate(dateStr: string, lang: 'es' | 'en'): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)))
}

// ─── Shared UI ─────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: pt.serif, fontSize: 22, fontWeight: 400, color: '#FAFAF8', marginBottom: 16, marginTop: 0 }}>
      {children}
    </h2>
  )
}

function SectionSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: pt.xs, color: '#6A6560', fontFamily: pt.sans, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>
      {children}
    </p>
  )
}

const NAV_BTN: React.CSSProperties = {
  width: 36, height: 36,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(201,168,76,0.3)',
  color: '#C9A84C', cursor: 'pointer', fontSize: 18,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.15s', flexShrink: 0,
}

const PERIOD_LABELS: Record<PeriodType, { es: string; en: string }> = {
  day:   { es: 'Día',    en: 'Day'   },
  week:  { es: 'Semana', en: 'Week'  },
  month: { es: 'Mes',    en: 'Month' },
  year:  { es: 'Año',    en: 'Year'  },
}

// ─── Main component ────────────────────────────────────────────────────────────

export function FinancesClient({ user, records, squareSummary, squareError, airtableError }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const es = lang === 'es'

  // Period navigator state (AQSLIM section only)
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [anchorDate, setAnchorDate] = useState<string>(() => getInitialAnchor('month'))

  function handlePeriodTypeChange(type: PeriodType) {
    setPeriodType(type)
    setAnchorDate(getInitialAnchor(type))
  }

  function navigate(dir: -1 | 1) {
    setAnchorDate(prev => navigateAnchor(prev, periodType, dir))
  }

  const { start, end, label } = getPeriodBounds(anchorDate, periodType, lang)
  const nextDisabled = isNextFuture(navigateAnchor(anchorDate, periodType, 1), periodType)

  // Filter AQSLIM records for selected period
  const filtered = useMemo(
    () => records
      .filter(r => r.date >= start && r.date <= end)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [records, start, end],
  )

  const metrics = useMemo(() => getFinanceMetrics(filtered), [filtered])
  const growth = useMemo(() => getGrowthMetrics(filtered), [filtered])
  const { totalRevenue, supplementRevenue: totalSupp, shippingRevenue: totalShipping, consultationRevenue: consultaRevenue } = metrics

  const byMethod = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>()
    for (const r of filtered) {
      const key = r.metodoPago || ''
      const prev = map.get(key) ?? { total: 0, count: 0 }
      map.set(key, { total: prev.total + r.montoCobrado, count: prev.count + 1 })
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total)
  }, [filtered])

  // Card comparison: AQSLIM card total for the current calendar month (always, not period-filtered)
  const currentMonthStr = getTodayStr().slice(0, 7)
  const aqslimCardTotal = useMemo(
    () => records
      .filter(r => r.date.startsWith(currentMonthStr) && classifyMethod(r.metodoPago) === 'card')
      .reduce((s, r) => s + r.montoCobrado, 0),
    [records, currentMonthStr],
  )
  const diff = squareSummary != null ? aqslimCardTotal - squareSummary.month : null

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 8, marginTop: 8 }}>
        {es ? 'Finanzas' : 'Finances'}
      </h1>
      <p style={{ fontSize: pt.base, color: '#6A6560', marginBottom: 40, marginTop: 0 }}>
        {es
          ? 'Pacientes atendidos e ingresos según los registros de consultas y Square.'
          : 'Patient visits and revenue from consultation records and Square.'}
      </p>

      {airtableError && (
        <div style={{ padding: '14px 18px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)', marginBottom: 24, fontSize: pt.sm, fontFamily: 'monospace', color: '#ff8080' }}>
          Airtable: {airtableError}
        </div>
      )}
      {squareError && (
        <div style={{ padding: '14px 18px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)', marginBottom: 24, fontSize: pt.sm, fontFamily: 'monospace', color: '#ff8080' }}>
          Square: {squareError}
        </div>
      )}

      {/* ── SECTION 1: AQSLIM App — period navigator ── */}
      <div style={{ marginBottom: 48 }}>
        <SectionTitle>{es ? 'Resumen — AQSLIM' : 'Summary — AQSLIM'}</SectionTitle>

        {/* Period tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['day', 'week', 'month', 'year'] as PeriodType[]).map(type => (
            <button
              key={type}
              onClick={() => handlePeriodTypeChange(type)}
              style={{
                padding: '7px 18px', fontSize: pt.sm, fontFamily: pt.sans,
                cursor: 'pointer', letterSpacing: '0.1em',
                border: periodType === type ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.3)',
                background: periodType === type ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                color: periodType === type ? '#C9A84C' : '#9A9590',
                transition: 'all 0.15s',
              }}
            >
              {PERIOD_LABELS[type][lang]}
            </button>
          ))}
        </div>

        {/* Period navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <button onClick={() => navigate(-1)} style={NAV_BTN} aria-label={es ? 'Anterior' : 'Previous'}>
            ←
          </button>
          <span style={{ fontFamily: pt.serif, fontSize: 17, color: '#FAFAF8', minWidth: 240, textAlign: 'center' }}>
            {label}
          </span>
          <button
            onClick={() => navigate(1)}
            disabled={nextDisabled}
            style={{ ...NAV_BTN, opacity: nextDisabled ? 0.3 : 1, cursor: nextDisabled ? 'default' : 'pointer' }}
            aria-label={es ? 'Siguiente' : 'Next'}
          >
            →
          </button>
        </div>

        <SectionSubtitle>
          {filtered.length > 0
            ? `${filtered.length} ${es
                ? (filtered.length === 1 ? 'movimiento registrado' : 'movimientos registrados')
                : (filtered.length === 1 ? 'recorded transaction' : 'recorded transactions')}`
            : (es ? 'Sin movimientos en este período' : 'No transactions in this period')}
        </SectionSubtitle>

        <div className="finance-attendance-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {[
            {
              label: es ? 'Pacientes distintos atendidos' : 'Distinct patients attended',
              value: metrics.uniquePatients,
              note: es ? 'Cada persona se cuenta una sola vez' : 'Each person is counted once',
            },
            {
              label: es ? 'Total de visitas' : 'Total visits',
              value: metrics.visitCount,
              note: es ? 'Una persona puede tener más de una visita' : 'One person may have more than one visit',
            },
          ].map(card => (
            <div key={card.label} style={{ border: '1px solid rgba(201,168,76,0.35)', background: 'rgba(201,168,76,0.04)', padding: '24px 28px' }}>
              <div style={{ fontSize: pt.xs, color: '#9A9590', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: pt.sans, marginBottom: 8 }}>{card.label}</div>
              <div style={{ fontSize: 40, fontFamily: pt.serif, color: '#C9A84C', lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: pt.xs, color: '#6A6560', fontFamily: pt.sans, marginTop: 8 }}>{card.note}</div>
            </div>
          ))}
        </div>

        <div className="finance-visit-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 16 }}>
          {[
            { label: es ? 'Nuevas' : 'New', value: metrics.newVisitCount, note: es ? 'Primera consulta' : 'First consultation' },
            { label: es ? 'Subsecuentes' : 'Returning', value: metrics.subsequentVisitCount, note: es ? 'Seguimientos' : 'Follow-up visits' },
            { label: es ? 'Reinicios' : 'Restarts', value: metrics.restartVisitCount, note: es ? 'Regresaron al programa' : 'Returned to the program' },
          ].map(card => (
            <div key={card.label} style={{ border: '1px solid rgba(201,168,76,0.2)', padding: '18px 22px' }}>
              <div style={{ fontSize: pt.xs, color: '#9A9590', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>{card.label}</div>
              <div style={{ fontSize: 32, fontFamily: pt.serif, color: '#C9A84C', lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: pt.xs, color: '#6A6560', marginTop: 7 }}>{card.note}</div>
            </div>
          ))}
        </div>

        {/* Summary cards: Total | Consultas | Suplementos | Envíos */}
        <div className="finance-revenue-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 16 }}>
          {[
            { label: es ? 'Total del Período' : 'Period Total',  value: totalRevenue,    accent: true  },
            { label: es ? 'Consultas'          : 'Consultations', value: consultaRevenue, accent: false },
            { label: es ? 'Suplementos'        : 'Supplements',   value: totalSupp,       accent: false },
            { label: es ? 'Envíos'              : 'Shipping',      value: totalShipping,   accent: false },
          ].map(({ label: cardLabel, value, accent }) => (
            <div key={cardLabel} style={{
              border: `1px solid rgba(201,168,76,${accent ? '0.35' : '0.22'})`,
              background: accent ? 'rgba(201,168,76,0.04)' : 'transparent',
              padding: '24px 28px',
            }}>
              <div style={{ fontSize: pt.xs, color: '#6A6560', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: pt.sans, marginBottom: 10 }}>
                {cardLabel}
              </div>
              <div style={{ fontSize: accent ? 36 : 28, fontFamily: pt.serif, color: '#C9A84C', lineHeight: 1 }}>
                {formatUSD(value)}
              </div>
            </div>
          ))}
        </div>

        {/* Payment method breakdown */}
        {byMethod.length > 0 && (
          <div style={{ marginBottom: 16, padding: '12px 20px', border: '1px solid rgba(201,168,76,0.1)' }}>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {byMethod.map(([method, { total, count }]) => (
                <div key={method || 'none'} style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans }}>
                  <span style={{ color: '#FAFAF8' }}>
                    {method || (es ? 'Sin especificar' : 'Unspecified')}
                  </span>
                  {' — '}{formatUSD(total)}
                  <span style={{ color: '#6A6560' }}> ({count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 32, marginBottom: 24 }}>
          <SectionTitle>{es ? 'Crecimiento y adquisición' : 'Growth and acquisition'}</SectionTitle>
          <SectionSubtitle>
            {es ? 'Origen de pacientes nuevos y responsable de captación o reactivación' : 'Source of new patients and acquisition or reactivation owner'}
          </SectionSubtitle>
          <div className="finance-growth-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 16 }}>
            {[
              { label: es ? 'Pacientes nuevos' : 'New patients', value: growth.newPatients, note: es ? 'En el período' : 'In the period' },
              { label: es ? 'Referidos' : 'Referrals', value: growth.referred, note: es ? 'Fuente: Referido' : 'Source: Referral' },
              { label: es ? 'Publicidad' : 'Advertising', value: growth.advertising, note: es ? 'Anuncio, Google o redes' : 'Ads, Google or social' },
              {
                label: 'Hillary',
                value: growth.attributionRecorded > 0 ? growth.hillary : '—',
                note: growth.attributionRecorded > 0
                  ? (es
                      ? `Nuevos ${growth.hillaryNewPatients} · Reinicios ${growth.hillaryRestarts}`
                      : `New ${growth.hillaryNewPatients} · Restarts ${growth.hillaryRestarts}`)
                  : (es ? 'Se empezará a registrar desde ahora' : 'Tracking starts now'),
              },
            ].map(card => (
              <div key={card.label} style={{ border: '1px solid rgba(201,168,76,0.24)', background: 'rgba(201,168,76,0.025)', padding: '20px 22px' }}>
                <div style={{ fontSize: pt.xs, color: '#9A9590', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{card.label}</div>
                <div style={{ fontSize: 34, fontFamily: pt.serif, color: '#C9A84C', lineHeight: 1 }}>{card.value}</div>
                <div style={{ fontSize: pt.xs, color: '#6A6560', marginTop: 8 }}>{card.note}</div>
              </div>
            ))}
          </div>
          <div style={{ border: '1px solid rgba(201,168,76,0.15)', padding: '16px 20px', display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            <div style={{ fontSize: pt.sm, color: '#9A9590' }}>
              {es ? 'Mejor canal publicitario' : 'Best advertising channel'}:{' '}
              <span style={{ color: '#FAFAF8' }}>
                {growth.bestAdvertisingChannel
                  ? `${growth.bestAdvertisingChannel.channel} (${growth.bestAdvertisingChannel.count})`
                  : (es ? 'Aún sin datos en este período' : 'No data yet in this period')}
              </span>
            </div>
            {growth.unclassified > 0 && (
              <div style={{ fontSize: pt.sm, color: '#9A9590' }}>
                {es ? 'Nuevos sin origen registrado' : 'New patients without a recorded source'}:{' '}
                <span style={{ color: '#E2C87A' }}>{growth.unclassified}</span>
              </div>
            )}
            {growth.missingOwner > 0 && (
              <div style={{ fontSize: pt.sm, color: '#9A9590' }}>
                {es ? 'Nuevos o reinicios sin responsable' : 'New patients or restarts without an owner'}:{' '}
                <span style={{ color: '#E2C87A' }}>{growth.missingOwner}</span>
              </div>
            )}
          </div>
        </div>

        {/* Consultation detail table */}
        {filtered.length > 0 && (
          <div className="finance-table-scroll">
            {/* Header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '88px minmax(140px,1fr) 148px 80px 80px 70px 90px 108px',
              minWidth: 920,
              gap: 12, padding: '8px 16px 10px',
              borderBottom: '1px solid rgba(201,168,76,0.2)',
            }}>
              {[
                es ? 'Fecha'    : 'Date',
                es ? 'Paciente' : 'Patient',
                es ? 'Tipo'     : 'Type',
                es ? 'Consulta' : 'Consult.',
                es ? 'Suplem.'  : 'Suppl.',
                es ? 'Envío'    : 'Shipping',
                'Total',
                es ? 'Método'   : 'Method',
              ].map(h => (
                <span key={h} style={{
                  fontSize: pt.xs, color: '#6A6560',
                  textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: pt.sans,
                }}>
                  {h}
                </span>
              ))}
            </div>
            {filtered.map((r, i) => (
              <ConsultaRow key={r.id} record={r} lang={lang} zebra={i % 2 === 0} />
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 2: Card comparison (AQSLIM vs Square, current month) ── */}
      <div style={{ marginBottom: 48 }}>
        <SectionTitle>{es ? 'Comparación de Tarjeta' : 'Card Comparison'}</SectionTitle>
        <SectionSubtitle>
          {es
            ? 'Tarjeta registrada en AQSLIM vs procesada por Square este mes'
            : 'Card recorded in AQSLIM vs processed by Square this month'}
        </SectionSubtitle>

        <div style={{ border: '1px solid rgba(201,168,76,0.18)' }}>
          {[
            {
              label: es ? 'Tarjeta — AQSLIM App' : 'Card — AQSLIM App',
              value: aqslimCardTotal,
              note:  es ? 'Del registro de consultas' : 'From consultation records',
            },
            {
              label: es ? 'Tarjeta — Square' : 'Card — Square',
              value: squareSummary?.month ?? null,
              note:  es ? 'Procesado automáticamente' : 'Automatically processed',
            },
          ].map(({ label: rowLabel, value, note }, i) => (
            <div key={rowLabel} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '18px 24px',
              borderBottom: i === 0 ? '1px solid rgba(201,168,76,0.1)' : 'none',
            }}>
              <div>
                <div style={{ fontSize: pt.base, color: '#FAFAF8', fontFamily: pt.sans }}>{rowLabel}</div>
                <div style={{ fontSize: pt.xs, color: '#6A6560', fontFamily: pt.sans, marginTop: 2 }}>{note}</div>
              </div>
              <div style={{ fontSize: 24, fontFamily: pt.serif, color: '#C9A84C' }}>
                {value !== null && value !== undefined ? formatUSD(value) : '—'}
              </div>
            </div>
          ))}

          {/* Difference row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '18px 24px',
            borderTop: '1px solid rgba(201,168,76,0.15)',
            background: 'rgba(201,168,76,0.03)',
          }}>
            <div>
              <div style={{ fontSize: pt.base, color: '#FAFAF8', fontFamily: pt.sans }}>
                {es ? 'Diferencia' : 'Difference'}
              </div>
              <div style={{ fontSize: pt.xs, color: '#6A6560', fontFamily: pt.sans, marginTop: 2 }}>
                {diff === 0
                  ? (es ? 'Sin discrepancias' : 'No discrepancies')
                  : diff !== null
                    ? (es ? 'Revisar registros' : 'Review records')
                    : '—'}
              </div>
            </div>
            <div style={{
              fontSize: 24, fontFamily: pt.serif,
              color: diff === null ? '#6A6560' : diff === 0 ? '#6fbf6f' : '#e88c4a',
            }}>
              {diff !== null ? formatUSD(Math.abs(diff)) : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: Square transactions ── */}
      {squareSummary && (
        <div>
          <SectionTitle>{es ? 'Square — Este Mes' : 'Square — This Month'}</SectionTitle>
          <SectionSubtitle>
            {es ? 'Solo pagos con tarjeta procesados por Square' : 'Card payments processed by Square only'}
          </SectionSubtitle>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>
            {[
              { label: es ? 'Hoy'         : 'Today',      value: squareSummary.today },
              { label: es ? 'Esta semana' : 'This week',  value: squareSummary.week  },
              { label: es ? 'Este mes'    : 'This month', value: squareSummary.month },
            ].map(({ label: cardLabel, value }) => (
              <div key={cardLabel} style={{ border: '1px solid rgba(201,168,76,0.22)', padding: '24px 28px' }}>
                <div style={{ fontSize: pt.xs, color: '#6A6560', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: pt.sans, marginBottom: 10 }}>
                  {cardLabel}
                </div>
                <div style={{ fontSize: 32, fontFamily: pt.serif, color: '#C9A84C', lineHeight: 1 }}>
                  {formatUSD(value)}
                </div>
              </div>
            ))}
          </div>

          {squareSummary.recent.length === 0 ? (
            <div style={{ border: '1px solid rgba(201,168,76,0.15)', padding: '48px 40px', textAlign: 'center' }}>
              <p style={{ fontFamily: pt.serif, fontSize: pt.md, color: '#9A9590', margin: 0 }}>
                {es ? 'Sin transacciones este mes' : 'No transactions this month'}
              </p>
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16,
                padding: '0 20px 12px', borderBottom: '1px solid rgba(201,168,76,0.15)',
              }}>
                {[es ? 'Fecha' : 'Date', es ? 'Método' : 'Method', es ? 'Monto' : 'Amount'].map(h => (
                  <span key={h} style={{
                    fontSize: pt.xs, color: '#6A6560',
                    textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: pt.sans,
                  }}>
                    {h}
                  </span>
                ))}
              </div>
              {squareSummary.recent.map((p, i) => (
                <TransactionRow key={p.id} payment={p} lang={lang} zebra={i % 2 === 0} />
              ))}
              <p style={{ fontSize: pt.xs, color: '#6A6560', marginTop: 16, fontFamily: pt.sans }}>
                {squareSummary.recent.length} {es ? 'transacciones este mes' : 'transactions this month'}
              </p>
            </>
          )}
        </div>
      )}
    </DashboardShell>
  )
}

// ─── AQSLIM consultation row ───────────────────────────────────────────────────

function ConsultaRow({
  record,
  lang,
  zebra,
}: {
  record: FinanceRecord
  lang: 'es' | 'en'
  zebra: boolean
}) {
  const es = lang === 'es'
  const consultaFee = Math.max(0, record.montoCobrado - record.suppTotal - record.shippingTotal)
  const hasSupp = record.suppTotal > 0 || record.suppItems.length > 0

  return (
    <div style={{
      borderBottom: '1px solid rgba(201,168,76,0.07)',
      background: zebra ? 'rgba(255,255,255,0.015)' : 'transparent',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '88px minmax(140px,1fr) 148px 80px 80px 70px 90px 108px',
        minWidth: 920,
        gap: 12, padding: '13px 16px', alignItems: 'center',
      }}>
        <span style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans }}>
          {formatShortDate(record.date, lang)}
        </span>
        <span style={{
          fontSize: pt.sm, color: '#FAFAF8', fontFamily: pt.sans,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {record.paciente || '—'}
        </span>
        <span style={{
          fontSize: pt.xs, color: '#9A9590', fontFamily: pt.sans,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {record.tipoConsulta || '—'}
        </span>
        <span style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans, textAlign: 'right' }}>
          {hasSupp ? formatUSD(consultaFee) : formatUSD(record.montoCobrado)}
        </span>
        <span style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans, textAlign: 'right' }}>
          {hasSupp ? formatUSD(record.suppTotal) : '—'}
        </span>
        <span style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans, textAlign: 'right' }}>
          {record.shippingTotal > 0 ? formatUSD(record.shippingTotal) : '—'}
        </span>
        <span style={{ fontSize: pt.base, color: '#C9A84C', fontFamily: pt.serif, textAlign: 'right' }}>
          {formatUSD(record.montoCobrado)}
        </span>
        <span style={{
          fontSize: pt.xs, color: '#9A9590', fontFamily: pt.sans,
          border: '1px solid rgba(201,168,76,0.18)', padding: '3px 8px',
          display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {record.metodoPago || (es ? 'Sin espec.' : 'Unspecified')}
        </span>
      </div>

      {/* Supplement items */}
      {record.suppItems.length > 0 && (
        <div style={{ padding: '0 16px 10px 384px', display: 'flex', flexWrap: 'wrap', gap: 6, minWidth: 920 }}>
          {record.suppItems.map((item, i) => (
            <span key={i} style={{
              fontSize: pt.xs, color: '#9A9590', fontFamily: pt.sans,
              background: 'rgba(201,168,76,0.05)',
              border: '1px solid rgba(201,168,76,0.1)',
              padding: '2px 8px',
            }}>
              {item.nombre}
              <span style={{ color: '#C9A84C', marginLeft: 4 }}>{formatUSD(item.precio)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Square transaction row ────────────────────────────────────────────────────

function TransactionRow({
  payment,
  lang,
  zebra,
}: {
  payment: SquarePayment
  lang: 'es' | 'en'
  zebra: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16,
        padding: '14px 20px',
        background: hovered
          ? 'rgba(201,168,76,0.06)'
          : zebra ? 'rgba(255,255,255,0.02)' : 'transparent',
        borderBottom: '1px solid rgba(201,168,76,0.08)',
        transition: 'background 0.15s', alignItems: 'center',
      }}
    >
      <span style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans }}>
        {formatDate(payment.created_at, lang)}
      </span>
      <span style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans }}>
        {formatMethod(payment, lang)}
      </span>
      <span style={{ fontSize: pt.base, color: '#C9A84C', fontFamily: pt.serif, textAlign: 'right' }}>
        {formatUSD((payment.total_money?.amount ?? 0) / 100)}
      </span>
    </div>
  )
}
