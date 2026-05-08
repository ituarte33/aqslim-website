'use client'

import { useState } from 'react'
import { DashboardShell } from '../dashboard-shell'
import { pt } from '@/lib/portal-type'

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
}

export function AppointmentsClient({ user }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 12, marginTop: 8 }}>
        {lang === 'es' ? 'Citas' : 'Appointments'}
      </h1>
      <p style={{ fontSize: pt.base, color: '#6A6560', marginBottom: 56, marginTop: 0 }}>
        {lang === 'es'
          ? 'Gestiona y programa citas con tus pacientes.'
          : 'Manage and schedule patient appointments.'}
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
          ◷
        </div>
        <p style={{ fontFamily: pt.serif, fontSize: pt.md, color: '#9A9590', margin: 0 }}>
          {lang === 'es' ? 'Próximamente' : 'Coming Soon'}
        </p>
        <p style={{ fontSize: pt.base, color: '#6A6560', margin: 0, maxWidth: 400 }}>
          {lang === 'es'
            ? 'La gestión de citas estará disponible en una próxima actualización.'
            : 'Appointment scheduling will be available in an upcoming update.'}
        </p>
      </div>
    </DashboardShell>
  )
}
