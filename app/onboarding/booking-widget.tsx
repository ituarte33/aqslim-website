'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { pt } from '@/lib/portal-type'
import { fetchServices, fetchAvailability, bookAppointment, searchPatients, type PatientResult } from './booking-actions'
import type { SquareService, AvailableSlot } from '@/lib/square'

type Props = {
  clienteId?: string | null
  nombre?: string
  email?: string
  telefono?: string
  allowedServices?: string[]
  isAdmin?: boolean
  lang: 'en' | 'es'
  onBooked?: (startAt: string, serviceName: string) => void
}

// ── Utilities ────────────────────────────────────────────────────────────────

function ptTodayStr(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
}

function formatSlotTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso))
}

function formatFullDate(dateStr: string, lang: 'en' | 'es'): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-MX', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)))
}

function cents(n: number) { return `$${(n / 100).toFixed(0)}` }

// ── Calendar sub-component ────────────────────────────────────────────────────

function Calendar({
  onSelect,
  todayStr,
  lang,
}: {
  onSelect: (dateStr: string) => void
  todayStr: string
  lang: 'en' | 'es'
}) {
  const [y0, m0] = todayStr.split('-').map(Number)
  const [calYear,  setCalYear]  = useState(y0)
  const [calMonth, setCalMonth] = useState(m0 - 1)

  const daysInMonth  = new Date(calYear, calMonth + 1, 0).getDate()
  const firstWeekday = new Date(calYear, calMonth, 1).getDay()
  const monthLabel   = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-MX', { month: 'long' })
    .format(new Date(calYear, calMonth, 1))
  const canPrev = !(calYear === y0 && calMonth === m0 - 1)
  const canNext = !(calYear === y0 && calMonth === m0 + 1)

  function prev() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  function next() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  const dayHeaders = lang === 'en'
    ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
    : ['D', 'L', 'M', 'X', 'J', 'V', 'S']

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={prev} disabled={!canPrev} style={{ background: 'none', border: 'none', color: canPrev ? '#C9A84C' : '#3A3530', cursor: canPrev ? 'pointer' : 'default', fontSize: 20, padding: '0 8px', fontFamily: pt.sans }}>‹</button>
        <span style={{ fontSize: pt.base, color: '#FAFAF8', textTransform: 'capitalize', letterSpacing: '0.06em' }}>
          {monthLabel} {calYear}
        </span>
        <button onClick={next} disabled={!canNext} style={{ background: 'none', border: 'none', color: canNext ? '#C9A84C' : '#3A3530', cursor: canNext ? 'pointer' : 'default', fontSize: 20, padding: '0 8px', fontFamily: pt.sans }}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
        {dayHeaders.map(h => (
          <div key={h} style={{ textAlign: 'center', fontSize: pt.xs, color: '#6A6560', paddingBottom: 4 }}>{h}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {Array.from({ length: firstWeekday }, (_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const ds  = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const past  = ds < todayStr
          const today = ds === todayStr
          return (
            <button key={day} disabled={past} onClick={() => !past && onSelect(ds)} style={{
              textAlign: 'center', padding: '9px 4px', fontSize: pt.sm, fontFamily: pt.sans,
              cursor: past ? 'default' : 'pointer',
              background: today ? 'rgba(201,168,76,0.12)' : 'transparent',
              color: past ? '#3A3530' : '#FAFAF8',
              border: today ? '1px solid rgba(201,168,76,0.35)' : '1px solid transparent',
              borderRadius: 2,
            }}>
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Admin patient search ──────────────────────────────────────────────────────

function PatientSearch({ onSelect, lang }: {
  onSelect: (p: PatientResult) => void
  lang: 'en' | 'es'
}) {
  const es = lang === 'es'
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<PatientResult[]>([])
  const [loading,  setLoading]  = useState(false)
  const [open,     setOpen]     = useState(false)
  const debounce   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setOpen(false); return }
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      setLoading(true)
      searchPatients(query)
        .then(r => { setResults(r); setOpen(r.length > 0) })
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 320)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [query])

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const sourceBadge = (s: PatientResult['source']) => {
    const label = s === 'both' ? 'AT + SQ' : s === 'airtable' ? 'AT' : 'SQ'
    return (
      <span style={{
        fontSize: 10, fontFamily: pt.sans, letterSpacing: '0.1em',
        background: s === 'both' ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.08)',
        color: s === 'both' ? '#C9A84C' : '#9A9590',
        padding: '1px 6px', borderRadius: 2,
      }}>
        {label}
      </span>
    )
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={es ? 'Buscar paciente por nombre o correo…' : 'Search patient by name or email…'}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(201,168,76,0.4)', color: '#FAFAF8',
            padding: '11px 40px 11px 14px', fontSize: pt.sm, fontFamily: pt.sans,
            boxSizing: 'border-box', outline: 'none',
          }}
          autoComplete="off"
        />
        {loading && (
          <span style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: pt.xs, color: '#6A6560',
          }}>…</span>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#161412', border: '1px solid rgba(201,168,76,0.3)',
          borderTop: 'none', maxHeight: 280, overflowY: 'auto',
        }}>
          {results.map((p, i) => (
            <button
              key={i}
              onMouseDown={() => { onSelect(p); setQuery(p.nombre); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                width: '100%', padding: '12px 16px', background: 'none',
                border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.07)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <div>
                <div style={{ fontSize: pt.sm, color: '#FAFAF8', fontFamily: pt.sans }}>{p.nombre}</div>
                <div style={{ fontSize: pt.xs, color: '#6A6560', fontFamily: pt.sans, marginTop: 2 }}>
                  {p.email}{p.telefono ? ` · ${p.telefono}` : ''}
                </div>
              </div>
              {sourceBadge(p.source)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────

type Step = 'patient-info' | 'service' | 'date' | 'slots' | 'confirm' | 'booked'

export function BookingWidget({
  clienteId: clienteIdProp,
  nombre: nombreProp,
  email: emailProp,
  telefono: telefonoProp,
  allowedServices,
  isAdmin = false,
  lang,
  onBooked,
}: Props) {
  const es    = lang === 'es'
  const today = ptTodayStr()

  const needsPatientInfo = !nombreProp || !emailProp
  const [step, setStep] = useState<Step>(needsPatientInfo ? 'patient-info' : 'service')

  const [patientNombre,   setPatientNombre]   = useState(nombreProp ?? '')
  const [patientEmail,    setPatientEmail]    = useState(emailProp ?? '')
  const [patientTelefono, setPatientTelefono] = useState(telefonoProp ?? '')
  const [patientClienteId, setPatientClienteId] = useState<string | null | undefined>(clienteIdProp)
  const [patientInfoErr,  setPatientInfoErr]  = useState('')

  const [services,    setServices]    = useState<SquareService[]>([])
  const [svcLoading,  setSvcLoading]  = useState(true)
  const [svcError,    setSvcError]    = useState<string | null>(null)

  const [selected,      setSelected]      = useState<SquareService | null>(null)
  const [date,          setDate]          = useState<string | null>(null)
  const [slots,         setSlots]         = useState<AvailableSlot[]>([])
  const [slotsLoading,  setSlotsLoading]  = useState(false)
  const [slotsError,    setSlotsError]    = useState<string | null>(null)
  const [pickedSlot,    setPickedSlot]    = useState<AvailableSlot | null>(null)

  const [bookError, setBookError] = useState<string | null>(null)
  const [isBooking, startBooking] = useTransition()
  const [bookedAt,  setBookedAt]  = useState<{ startAt: string; serviceName: string } | null>(null)

  useEffect(() => {
    fetchServices(allowedServices)
      .then(setServices)
      .catch(e => setSvcError(e.message ?? 'Error'))
      .finally(() => setSvcLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!date || !selected) return
    setSlotsLoading(true)
    setSlots([])
    setSlotsError(null)
    fetchAvailability(selected.variationId, date)
      .then(setSlots)
      .catch(e => setSlotsError(e.message ?? 'Error'))
      .finally(() => setSlotsLoading(false))
  }, [date, selected])

  function selectPatient(p: PatientResult) {
    setPatientNombre(p.nombre)
    setPatientEmail(p.email)
    setPatientTelefono(p.telefono ?? '')
    setPatientClienteId(p.clienteId ?? null)
  }

  function submitPatientInfo() {
    if (!patientNombre.trim() || !patientEmail.trim()) {
      setPatientInfoErr(es ? 'Nombre y correo son requeridos.' : 'Name and email are required.')
      return
    }
    setPatientInfoErr('')
    setStep('service')
  }

  function pickService(s: SquareService) {
    setSelected(s); setDate(null); setSlots([]); setPickedSlot(null); setStep('date')
  }

  function pickDate(ds: string) {
    setDate(ds); setPickedSlot(null); setStep('slots')
  }

  function pickSlot(slot: AvailableSlot) {
    setPickedSlot(slot); setStep('confirm')
  }

  function back() {
    if      (step === 'service') setStep(needsPatientInfo ? 'patient-info' : 'service')
    else if (step === 'date')    setStep('service')
    else if (step === 'slots')   setStep('date')
    else if (step === 'confirm') setStep('slots')
  }

  function confirm() {
    if (!pickedSlot || !selected) return
    setBookError(null)
    startBooking(async () => {
      try {
        const result = await bookAppointment(
          pickedSlot, selected.name,
          patientEmail, patientNombre,
          patientTelefono || undefined,
          patientClienteId,
        )
        setBookedAt(result)
        setStep('booked')
        onBooked?.(result.startAt, result.serviceName)
      } catch (e) {
        setBookError(e instanceof Error ? e.message : (es ? 'Error al reservar.' : 'Booking failed.'))
      }
    })
  }

  // ── Shared styles ──────────────────────────────────────────────────────────

  const backBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', color: '#9A9590',
    cursor: 'pointer', fontSize: pt.sm, padding: '0 0 16px',
    fontFamily: pt.sans, letterSpacing: '0.08em', display: 'block', textAlign: 'left',
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: pt.xs, letterSpacing: '0.18em', textTransform: 'uppercase',
    color: '#9A9590', marginBottom: 14,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(201,168,76,0.3)', color: '#FAFAF8',
    padding: '11px 14px', fontSize: pt.sm, fontFamily: pt.sans,
    boxSizing: 'border-box', outline: 'none',
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (svcLoading) return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: '#6A6560', fontSize: pt.sm }}>
      {es ? 'Cargando servicios...' : 'Loading services...'}
    </div>
  )

  if (svcError) return (
    <div style={{ padding: '24px 0', color: '#ff6b6b', fontSize: pt.sm }}>
      {es ? 'No se pudieron cargar los servicios.' : 'Could not load services.'}
    </div>
  )

  return (
    <div style={{ borderTop: '1px solid rgba(201,168,76,0.15)', paddingTop: 24 }}>

      {/* ── Step: patient info ──────────────────────────────────────────── */}
      {step === 'patient-info' && (
        <div>
          <p style={sectionLabel}>{es ? 'Información del paciente' : 'Patient information'}</p>

          {/* Admin gets a search box; non-admin gets plain inputs */}
          {isAdmin ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <PatientSearch onSelect={selectPatient} lang={lang} />

              {/* Show filled fields (editable) once a patient is selected or typed manually */}
              {(patientNombre || patientEmail) && (
                <div style={{
                  background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.2)',
                  padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: pt.xs, color: '#9A9590', width: 64, flexShrink: 0 }}>
                      {es ? 'Nombre' : 'Name'}
                    </span>
                    <input
                      style={{ ...inputStyle, flex: 1, padding: '7px 10px' }}
                      value={patientNombre}
                      onChange={e => setPatientNombre(e.target.value)}
                      placeholder={es ? 'Nombre completo' : 'Full name'}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: pt.xs, color: '#9A9590', width: 64, flexShrink: 0 }}>
                      {es ? 'Correo' : 'Email'}
                    </span>
                    <input
                      style={{ ...inputStyle, flex: 1, padding: '7px 10px' }}
                      value={patientEmail}
                      onChange={e => setPatientEmail(e.target.value)}
                      type="email"
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: pt.xs, color: '#9A9590', width: 64, flexShrink: 0 }}>
                      {es ? 'Teléfono' : 'Phone'}
                    </span>
                    <input
                      style={{ ...inputStyle, flex: 1, padding: '7px 10px' }}
                      value={patientTelefono}
                      onChange={e => setPatientTelefono(e.target.value)}
                      type="tel"
                      placeholder={es ? 'Opcional' : 'Optional'}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <input style={inputStyle} placeholder={es ? 'Nombre completo' : 'Full name'} value={patientNombre} onChange={e => setPatientNombre(e.target.value)} />
              <input style={inputStyle} placeholder={es ? 'Correo electrónico' : 'Email'} type="email" value={patientEmail} onChange={e => setPatientEmail(e.target.value)} />
              <input style={inputStyle} placeholder={es ? 'Teléfono (opcional)' : 'Phone (optional)'} type="tel" value={patientTelefono} onChange={e => setPatientTelefono(e.target.value)} />
            </div>
          )}

          {patientInfoErr && (
            <p style={{ color: '#ff6b6b', fontSize: pt.sm, marginBottom: 12 }}>{patientInfoErr}</p>
          )}
          <button
            onClick={submitPatientInfo}
            style={{
              background: '#C9A84C', color: '#0A0A0A', border: 'none',
              padding: '12px 28px', fontSize: pt.sm, letterSpacing: '0.14em',
              textTransform: 'uppercase', fontFamily: pt.sans, fontWeight: 500,
              cursor: 'pointer', width: '100%',
            }}
          >
            {es ? 'Continuar' : 'Continue'}
          </button>
        </div>
      )}

      {/* ── Step: service selection ─────────────────────────────────────── */}
      {step === 'service' && (
        <div>
          {needsPatientInfo && (
            <button style={backBtnStyle} onClick={() => setStep('patient-info')}>
              ← {es ? 'Cambiar paciente' : 'Change patient'}
            </button>
          )}
          {patientNombre && (
            <div style={{ fontSize: pt.sm, color: '#9A9590', marginBottom: 16 }}>
              {es ? 'Paciente:' : 'Patient:'} <span style={{ color: '#FAFAF8' }}>{patientNombre}</span>
            </div>
          )}
          <p style={sectionLabel}>{es ? 'Selecciona un servicio' : 'Select a service'}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {services.map(s => (
              <button key={s.variationId} onClick={() => pickService(s)} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.3)',
                padding: '18px 20px', textAlign: 'left', cursor: 'pointer',
                fontFamily: pt.sans, color: '#FAFAF8', width: '100%',
              }}>
                <div style={{ fontSize: pt.md, fontFamily: pt.serif, marginBottom: 4 }}>{s.name}</div>
                {s.description && <div style={{ fontSize: pt.sm, color: '#9A9590', marginBottom: 8 }}>{s.description}</div>}
                <div style={{ display: 'flex', gap: 12, fontSize: pt.sm, color: '#C9A84C' }}>
                  <span>{cents(s.priceCents)}</span><span>·</span><span>{s.durationMinutes} min</span>
                </div>
              </button>
            ))}
            {services.length === 0 && (
              <p style={{ color: '#6A6560', fontSize: pt.sm }}>{es ? 'Sin servicios disponibles.' : 'No services available.'}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Step: date selection ────────────────────────────────────────── */}
      {step === 'date' && (
        <div>
          <button style={backBtnStyle} onClick={back}>← {es ? 'Cambiar servicio' : 'Change service'}</button>
          {selected && (
            <div style={{ fontSize: pt.sm, color: '#9A9590', marginBottom: 20 }}>
              {selected.name} · {cents(selected.priceCents)} · {selected.durationMinutes} min
            </div>
          )}
          <p style={sectionLabel}>{es ? 'Selecciona una fecha' : 'Select a date'}</p>
          <Calendar onSelect={pickDate} todayStr={today} lang={lang} />
        </div>
      )}

      {/* ── Step: time slots ────────────────────────────────────────────── */}
      {step === 'slots' && (
        <div>
          <button style={backBtnStyle} onClick={back}>← {es ? 'Cambiar fecha' : 'Change date'}</button>
          {date && (
            <div style={{ fontSize: pt.sm, color: '#9A9590', marginBottom: 20, textTransform: 'capitalize' }}>
              {formatFullDate(date, lang)}
            </div>
          )}
          {slotsLoading && <p style={{ color: '#6A6560', fontSize: pt.sm, textAlign: 'center', padding: '24px 0' }}>{es ? 'Buscando horarios...' : 'Checking availability...'}</p>}
          {slotsError && <p style={{ color: '#ff6b6b', fontSize: pt.sm }}>{es ? 'Error al cargar horarios.' : 'Failed to load times.'}</p>}
          {!slotsLoading && !slotsError && slots.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: '#6A6560', fontSize: pt.sm, marginBottom: 12 }}>{es ? 'Sin horarios disponibles.' : 'No times available.'}</p>
              <button onClick={back} style={{ ...backBtnStyle, padding: 0, color: '#C9A84C' }}>{es ? '← Elegir otra fecha' : '← Choose another date'}</button>
            </div>
          )}
          {!slotsLoading && slots.length > 0 && (
            <>
              <p style={sectionLabel}>{es ? 'Hora disponible' : 'Available times'}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {slots.map(slot => (
                  <button key={slot.startAt} onClick={() => pickSlot(slot)} style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.35)',
                    color: '#FAFAF8', padding: '10px 20px', fontSize: pt.sm, fontFamily: pt.sans,
                    cursor: 'pointer', letterSpacing: '0.06em', minWidth: 96, textAlign: 'center',
                  }}>
                    {formatSlotTime(slot.startAt)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step: confirm ───────────────────────────────────────────────── */}
      {step === 'confirm' && pickedSlot && selected && date && (
        <div>
          <button style={backBtnStyle} onClick={back}>← {es ? 'Cambiar horario' : 'Change time'}</button>
          <p style={sectionLabel}>{es ? 'Confirmar cita' : 'Confirm appointment'}</p>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.3)', padding: '20px 22px', marginBottom: 20 }}>
            {([
              [es ? 'Nombre'   : 'Name',     patientNombre],
              [es ? 'Servicio' : 'Service',   selected.name],
              [es ? 'Fecha'    : 'Date',      formatFullDate(date, lang)],
              [es ? 'Hora'     : 'Time',      formatSlotTime(pickedSlot.startAt)],
              [es ? 'Duración' : 'Duration',  `${selected.durationMinutes} min`],
              [es ? 'Costo'    : 'Price',     cents(selected.priceCents)],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: pt.sm, color: '#9A9590' }}>{label}</span>
                <span style={{ fontSize: pt.sm, color: '#FAFAF8', textAlign: 'right', textTransform: 'capitalize' }}>{value}</span>
              </div>
            ))}
          </div>

          {bookError && <p style={{ color: '#ff6b6b', fontSize: pt.sm, marginBottom: 16 }}>{bookError}</p>}

          <button onClick={confirm} disabled={isBooking} style={{
            background: isBooking ? 'rgba(201,168,76,0.4)' : '#C9A84C',
            color: '#0A0A0A', border: 'none', padding: '14px 32px', fontSize: pt.sm,
            letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: pt.sans, fontWeight: 500,
            cursor: isBooking ? 'not-allowed' : 'pointer', width: '100%',
          }}>
            {isBooking ? (es ? 'Reservando...' : 'Booking...') : (es ? 'Confirmar cita' : 'Confirm appointment')}
          </button>
        </div>
      )}

      {/* ── Step: booked ────────────────────────────────────────────────── */}
      {step === 'booked' && bookedAt && (
        <div style={{ textAlign: 'center', padding: '28px 0' }}>
          <div style={{ fontSize: 28, color: '#C9A84C', marginBottom: 12 }}>✓</div>
          <p style={{ fontFamily: pt.serif, fontSize: pt.lg, color: '#FAFAF8', marginBottom: 8 }}>
            {es ? '¡Cita confirmada!' : 'Appointment confirmed!'}
          </p>
          <p style={{ fontSize: pt.sm, color: '#9A9590' }}>
            {formatSlotTime(bookedAt.startAt)}&nbsp;·&nbsp;{bookedAt.serviceName}
          </p>
        </div>
      )}

    </div>
  )
}
