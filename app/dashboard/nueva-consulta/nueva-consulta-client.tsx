'use client'

import { useState } from 'react'
import { DashboardShell } from '../dashboard-shell'
import { pt } from '@/lib/portal-type'

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
}

export function NuevaConsultaClient({ user }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 12, marginTop: 8 }}>
        {lang === 'es' ? 'Nueva Consulta' : 'New Consultation'}
      </h1>
      <p style={{ fontSize: pt.base, color: '#6A6560', marginBottom: 40, marginTop: 0 }}>
        {lang === 'es'
          ? 'Registra la primera consulta de un paciente.'
          : 'Record a patient\'s first consultation.'}
      </p>

      <iframe className="airtable-embed" src="https://airtable.com/embed/appuUHRs26ATXnZjf/pagfgQJ99hvjMtW1J/form" frameBorder={0} width="100%" height="1500" style={{ background: 'transparent', border: '1px solid #ccc' }} />
    </DashboardShell>
  )
}
