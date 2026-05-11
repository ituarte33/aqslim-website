'use client'

import { useState } from 'react'
import { DashboardShell } from '../dashboard-shell'
import { pt } from '@/lib/portal-type'
import type { getFinancesSummary } from '@/lib/square'
import type { SquarePayment } from '@/lib/square'

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
  summary: Awaited<ReturnType<typeof getFinancesSummary>> | null
  squareError: string | null
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
  } catch {
    return iso
  }
}

function formatMethod(p: SquarePayment, lang: 'es' | 'en'): string {
  if (p.source_type === 'CARD' && p.card_details?.card) {
    const { card_brand, last_4 } = p.card_details.card
    const brand = card_brand ?? 'Card'
    return last_4 ? `${brand} ···${last_4}` : brand
  }
  const labels: Record<string, { es: string; en: string }> = {
    CASH:         { es: 'Efectivo',      en: 'Cash' },
    EXTERNAL:     { es: 'Externo',       en: 'External' },
    WALLET:       { es: 'Billetera',     en: 'Wallet' },
    BANK_ACCOUNT: { es: 'Transferencia', en: 'Bank Transfer' },
  }
  return labels[p.source_type]?.[lang] ?? p.source_type
}

export function FinancesClient({ user, summary, squareError }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const es = lang === 'es'

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 8, marginTop: 8 }}>
        {es ? 'Finanzas' : 'Finances'}
      </h1>
      <p style={{ fontSize: pt.base, color: '#6A6560', marginBottom: 40, marginTop: 0 }}>
        {es ? 'Ingresos y transacciones procesadas a través de Square.' : 'Revenue and transactions processed through Square.'}
      </p>

      {squareError && (
        <div style={{ padding: '16px 20px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)', marginBottom: 32, fontSize: pt.sm, fontFamily: 'monospace', color: '#ff8080' }}>
          {squareError}
        </div>
      )}

      {summary && (
        <>
          {/* Summary metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 40 }}>
            {[
              { label: es ? 'Hoy'          : 'Today',      value: summary.today },
              { label: es ? 'Esta semana'  : 'This week',  value: summary.week  },
              { label: es ? 'Este mes'     : 'This month', value: summary.month },
            ].map(({ label, value }) => (
              <div key={label} style={{
                border: '1px solid rgba(201,168,76,0.22)',
                padding: '24px 28px',
              }}>
                <div style={{ fontSize: pt.xs, color: '#6A6560', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: pt.sans, marginBottom: 10 }}>
                  {label}
                </div>
                <div style={{ fontSize: 32, fontFamily: pt.serif, color: '#C9A84C', lineHeight: 1 }}>
                  {formatUSD(value)}
                </div>
              </div>
            ))}
          </div>

          {/* Recent transactions */}
          <h2 style={{ fontFamily: pt.serif, fontSize: 22, fontWeight: 400, marginBottom: 16, color: '#FAFAF8' }}>
            {es ? 'Transacciones recientes' : 'Recent transactions'}
          </h2>

          {summary.recent.length === 0 ? (
            <div style={{ border: '1px solid rgba(201,168,76,0.15)', padding: '60px 40px', textAlign: 'center' }}>
              <p style={{ fontFamily: pt.serif, fontSize: pt.md, color: '#9A9590', margin: 0 }}>
                {es ? 'Sin transacciones este mes' : 'No transactions this month'}
              </p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 16,
                padding: '0 20px 12px',
                borderBottom: '1px solid rgba(201,168,76,0.15)',
              }}>
                {[es ? 'Fecha' : 'Date', es ? 'Método' : 'Method', es ? 'Monto' : 'Amount'].map(h => (
                  <span key={h} style={{ fontSize: pt.xs, color: '#6A6560', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: pt.sans }}>
                    {h}
                  </span>
                ))}
              </div>

              {summary.recent.map((p, i) => (
                <TransactionRow key={p.id} payment={p} lang={lang} zebra={i % 2 === 0} />
              ))}

              <p style={{ fontSize: pt.xs, color: '#6A6560', marginTop: 16, fontFamily: pt.sans }}>
                {summary.recent.length} {es ? 'transacciones este mes' : 'transactions this month'}
              </p>
            </>
          )}
        </>
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
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: 16,
        padding: '14px 20px',
        background: hovered ? 'rgba(201,168,76,0.06)' : zebra ? 'rgba(255,255,255,0.02)' : 'transparent',
        borderBottom: '1px solid rgba(201,168,76,0.08)',
        transition: 'background 0.15s',
        alignItems: 'center',
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
