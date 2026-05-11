'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DashboardShell } from '../dashboard-shell'
import { pt } from '@/lib/portal-type'
import type { getClientesConCita } from '@/lib/airtable'

const SQUARE_MANAGE_URL  = 'https://app.squareup.com/dashboard/appointments/calendar'
const GOOGLE_CALENDAR_SRC = 'https://calendar.google.com/calendar/embed?src=9d8c0344cef5ea1337d190292b059834d0cdbbee9b2282712a61f89dc804fbf7%40group.calendar.google.com&ctz=America%2FPhoenix'

type Tab = 'list' | 'calendar'

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
  const [lang, setLang]   = useState<'es' | 'en'>('es')
  const [tab, setTab]     = useState<Tab>('list')
  const es = lang === 'es'

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 24, marginTop: 8 }}>
        <div>
          <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 8, marginTop: 0 }}>
            {es ? 'Citas' : 'Appointments'}
          </h1>
          <p style={{ fontSize: pt.base, color: '#6A6560', margin: 0 }}>
            {es
              ? 'Gestiona citas y consulta el calendario.'
              : 'Manage appointments and view the calendar.'}
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(201,168,76,0.15)', marginBottom: 32 }}>
        {(['list', 'calendar'] as Tab[]).map(t => {
          const active = tab === t
          const label  = t === 'list'
            ? (es ? 'Lista' : 'List')
            : (es ? 'Calendario' : 'Calendar')
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: active ? '2px solid #C9A84C' : '2px solid transparent',
                padding: '10px 20px',
                marginBottom: -1,
                fontSize: pt.sm,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontFamily: pt.sans,
                color: active ? '#C9A84C' : '#6A6560',
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Tab: List */}
      {tab === 'list' && (
        <>
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
                  'Email',
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
        </>
      )}

      {/* Tab: Calendar */}
      {tab === 'calendar' && (
        <div style={{ border: '1px solid rgba(201,168,76,0.15)', overflow: 'hidden' }}>
          <iframe
            src={GOOGLE_CALENDAR_SRC}
            style={{ border: 0, display: 'block', width: '100%', height: 640 }}
            frameBorder={0}
            scrolling="no"
            title={es ? 'Calendario de citas' : 'Appointments calendar'}
          />
        </div>
      )}
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
