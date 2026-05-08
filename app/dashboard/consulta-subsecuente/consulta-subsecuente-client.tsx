'use client'

import { useState } from 'react'
import { DashboardShell } from '../dashboard-shell'
import { pt } from '@/lib/portal-type'

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
}

export function ConsultaSubsecuenteClient({ user }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 12, marginTop: 8 }}>
        {lang === 'es' ? 'Consulta Subsecuente' : 'Follow-up Consultation'}
      </h1>
      <p style={{ fontSize: pt.base, color: '#6A6560', marginBottom: 40, marginTop: 0 }}>
        {lang === 'es'
          ? 'Registra el seguimiento de un paciente existente.'
          : 'Record a follow-up for an existing patient.'}
      </p>

      <iframe className="airtable-embed" src="https://airtable.com/embed/appuUHRs26ATXnZjf/pagdtNubJwEQV5QpJ/form" frameBorder={0} width="100%" height="1500" style={{ background: 'transparent', border: '1px solid #ccc' }} />
    </DashboardShell>
  )
}
