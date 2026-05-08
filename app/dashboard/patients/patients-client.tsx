'use client'

import { useState } from 'react'
import { DashboardShell } from '../dashboard-shell'
import { PatientsTable } from '../patients-table'
import type { getClientes } from '@/lib/airtable'
import { pt } from '@/lib/portal-type'

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
  patients: Awaited<ReturnType<typeof getClientes>>
  airtableError: string | null
}

export function PatientsPageClient({ user, patients, airtableError }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32, marginTop: 8 }}>
        <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400 }}>
          {lang === 'es' ? 'Pacientes' : 'Patients'}
        </h1>
        <span style={{ fontSize: pt.base, color: '#9A9590' }}>
          {patients.length} {lang === 'es' ? 'registros' : 'records'}
        </span>
      </div>

      {airtableError && (
        <div style={{ padding: '16px 20px', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', marginBottom: 24, fontSize: pt.base, fontFamily: 'monospace' }}>
          {airtableError}
        </div>
      )}

      <PatientsTable patients={patients} />
    </DashboardShell>
  )
}
