'use client'

import { useState } from 'react'
import { UserButton } from '@clerk/nextjs'
import { PatientsTable } from './patients-table'
import type { getClientes } from '@/lib/airtable'

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
  patients: Awaited<ReturnType<typeof getClientes>>
  airtableError: string | null
}

const labels = {
  es: { patients: 'Pacientes', records: 'registros' },
  en: { patients: 'Patients',  records: 'records'    },
}

const toggleBtn = (active: boolean) => ({
  background: 'none' as const,
  border: 'none' as const,
  cursor: 'pointer' as const,
  fontSize: 11,
  letterSpacing: '0.12em',
  padding: '4px 8px',
  color: active ? '#C9A84C' : '#9A9590',
  borderBottom: active ? '1px solid #C9A84C' : '1px solid transparent',
  fontFamily: 'Montserrat, sans-serif',
  textTransform: 'uppercase' as const,
  transition: 'color 0.2s',
})

export function DashboardClient({ user, patients, airtableError }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const t = labels[lang]

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#FAFAF8' }}>

      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: '1px solid rgba(201,168,76,0.2)',
        position: 'sticky', top: 0, background: 'rgba(10,10,10,0.92)',
      }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, letterSpacing: '0.08em' }}>
          AQ<span style={{ color: '#C9A84C' }}>SLIM</span>
          <span style={{ fontSize: 11, color: '#9A9590', marginLeft: 12, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif' }}>
            Portal
          </span>
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <button style={toggleBtn(lang === 'es')} onClick={() => setLang('es')}>ES</button>
            <span style={{ color: 'rgba(154,149,144,0.4)', fontSize: 11 }}>|</span>
            <button style={toggleBtn(lang === 'en')} onClick={() => setLang('en')}>EN</button>
          </div>

          <span style={{ fontSize: 13, color: '#9A9590' }}>
            {user?.firstName} {user?.lastName}
          </span>
          <UserButton />
        </div>
      </header>

      <main style={{ padding: '48px 40px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32, marginTop: 64 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 400 }}>
            {t.patients}
          </h1>
          <span style={{ fontSize: 13, color: '#9A9590' }}>
            {patients.length} {t.records}
          </span>
        </div>

        {airtableError && (
          <div style={{ padding: '16px 20px', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', marginBottom: 24, fontSize: 13, fontFamily: 'monospace' }}>
            {airtableError}
          </div>
        )}

        <PatientsTable patients={patients} />
      </main>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400&family=Montserrat:wght@300;400;500&display=swap" />
    </div>
  )
}
