'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DashboardShell } from './dashboard-shell'
import type { getClientes } from '@/lib/airtable'
import { pt } from '@/lib/portal-type'

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
  patients: Awaited<ReturnType<typeof getClientes>>
  airtableError: string | null
}

const copy = {
  es: {
    title: 'Panel de Control',
    nuevaConsulta: 'Nueva Consulta',
    consultaSubsecuente: 'Consulta Subsecuente',
    appointments: {
      label: 'Citas',
      stat: '—',
      statUnit: 'citas hoy',
      desc: 'Gestiona y programa citas con tus pacientes.',
      link: 'Ver citas →',
    },
    finances: {
      label: 'Finanzas',
      stat: '—',
      statUnit: 'ingresos este mes',
      desc: 'Revisa pagos, facturas y reportes financieros.',
      link: 'Ver finanzas →',
    },
    patients: {
      label: 'Pacientes',
      statUnit: 'registros',
      desc: 'Consulta y gestiona el expediente de tus pacientes.',
      link: 'Ver pacientes →',
    },
  },
  en: {
    title: 'Dashboard',
    nuevaConsulta: 'New Consultation',
    consultaSubsecuente: 'Follow-up Consultation',
    appointments: {
      label: 'Appointments',
      stat: '—',
      statUnit: 'appointments today',
      desc: 'Manage and schedule patient appointments.',
      link: 'View appointments →',
    },
    finances: {
      label: 'Finances',
      stat: '—',
      statUnit: 'revenue this month',
      desc: 'Review payments, invoices, and financial reports.',
      link: 'View finances →',
    },
    patients: {
      label: 'Patients',
      statUnit: 'records',
      desc: 'View and manage your patient records.',
      link: 'View patients →',
    },
  },
}

export function DashboardClient({ user, patients, airtableError }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const t = copy[lang]

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 32, marginTop: 8 }}>
        {t.title}
      </h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 48 }}>
        <Link href="/dashboard/nueva-consulta" style={{
          background: '#C9A84C', color: '#0A0A0A', border: 'none',
          padding: '12px 24px', fontSize: pt.sm, letterSpacing: '0.14em',
          textTransform: 'uppercase', fontFamily: pt.sans, fontWeight: 500,
          textDecoration: 'none', display: 'inline-block',
        }}>
          + {t.nuevaConsulta}
        </Link>
        <Link href="/dashboard/consulta-subsecuente" style={{
          background: 'none', color: '#C9A84C',
          border: '1px solid rgba(201,168,76,0.5)',
          padding: '12px 24px', fontSize: pt.sm, letterSpacing: '0.14em',
          textTransform: 'uppercase', fontFamily: pt.sans, fontWeight: 500,
          textDecoration: 'none', display: 'inline-block',
        }}>
          + {t.consultaSubsecuente}
        </Link>
      </div>

      {airtableError && (
        <div style={{ padding: '16px 20px', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', marginBottom: 32, fontSize: pt.base, fontFamily: 'monospace' }}>
          {airtableError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SummaryCard
          href="/dashboard/appointments"
          title={t.appointments.label}
          stat={t.appointments.stat}
          statUnit={t.appointments.statUnit}
          description={t.appointments.desc}
          linkLabel={t.appointments.link}
        />
        <SummaryCard
          href="/dashboard/finances"
          title={t.finances.label}
          stat={t.finances.stat}
          statUnit={t.finances.statUnit}
          description={t.finances.desc}
          linkLabel={t.finances.link}
        />
        <SummaryCard
          href="/dashboard/patients"
          title={t.patients.label}
          stat={String(patients.length)}
          statUnit={t.patients.statUnit}
          description={t.patients.desc}
          linkLabel={t.patients.link}
          muted
        />
      </div>
    </DashboardShell>
  )
}

function SummaryCard({ href, title, stat, statUnit, description, linkLabel, muted = false }: {
  href: string
  title: string
  stat: string
  statUnit: string
  description: string
  linkLabel: string
  muted?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `1px solid rgba(201,168,76,${hovered ? '0.35' : '0.22'})`,
        padding: '28px 32px',
        background: hovered ? 'rgba(201,168,76,0.04)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      <div>
        <h2 style={{
          fontFamily: pt.serif,
          fontSize: 28,
          fontWeight: 400,
          marginBottom: 8,
          marginTop: 0,
          color: '#FAFAF8',
        }}>
          {title}
        </h2>
        <p style={{ fontSize: pt.base, color: '#6A6560', margin: 0 }}>
          {description}
        </p>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontSize: 38,
          fontFamily: pt.serif,
          color: '#C9A84C',
          lineHeight: 1,
          marginBottom: 4,
        }}>
          {stat}
        </div>
        <div style={{
          fontSize: pt.xs,
          color: '#6A6560',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 16,
          fontFamily: pt.sans,
        }}>
          {statUnit}
        </div>
        <Link href={href} style={{
          fontSize: pt.sm,
          color: '#C9A84C',
          textDecoration: 'none',
          letterSpacing: '0.1em',
          fontFamily: pt.sans,
          textTransform: 'uppercase',
        }}>
          {linkLabel}
        </Link>
      </div>
    </div>
  )
}
