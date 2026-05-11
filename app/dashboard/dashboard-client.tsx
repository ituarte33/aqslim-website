'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DashboardShell } from './dashboard-shell'
import type { getClientes, getClientesConCita } from '@/lib/airtable'
import { pt } from '@/lib/portal-type'

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
  patients: Awaited<ReturnType<typeof getClientes>>
  upcomingCitas: Awaited<ReturnType<typeof getClientesConCita>>
  monthlyRevenue: number | null
  airtableError: string | null
}

const copy = {
  es: {
    title: 'Panel de Control',
    nuevaConsulta: 'Nueva Consulta',
    consultaSubsecuente: 'Consulta Subsecuente',
    appointments: {
      label: 'Citas',
      statUnit: 'próximas citas',
      desc: 'Gestiona y programa citas con tus pacientes.',
      link: 'Ver citas →',
      none: 'Sin citas próximas',
      pendingDate: 'Fecha pendiente',
    },
    finances: {
      label: 'Finanzas',
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
      statUnit: 'upcoming',
      desc: 'Manage and schedule patient appointments.',
      link: 'View appointments →',
      none: 'No upcoming appointments',
      pendingDate: 'Date pending',
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

function formatCitaDate(iso: string | undefined, lang: 'es' | 'en'): string {
  if (!iso) return lang === 'es' ? 'Fecha pendiente' : 'Date pending'
  try {
    return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

export function DashboardClient({ user, patients, upcomingCitas, monthlyRevenue, airtableError }: Props) {
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
        {/* Appointments card — live data */}
        <SummaryCard
          href="/dashboard/appointments"
          title={t.appointments.label}
          stat={String(upcomingCitas.length)}
          statUnit={t.appointments.statUnit}
          description={t.appointments.desc}
          linkLabel={t.appointments.link}
          preview={
            upcomingCitas.length === 0 ? (
              <p style={{ fontSize: pt.sm, color: '#6A6560', margin: 0 }}>
                {t.appointments.none}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcomingCitas.slice(0, 3).map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: pt.sm, color: '#FAFAF8', fontFamily: pt.sans }}>
                      {c.fields['Nombre Completo'] ?? c.fields['Email']}
                    </span>
                    <span style={{ fontSize: pt.xs, color: '#9A9590', fontFamily: pt.sans, flexShrink: 0 }}>
                      {c.fields['Servicio Próxima Cita']
                        ? `${c.fields['Servicio Próxima Cita']} · `
                        : ''}
                      {formatCitaDate(c.fields['Próxima Cita'], lang)}
                    </span>
                  </div>
                ))}
              </div>
            )
          }
        />

        <SummaryCard
          href="/dashboard/finances"
          title={t.finances.label}
          stat={monthlyRevenue !== null ? formatUSD(monthlyRevenue) : '—'}
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

function SummaryCard({ href, title, stat, statUnit, description, linkLabel, muted = false, preview }: {
  href: string
  title: string
  stat: string
  statUnit: string
  description: string
  linkLabel: string
  muted?: boolean
  preview?: React.ReactNode
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
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
        <div style={{ flex: 1 }}>
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
            color: muted ? '#6A6560' : '#C9A84C',
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

      {preview && (
        <div style={{
          borderTop: '1px solid rgba(201,168,76,0.1)',
          marginTop: 20,
          paddingTop: 16,
        }}>
          {preview}
        </div>
      )}
    </div>
  )
}
