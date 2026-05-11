'use client'

import { useState } from 'react'
import { DashboardShell } from '../dashboard-shell'
import { pt } from '@/lib/portal-type'
import type { getFinancesSummary } from '@/lib/square'
import type { SquarePayment, } from '@/lib/square'
import type { ConsultasRevenueSummary } from '@/lib/airtable'

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
  squareSummary: Awaited<ReturnType<typeof getFinancesSummary>> | null
  consultasSummary: ConsultasRevenueSummary | null
  squareError: string | null
  airtableError: string | null
}

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
    CASH:         { es: 'Efectivo',      en: 'Cash' },
    EXTERNAL:     { es: 'Externo',       en: 'External' },
    WALLET:       { es: 'Billetera',     en: 'Wallet' },
    BANK_ACCOUNT: { es: 'Transferencia', en: 'Bank Transfer' },
  }
  return labels[p.source_type]?.[lang] ?? p.source_type
}

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

export function FinancesClient({ user, squareSummary, consultasSummary, squareError, airtableError }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const es = lang === 'es'

  const diff = consultasSummary && squareSummary
    ? consultasSummary.card - squareSummary.month
    : null

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 8, marginTop: 8 }}>
        {es ? 'Finanzas' : 'Finances'}
      </h1>
      <p style={{ fontSize: pt.base, color: '#6A6560', marginBottom: 40, marginTop: 0 }}>
        {es
          ? 'Ingresos del mes según los registros de consultas y Square.'
          : 'Monthly revenue from consultation records and Square.'}
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

      {/* ── SECTION 1: AQSLIM App totals (from Consultas) ── */}
      <div style={{ marginBottom: 48 }}>
        <SectionTitle>{es ? 'Resumen del mes — AQSLIM' : 'Monthly Summary — AQSLIM'}</SectionTitle>
        <SectionSubtitle>
          {consultasSummary
            ? `${es ? 'Basado en' : 'Based on'} ${consultasSummary.consultaCount} ${es ? 'consultas registradas' : 'recorded consultations'}`
            : es ? 'Cargando...' : 'Loading...'}
        </SectionSubtitle>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {[
            { label: es ? 'Efectivo' : 'Cash',    value: consultasSummary?.cash  ?? null, note: es ? 'Solo en AQSLIM' : 'AQSLIM only' },
            { label: es ? 'Tarjeta'  : 'Card',    value: consultasSummary?.card  ?? null, note: es ? 'Ver comparación ↓' : 'See comparison ↓' },
            { label: es ? 'Total'    : 'Total',   value: consultasSummary?.total ?? null, note: es ? 'Efectivo + Tarjeta' : 'Cash + Card' },
          ].map(({ label, value, note }) => (
            <div key={label} style={{ border: '1px solid rgba(201,168,76,0.22)', padding: '24px 28px' }}>
              <div style={{ fontSize: pt.xs, color: '#6A6560', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: pt.sans, marginBottom: 10 }}>
                {label}
              </div>
              <div style={{ fontSize: 32, fontFamily: pt.serif, color: '#C9A84C', lineHeight: 1, marginBottom: 6 }}>
                {value !== null ? formatUSD(value) : '—'}
              </div>
              <div style={{ fontSize: pt.xs, color: '#6A6560', fontFamily: pt.sans }}>{note}</div>
            </div>
          ))}
        </div>

        {/* Per-method breakdown if there are unexpected methods */}
        {consultasSummary && consultasSummary.byMethod.length > 0 && (
          <div style={{ marginTop: 12, padding: '12px 20px', border: '1px solid rgba(201,168,76,0.1)' }}>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {consultasSummary.byMethod.map(({ method, total, count }) => (
                <div key={method} style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans }}>
                  <span style={{ color: '#FAFAF8' }}>{method}</span>
                  {' — '}{formatUSD(total)}
                  <span style={{ color: '#6A6560' }}> ({count})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 2: Card comparison (AQSLIM vs Square) ── */}
      {(consultasSummary || squareSummary) && (
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
                value: consultasSummary?.card ?? null,
                note: es ? 'Del registro de consultas' : 'From consultation records',
              },
              {
                label: es ? 'Tarjeta — Square' : 'Card — Square',
                value: squareSummary?.month ?? null,
                note: es ? 'Procesado automáticamente' : 'Automatically processed',
              },
            ].map(({ label, value, note }, i) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '18px 24px',
                borderBottom: i === 0 ? '1px solid rgba(201,168,76,0.1)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: pt.base, color: '#FAFAF8', fontFamily: pt.sans }}>{label}</div>
                  <div style={{ fontSize: pt.xs, color: '#6A6560', fontFamily: pt.sans, marginTop: 2 }}>{note}</div>
                </div>
                <div style={{ fontSize: 24, fontFamily: pt.serif, color: '#C9A84C' }}>
                  {value !== null ? formatUSD(value) : '—'}
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
      )}

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
            ].map(({ label, value }) => (
              <div key={label} style={{ border: '1px solid rgba(201,168,76,0.22)', padding: '24px 28px' }}>
                <div style={{ fontSize: pt.xs, color: '#6A6560', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: pt.sans, marginBottom: 10 }}>
                  {label}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, padding: '0 20px 12px', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
                {[es ? 'Fecha' : 'Date', es ? 'Método' : 'Method', es ? 'Monto' : 'Amount'].map(h => (
                  <span key={h} style={{ fontSize: pt.xs, color: '#6A6560', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: pt.sans }}>
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

function TransactionRow({ payment, lang, zebra }: { payment: SquarePayment; lang: 'es' | 'en'; zebra: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16,
        padding: '14px 20px',
        background: hovered ? 'rgba(201,168,76,0.06)' : zebra ? 'rgba(255,255,255,0.02)' : 'transparent',
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
