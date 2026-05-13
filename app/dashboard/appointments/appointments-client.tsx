'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DashboardShell } from '../dashboard-shell'
import { pt } from '@/lib/portal-type'
import type { SquareBooking } from '@/lib/square'
import { BookingWidget } from '@/app/onboarding/booking-widget'
import { ADMIN_SERVICES } from '@/app/onboarding/booking-constants'

const SQUARE_MANAGE_URL   = 'https://app.squareup.com/dashboard/appointments/calendar'
const GOOGLE_CALENDAR_SRC = 'https://calendar.google.com/calendar/embed?src=9d8c0344cef5ea1337d190292b059834d0cdbbee9b2282712a61f89dc804fbf7%40group.calendar.google.com&ctz=America%2FPhoenix'

type Tab = 'list' | 'calendar'

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
  bookings: SquareBooking[]
  airtableHrefs: Record<string, string>
  squareError: string | null
}

function formatDate(iso: string, lang: 'es' | 'en'): string {
  try {
    return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'short',
      month:   'short',
      day:     'numeric',
      hour:    'numeric',
      minute:  '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

const STATUS_MAP: Record<string, { es: string; en: string; color: string; border: string }> = {
  ACCEPTED:              { es: 'Aceptada',       en: 'Accepted',   color: '#C9A84C', border: 'rgba(201,168,76,0.5)'  },
  PENDING:               { es: 'Por confirmar',  en: 'Pending',    color: '#e8a84a', border: 'rgba(232,168,74,0.5)'  },
  NO_SHOW:               { es: 'No se presentó', en: 'No show',    color: '#9A9590', border: 'rgba(255,255,255,0.2)' },
  DECLINED:              { es: 'Rechazada',       en: 'Declined',   color: '#e87a4a', border: 'rgba(232,122,74,0.5)'  },
  CANCELLED_BY_CUSTOMER: { es: 'Cancelada',       en: 'Cancelled',  color: '#9A9590', border: 'rgba(255,255,255,0.2)' },
  CANCELLED_BY_SELLER:   { es: 'Cancelada',       en: 'Cancelled',  color: '#9A9590', border: 'rgba(255,255,255,0.2)' },
}

function StatusBadge({ status, lang }: { status: string; lang: 'es' | 'en' }) {
  const s = STATUS_MAP[status] ?? { es: status, en: status, color: '#9A9590', border: 'rgba(255,255,255,0.2)' }

  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      fontSize: pt.xs,
      fontFamily: pt.sans,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      border: `1px solid ${s.border}`,
      color: s.color,
      whiteSpace: 'nowrap',
    }}>
      {lang === 'es' ? s.es : s.en}
    </span>
  )
}

