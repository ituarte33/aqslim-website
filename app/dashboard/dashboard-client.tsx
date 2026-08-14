'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DashboardShell } from './dashboard-shell'
import type { getClientes } from '@/lib/airtable'
import type { SquareBooking } from '@/lib/square'
import { formatAppointmentDate } from '@/lib/appointment-metrics'
import { pt } from '@/lib/portal-type'
import { BookingWidget } from '@/app/onboarding/booking-widget'
import { ADMIN_SERVICES } from '@/app/onboarding/booking-constants'

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
  patients: Awaited<ReturnType<typeof getClientes>>
  upcomingBookings: SquareBooking[]
  monthlyRevenue: number | null
  todaysBookingCount: number | null
  consultasCash: number | null
  consultasCard: number | null
  airtableError: string | null
}

const copy = {
  es: {
    title: 'Panel de Control',
    nuevaConsulta: 'Registra Paciente Nuevo',
    consultaSubsecuente: 'Consulta Subsecuente',
    appointments: {
      label: 'Citas',
      statUnit: 'citas hoy',
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
    nuevaConsulta: 'Register New Patient',
    consultaSubsecuente: 'Follow-up Consultation',
    appointments: {
      label: 'Appointments',
      statUnit: 'appointments today',
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

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

export function DashboardClient({ user, patients, upcomingBookings, monthlyRevenue, todaysBookingCount, consultasCash, consultasCard, airtableError }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const t = copy[lang]
  const es = lang === 'es'
  const [showBooking, setShowBooking] = useState(false)

  const hasFinancesData = monthlyRevenue !== null || consultasCash !== null
  const combinedTotal   = (monthlyRevenue ?? 0) + (consultasCash ?? 0)
  const cardDiff        = monthlyRevenue !== null && consultasCard !== null
    ? consultasCard - monthlyRevenue
    : null

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 32, marginTop: 8 }}>
        {t.title}
      </h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: showBooking ? 24 : 48, flexWrap: 'wrap' }}>
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
        <button
          onClick={() => setShowBooking(v => !v)}
          style={{
            background: showBooking ? 'rgba(201,168,76,0.12)' : 'none',
            color: '#C9A84C',
            border: '1px solid rgba(201,168,76,0.5)',
            padding: '12px 24px', fontSize: pt.sm, letterSpacing: '0.14em',
            textTransform: 'uppercase', fontFamily: pt.sans, fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {showBooking ? (es ? '✕ Cerrar' : '✕ Close') : (es ? '+ Agendar Cita' : '+ New Appointment')}
        </button>
      </div>

      {showBooking && (
        <div style={{ border: '1px solid rgba(201,168,76,0.2)', padding: '24px 28px', marginBottom: 48 }}>
          <BookingWidget
            allowedServices={ADMIN_SERVICES}
            isAdmin
            lang={lang}
            onBooked={() => setShowBooking(false)}
          />
        </div>
      )}

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
          stat={todaysBookingCount !== null ? String(todaysBookingCount) : '—'}
          statUnit={t.appointments.statUnit}
          description={t.appointments.desc}
          linkLabel={t.appointments.link}
          preview={
            upcomingBookings.length === 0 ? (
              <p style={{ fontSize: pt.sm, color: '#6A6560', margin: 0 }}>
                {t.appointments.none}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcomingBookings.slice(0, 3).map(booking => (
                  <div key={booking.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: pt.sm, color: '#FAFAF8', fontFamily: pt.sans }}>
                      {booking.customer_name ?? booking.customer_email ?? booking.customer_phone ?? (es ? 'Sin nombre' : 'No name')}
                    </span>
                    <span style={{ fontSize: pt.xs, color: '#9A9590', fontFamily: pt.sans, flexShrink: 0 }}>
                      {booking.service_name
                        ? `${booking.service_name} · `
                        : ''}
                      {formatAppointmentDate(booking.start_at, lang)}
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
          stat={hasFinancesData ? formatUSD(combinedTotal) : '—'}
          statUnit={t.finances.statUnit}
          description={t.finances.desc}
          linkLabel={t.finances.link}
          preview={cardDiff !== null ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: pt.xs, color: '#6A6560', fontFamily: pt.sans, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {es ? 'Dif. tarjeta AQSLIM vs Square' : 'Card diff AQSLIM vs Square'}
              </span>
              <span style={{ fontSize: pt.sm, fontFamily: pt.serif, color: cardDiff === 0 ? '#6fbf6f' : '#e88c4a' }}>
                {cardDiff === 0
                  ? (es ? 'Sin diferencia' : 'No difference')
                  : formatUSD(Math.abs(cardDiff))}
              </span>
            </div>
          ) : undefined}
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
