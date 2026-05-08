'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DashboardShell } from '../dashboard-shell'
import { pt } from '@/lib/portal-type'
import type { getClientesConCita } from '@/lib/airtable'

const SQUARE_MANAGE_URL = 'https://squareup.com/appointments/manage'

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
  upcomingCitas: Awaited<ReturnType<typeof getClientesConCita>>
}

function formatDate(iso: string | undefined, lang: 'es' | 'en'): string {
  if (!iso) return lang === 'es' ? 'Fecha pendiente' : 'Date pending'
  try {
    return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function AppointmentsClient({ user, upcomingCitas }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const es = lang === 'es'

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 12, marginTop: 8 }}>
        <div>
          <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 8, marginTop: 0 }}>
            {es ? 'Citas' : 'Appointments'}
          </h1>
          <p style={{ fontSize: pt.base, color: '#6A6560', margin: 0 }}>
            {es
              ? 'Clientes con cita agendada a través de Square.'
              : 'Clients with an appointment booked via Square.'}
          </p>
        </div>

        <a
          href={SQUARE_MANAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flexShrink: 0,
            background: 'none',
            color: '#C9A84C',
            border: '1px solid rgba(201,168,76,0.5)',
            padding: '10px 20px',
            fontSize: pt.sm,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontFamily: pt.sans,
            fontWeight: 500,
            textDecoration: 'none',
            display: 'inline-block',
            marginTop: 4,
          }}
        >
          {es ? 'Abrir Square →' : 'Open Square →'}
        </a>
      </div>

      <div style={{ marginTop: 40 }}>
        {upcomingCitas.length === 0 ? (
          <div style={{
            border: '1px solid rgba(201,168,76,0.15)',
            padding: '80px 40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, color: 'rgba(201,168,76,0.2)', lineHeight: 1 }}>◷</div>
            <p style={{ fontFamily: pt.serif, fontSize: pt.md, color: '#9A9590', margin: 0 }}>
              {es ? 'Sin citas próximas' : 'No upcoming appointments'}
            </p>
            <p style={{ fontSize: pt.base, color: '#6A6560', margin: 0, maxWidth: 360 }}>
              {es
                ? 'Las citas agendadas a través de Square aparecerán aquí automáticamente.'
                : 'Appointments booked via Square will appear here automatically.'}
            </p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr auto',
              gap: 16,
              padding: '0 20px 12px',
              borderBottom: '1px solid rgba(201,168,76,0.15)',
            }}>
              {[
                es ? 'Paciente' : 'Patient',
                es ? 'Fecha y Hora' : 'Date & Time',
                es ? 'Servicio' : 'Service',
                es ? 'Email' : 'Email',
              ].map(h => (
                <span key={h} style={{ fontSize: pt.xs, color: '#6A6560', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: pt.sans }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {upcomingCitas.map((c, i) => (
              <AppointmentRow
                key={c.id}
                href={`/dashboard/${c.id}`}
                nombre={c.fields['Nombre Completo'] ?? '—'}
                email={c.fields['Email'] ?? '—'}
                fecha={c.fields['Próxima Cita']}
                servicio={c.fields['Servicio Próxima Cita']}
                lang={lang}
                zebra={i % 2 === 0}
              />
            ))}

            <p style={{ fontSize: pt.xs, color: '#6A6560', marginTop: 20, fontFamily: pt.sans }}>
              {upcomingCitas.length} {es ? 'cita(s) próxima(s)' : 'upcoming appointment(s)'}
            </p>
          </>
        )}
      </div>
    </DashboardShell>
  )
}

function AppointmentRow({ href, nombre, email, fecha, servicio, lang, zebra }: {
  href: string
  nombre: string
  email: string
  fecha: string | undefined
  servicio: string | undefined
  lang: 'es' | 'en'
  zebra: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr auto',
        gap: 16,
        padding: '16px 20px',
        background: hovered
          ? 'rgba(201,168,76,0.06)'
          : zebra
            ? 'rgba(255,255,255,0.02)'
            : 'transparent',
        borderBottom: '1px solid rgba(201,168,76,0.08)',
        transition: 'background 0.15s',
        alignItems: 'center',
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: pt.base, color: '#FAFAF8', fontFamily: pt.sans }}>
        {nombre}
      </span>
      <span style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans }}>
        {formatDate(fecha, lang)}
      </span>
      <span style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans }}>
        {servicio ?? (lang === 'es' ? 'Servicio pendiente' : 'Service pending')}
      </span>
      <span style={{ fontSize: pt.xs, color: '#6A6560', fontFamily: pt.sans }}>
        {email}
      </span>
    </Link>
  )
}