export function AppointmentsClient({ user, bookings, airtableHrefs, squareError }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [tab, setTab]   = useState<Tab>('list')
  const [showBooking, setShowBooking] = useState(false)
  const es = lang === 'es'

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 24, marginTop: 8, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 8, marginTop: 0 }}>
            {es ? 'Citas' : 'Appointments'}
          </h1>
          <p style={{ fontSize: pt.base, color: '#6A6560', margin: 0 }}>
            {es ? 'Citas próximas desde Square.' : 'Upcoming appointments from Square.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0, marginTop: 4 }}>
          <button
            onClick={() => setShowBooking(v => !v)}
            style={{
              background: showBooking ? 'rgba(201,168,76,0.12)' : 'none',
              color: '#C9A84C',
              border: '1px solid rgba(201,168,76,0.5)',
              padding: '10px 20px',
              fontSize: pt.sm,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontFamily: pt.sans,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {showBooking ? (es ? '✕ Cerrar' : '✕ Close') : (es ? '+ Agendar Cita' : '+ New Appointment')}
          </button>
          <a
            href={SQUARE_MANAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
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
            }}
          >
            {es ? 'Abrir Square →' : 'Open Square →'}
          </a>
        </div>
      </div>

      {showBooking && (
        <div style={{ border: '1px solid rgba(201,168,76,0.2)', padding: '24px 28px', marginBottom: 32 }}>
          <BookingWidget
            allowedServices={ADMIN_SERVICES}
            isAdmin
            lang={lang}
            onBooked={() => setShowBooking(false)}
          />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(201,168,76,0.15)', marginBottom: 32 }}>
        {(['list', 'calendar'] as Tab[]).map(t => {
          const active = tab === t
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
              {t === 'list' ? (es ? 'Lista' : 'List') : (es ? 'Calendario' : 'Calendar')}
            </button>
          )
        })}
      </div>

      {/* Tab: List */}
      {tab === 'list' && (
        <>
          {squareError && (
            <div style={{ padding: '16px 20px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)', marginBottom: 24, fontSize: pt.sm, fontFamily: 'monospace', color: '#ff8080' }}>
              {squareError}
            </div>
          )}

          {bookings.length === 0 && !squareError ? (
            <div style={{
              border: '1px solid rgba(201,168,76,0.15)',
              padding: '80px 40px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center',
            }}>
              <div style={{ fontSize: 40, color: 'rgba(201,168,76,0.2)', lineHeight: 1 }}>◷</div>
              <p style={{ fontFamily: pt.serif, fontSize: pt.md, color: '#9A9590', margin: 0 }}>
                {es ? 'Sin citas próximas' : 'No upcoming appointments'}
              </p>
              <p style={{ fontSize: pt.base, color: '#6A6560', margin: 0, maxWidth: 360 }}>
                {es
                  ? 'Las citas confirmadas en Square aparecerán aquí.'
                  : 'Appointments confirmed in Square will appear here.'}
              </p>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr 110px 160px',
                gap: 16,
                padding: '0 20px 12px',
                borderBottom: '1px solid rgba(201,168,76,0.15)',
                alignItems: 'center',
              }}>
                {[
                  es ? 'Paciente'    : 'Patient',
                  es ? 'Fecha'       : 'Date',
                  es ? 'Servicio'    : 'Service',
                  es ? 'Contacto'    : 'Contact',
                  es ? 'Estado'      : 'Status',
                  es ? 'Expediente'  : 'Record',
                ].map((h, i) => (
                  <span key={i} style={{ fontSize: pt.xs, color: '#6A6560', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: pt.sans }}>
                    {h}
                  </span>
                ))}
              </div>

              {bookings.map((b, i) => (
                <BookingRow
                  key={b.id}
                  booking={b}
                  href={airtableHrefs[b.id]}
                  lang={lang}
                  zebra={i % 2 === 0}
                />
              ))}

              <p style={{ fontSize: pt.xs, color: '#6A6560', marginTop: 20, fontFamily: pt.sans }}>
                {bookings.length} {es ? 'cita(s) próxima(s)' : 'upcoming appointment(s)'}
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

function BookingRow({ booking, href, lang, zebra }: {
  booking: SquareBooking
  href: string | undefined
  lang: 'es' | 'en'
  zebra: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const es = lang === 'es'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr 110px 160px',
        gap: 16,
        padding: '16px 20px',
        background: hovered
          ? 'rgba(201,168,76,0.06)'
          : zebra ? 'rgba(255,255,255,0.02)' : 'transparent',
        borderBottom: '1px solid rgba(201,168,76,0.08)',
        transition: 'background 0.15s',
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: pt.base, color: '#FAFAF8', fontFamily: pt.sans }}>
        {booking.customer_name ?? (es ? 'Sin nombre' : 'No name')}
      </span>

      <div>
        <span style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans, display: 'block' }}>
          {formatDate(booking.start_at, lang)}
        </span>
        {booking.duration_minutes > 0 && (
          <span style={{ fontSize: pt.xs, color: '#6A6560', fontFamily: pt.sans }}>
            {booking.duration_minutes} min
          </span>
        )}
      </div>

      <span style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans }}>
        {booking.service_name ?? (es ? 'Servicio pendiente' : 'Service pending')}
      </span>

      <span style={{ fontSize: pt.xs, color: '#6A6560', fontFamily: pt.sans }}>
        {booking.customer_email ?? booking.customer_phone ?? '—'}
      </span>

      <StatusBadge status={booking.status} lang={lang} />

      {href ? (
        <Link href={href} style={{
          fontSize: pt.xs, color: '#C9A84C', fontFamily: pt.sans,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          textDecoration: 'none', whiteSpace: 'nowrap',
        }}>
          {es ? 'Ver expediente →' : 'View record →'}
        </Link>
      ) : (() => {
        const params = new URLSearchParams()
        if (booking.customer_name)  params.set('nombre', booking.customer_name)
        if (booking.customer_email) params.set('email',  booking.customer_email)
        return (
          <Link href={`/dashboard/nueva-consulta?${params}`} style={{
            fontSize: pt.xs, color: '#9A9590', fontFamily: pt.sans,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            textDecoration: 'none', whiteSpace: 'nowrap',
            borderBottom: '1px dashed rgba(154,149,144,0.4)',
          }}>
            {es ? 'Crear expediente →' : 'Create record →'}
          </Link>
        )
      })()}
    </div>
  )
}
