'use client'

import { useState } from 'react'
import { DashboardShell } from '../dashboard-shell'
import { pt } from '@/lib/portal-type'

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
}

export function FinancesClient({ user }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 12, marginTop: 8 }}>
        {lang === 'es' ? 'Finanzas' : 'Finances'}
      </h1>
      <p style={{ fontSize: pt.base, color: '#6A6560', marginBottom: 56, marginTop: 0 }}>
        {lang === 'es'
          ? 'Revisa pagos, facturas y reportes financieros.'
          : 'Review payments, invoices, and financial reports.'}
      </p>

      <div style={{
        border: '1px solid rgba(201,168,76,0.15)',
        padding: '96px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, color: 'rgba(201,168,76,0.25)', lineHeight: 1, marginBottom: 8 }}>
          ◈
        </div>
        <p style={{ fontFamily: pt.serif, fontSize: pt.md, color: '#9A9590', margin: 0 }}>
          {lang === 'es' ? 'Próximamente' : 'Coming Soon'}
        </p>
        <p style={{ fontSize: pt.base, color: '#6A6560', margin: 0, maxWidth: 400 }}>
          {lang === 'es'
            ? 'Los reportes financieros estarán disponibles en una próxima actualización.'
            : 'Financial reports will be available in an upcoming update.'}
        </p>
      </div>
    </DashboardShell>
  )
}
