'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import type { Cliente, Consulta } from '@/lib/airtable'
import { pt } from '@/lib/portal-type'
import { BookingWidget } from '@/app/onboarding/booking-widget'
import { ADMIN_SERVICES } from '@/app/onboarding/booking-constants'
import { sendNoShowEmail } from '@/app/dashboard/[id]/edit/actions'

type Props = {
  patient: Cliente | null
  consultations: Consulta[]
  error: string | null
  isAdmin: boolean
}

function fmt(val: unknown): string {
  if (val == null) return '—'
  if (typeof val === 'boolean') return val ? 'Sí' : 'No'
  if (Array.isArray(val)) return val.join(', ') || '—'
  const s = String(val).trim()
  return s || '—'
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${highlight ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)'}`,
      padding: '16px 20px',
      minWidth: 140,
    }}>
      <div style={{ fontSize: pt.sm, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9A9590', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: pt.lg, color: highlight ? '#C9A84C' : '#FAFAF8', fontFamily: pt.serif }}>
        {value}
      </div>
    </div>
  )
}

function EstaturaCard({ cm }: { cm: number }) {
  const [unit, setUnit] = useState<'ft-in' | 'cm'>('ft-in')
  const totalIn = cm / 2.54
  const ft = Math.floor(totalIn / 12)
  const inches = Math.round(totalIn % 12)
  const display = unit === 'ft-in' ? `${ft}'${inches}"` : `${cm} cm`
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      padding: '16px 20px', minWidth: 140,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: pt.sm, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9A9590' }}>
          Estatura
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {(['ft-in', 'cm'] as const).map(u => (
            <button key={u} type="button" onClick={() => setUnit(u)} style={{
              padding: '2px 6px', fontSize: 9, fontFamily: pt.sans, cursor: 'pointer',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              border: unit === u ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.2)',
              background: unit === u ? 'rgba(201,168,76,0.12)' : 'transparent',
              color: unit === u ? '#C9A84C' : '#6A6560', transition: 'all 0.1s',
            }}>
              {u === 'ft-in' ? 'ft' : 'cm'}
            </button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: pt.lg, color: '#FAFAF8', fontFamily: pt.serif }}>{display}</div>
    </div>
  )
}

type ColDef = {
  field: keyof Consulta['fields']
  colKey?: string
  label?: string
  render?: (c: Consulta, i: number, all: Consulta[]) => string
}

const WEIGHT_COLS: ColDef[] = [
  { field: 'Fecha Consulta' },
  {
    field: 'Peso (kg)',
    colKey: 'peso-kg',
    label: 'Peso (kg)',
    render: (c) => {
      const kg = c.fields['Peso (kg)']
      return kg == null ? '—' : Number(kg).toFixed(1)
    },
  },
  {
    field: 'Peso (kg)',
    colKey: 'peso-lbs',
    label: 'Peso (lbs)',
    render: (c) => {
      const kg = c.fields['Peso (kg)']
      return kg == null ? '—' : (Number(kg) * 2.20462).toFixed(1)
    },
  },
  {
    field: 'Peso (kg)',
    colKey: 'dif-kg',
    label: 'Dif. (kg)',
    render: (c, i, all) => {
      const curr = c.fields['Peso (kg)']
      const prev = all[i + 1]?.fields['Peso (kg)']
      if (curr == null || prev == null) return '—'
      const diff = Number(curr) - Number(prev)
      return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}`
    },
  },
  {
    field: 'Peso (kg)',
    colKey: 'dif-lbs',
    label: 'Dif. (lbs)',
    render: (c, i, all) => {
      const curr = c.fields['Peso (kg)']
      const prev = all[i + 1]?.fields['Peso (kg)']
      if (curr == null || prev == null) return '—'
      const diff = (Number(curr) - Number(prev)) * 2.20462
      return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}`
    },
  },
  { field: '% Grasa Corporal' },
  { field: 'IMC' },
]

const MEASUREMENTS_COLS: ColDef[] = [
  { field: 'Fecha Consulta' },
  { field: 'Cintura (cm)' },
  { field: 'Cadera (cm)' },
  { field: 'Brazos (cm)' },
  { field: 'Muslos (cm)' },
  { field: 'Pecho/Busto (cm)' },
]

const WELLNESS_COLS: ColDef[] = [
  { field: 'Fecha Consulta' },
  { field: 'Cumplimiento Dieta (1-10)' },
  { field: 'Cómo Se Siente (1-10)' },
  { field: 'Nivel de Energía' },
  { field: 'Calidad de Sueño' },
  { field: '¿Ansiedad?' },
  { field: '¿Tuvo Hambre?' },
]

type TabId = 'weight' | 'measurements' | 'wellness' | 'notes'

const TABS: { id: TabId; label: string }[] = [
  { id: 'weight', label: 'Peso' },
  { id: 'measurements', label: 'Medidas' },
  { id: 'wellness', label: 'Bienestar' },
  { id: 'notes', label: 'Notas' },
]

function ConsultaTable({ consultations, columns }: { consultations: Consulta[]; columns: ColDef[] }) {
  const router = useRouter()
  if (consultations.length === 0) {
    return <p style={{ color: '#6A6560', fontSize: pt.base }}>Sin consultas registradas.</p>
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <p style={{ fontSize: pt.xs, color: '#6A6560', margin: '0 0 8px', fontFamily: 'sans-serif', letterSpacing: '0.04em' }}>
        Haz clic en una fila para editar esa consulta.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: pt.base }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.3)' }}>
            {columns.map(col => (
              <th key={col.colKey ?? String(col.field)} style={{
                textAlign: 'left', padding: '10px 16px', whiteSpace: 'nowrap',
                fontSize: pt.xs, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A84C',
              }}>
                {col.label ?? String(col.field)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {consultations.map((c, i) => (
            <tr
              key={c.id}
              onClick={() => router.push(`/dashboard/consultas/${c.id}`)}
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)')}
            >
              {columns.map(col => (
                <td key={col.colKey ?? String(col.field)} style={{
                  padding: '12px 16px', whiteSpace: 'nowrap',
                  color: col.field === 'Fecha Consulta' ? '#FAFAF8' : '#9A9590',
                }}>
                  {col.render ? col.render(c, i, consultations) : fmt(c.fields[col.field])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function NotesTab({ consultations }: { consultations: Consulta[] }) {
  const withNotes = consultations.filter(c => c.fields['Recomendaciones al Cliente'])
  if (withNotes.length === 0) {
    return <p style={{ color: '#6A6560', fontSize: pt.base }}>Sin recomendaciones registradas.</p>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {withNotes.map(c => (
        <div key={c.id} style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '20px 24px',
        }}>
          <div style={{ fontSize: pt.sm, color: '#C9A84C', letterSpacing: '0.12em', marginBottom: 10 }}>
            {fmt(c.fields['Fecha Consulta'])}
          </div>
          <p style={{ fontSize: pt.md, color: '#FAFAF8', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
            {String(c.fields['Recomendaciones al Cliente'])}
          </p>
        </div>
      ))}
    </div>
  )
}

export function PatientDetailClient({ patient, consultations, error, isAdmin }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('weight')
  const [showBooking, setShowBooking] = useState(false)
  const [noShowPending, startNoShowTransition] = useTransition()
  const [noShowStatus, setNoShowStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [noShowError, setNoShowError]   = useState<string | null>(null)

  const tabBtn = (id: TabId) => ({
    background: 'none' as const,
    border: 'none' as const,
    borderBottom: activeTab === id ? '2px solid #C9A84C' : '2px solid transparent',
    color: activeTab === id ? '#C9A84C' : '#9A9590',
    cursor: 'pointer' as const,
    fontSize: pt.sm,
    letterSpacing: '0.14em',
    padding: '10px 0',
    marginRight: 28,
    textTransform: 'uppercase' as const,
    fontFamily: pt.sans,
    transition: 'color 0.2s',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#FAFAF8' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: '1px solid rgba(201,168,76,0.2)',
        position: 'sticky', top: 0, background: 'rgba(10,10,10,0.92)',
      }}>
        <span style={{ fontFamily: pt.serif, fontSize: pt.lg, letterSpacing: '0.08em' }}>
          AQ<span style={{ color: '#C9A84C' }}>SLIM</span>
          <span style={{ fontSize: pt.sm, color: '#9A9590', marginLeft: 12, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: pt.sans }}>
            Portal
          </span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {isAdmin && (
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                background: 'none', border: '1px solid rgba(201,168,76,0.3)',
                color: '#C9A84C', cursor: 'pointer', fontSize: pt.sm,
                letterSpacing: '0.12em', padding: '8px 16px',
                fontFamily: pt.sans, textTransform: 'uppercase',
              }}
            >
              ← Pacientes
            </button>
          )}
          <UserButton />
        </div>
      </header>

      <main style={{ padding: '48px 40px', maxWidth: 1200, margin: '0 auto' }}>
        {error && (
          <div style={{ padding: '16px 20px', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', marginBottom: 24, fontSize: pt.base, fontFamily: 'monospace' }}>
            {error}
          </div>
        )}

        {patient && (
          <>
            {/* Patient header */}
            <div style={{ marginBottom: 40 }}>
              <p style={{ fontSize: pt.sm, color: '#9A9590', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
                Expediente del Paciente
              </p>
              <h1 style={{ fontFamily: pt.serif, fontSize: pt.hero, fontWeight: 400, margin: '0 0 24px' }}>
                {fmt(patient.fields['Nombre Completo'])}
              </h1>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <StatCard label="ID Cliente" value={fmt(patient.fields['ID Cliente'])} />
                <StatCard label="Edad" value={fmt(patient.fields['Edad'])} />
                {typeof patient.fields['Estatura (cm)'] === 'number' && (
                  <EstaturaCard cm={patient.fields['Estatura (cm)'] as number} />
                )}
                <StatCard label="Peso Meta" value={fmt(patient.fields['Peso Meta (con unidad)'])} highlight />
                <StatCard label="Consultas" value={String(consultations.length)} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
                {isAdmin && (
                  <>
                    <Link href={`/dashboard/consulta-subsecuente?clienteId=${patient.id}`} style={{
                      background: 'none', color: '#C9A84C',
                      border: '1px solid rgba(201,168,76,0.5)',
                      padding: '12px 24px', fontSize: pt.sm, letterSpacing: '0.14em',
                      textTransform: 'uppercase', fontFamily: pt.sans, fontWeight: 500,
                      textDecoration: 'none', display: 'inline-block',
                    }}>
                      + Consulta Subsecuente
                    </Link>
                    <Link href={`/dashboard/${patient.id}/edit`} style={{
                      background: 'none', color: '#C9A84C',
                      border: '1px solid rgba(201,168,76,0.5)',
                      padding: '12px 24px', fontSize: pt.sm, letterSpacing: '0.14em',
                      textTransform: 'uppercase', fontFamily: pt.sans, fontWeight: 500,
                      textDecoration: 'none', display: 'inline-block',
                    }}>
                      Editar Paciente
                    </Link>
                  </>
                )}
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
                  {showBooking ? '✕ Cerrar' : '+ Agendar Cita'}
                </button>
                {isAdmin && (
                  <button
                    disabled={noShowPending || noShowStatus === 'sent'}
                    onClick={() => {
                      setNoShowStatus('idle')
                      setNoShowError(null)
                      startNoShowTransition(async () => {
                        try {
                          await sendNoShowEmail(patient.id)
                          setNoShowStatus('sent')
                        } catch (err) {
                          setNoShowStatus('error')
                          setNoShowError(err instanceof Error ? err.message : 'Error al enviar el email.')
                        }
                      })
                    }}
                    style={{
                      background: noShowStatus === 'sent' ? 'rgba(111,191,111,0.1)' : 'none',
                      color: noShowStatus === 'sent' ? '#6fbf6f' : '#C9A84C',
                      border: `1px solid ${noShowStatus === 'sent' ? 'rgba(111,191,111,0.4)' : 'rgba(201,168,76,0.5)'}`,
                      padding: '12px 24px', fontSize: pt.sm, letterSpacing: '0.14em',
                      textTransform: 'uppercase', fontFamily: pt.sans, fontWeight: 500,
                      cursor: (noShowPending || noShowStatus === 'sent') ? 'not-allowed' : 'pointer',
                      opacity: (noShowPending || noShowStatus === 'sent') ? 0.6 : 1,
                    }}
                  >
                    {noShowPending ? 'Enviando...' : noShowStatus === 'sent' ? '✓ Email Enviado' : 'Send No-Show Email'}
                  </button>
                )}
              </div>
              {noShowStatus === 'error' && noShowError && (
                <p style={{ fontSize: pt.sm, color: '#ff6b6b', margin: '12px 0 0' }}>{noShowError}</p>
              )}
              {noShowStatus === 'sent' && (
                <p style={{ fontSize: pt.sm, color: '#6fbf6f', margin: '12px 0 0' }}>
                  Email de no-show enviado a {String(patient.fields['Email'] ?? '')}.
                </p>
              )}

              {showBooking && (
                <div style={{ marginTop: 24, border: '1px solid rgba(201,168,76,0.2)', padding: '24px 28px' }}>
                  <BookingWidget
                    clienteId={patient.id}
                    nombre={String(patient.fields['Nombre Completo'] ?? '')}
                    email={String(patient.fields['Email'] ?? '')}
                    telefono={patient.fields['Teléfono'] ? String(patient.fields['Teléfono']) : undefined}
                    allowedServices={isAdmin ? ADMIN_SERVICES : ['Returning Client', 'New Beggining']}
                    isAdmin={isAdmin}
                    lang="es"
                    onBooked={() => setShowBooking(false)}
                  />
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 32 }}>
              {TABS.map(t => (
                <button key={t.id} style={tabBtn(t.id)} onClick={() => setActiveTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'weight' && <ConsultaTable consultations={consultations} columns={WEIGHT_COLS} />}
            {activeTab === 'measurements' && <ConsultaTable consultations={consultations} columns={MEASUREMENTS_COLS} />}
            {activeTab === 'wellness' && <ConsultaTable consultations={consultations} columns={WELLNESS_COLS} />}
            {activeTab === 'notes' && <NotesTab consultations={consultations} />}
          </>
        )}

        {!patient && !error && (
          <p style={{ color: '#6A6560', fontSize: pt.base }}>Paciente no encontrado.</p>
        )}
      </main>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400&family=Montserrat:wght@300;400;500&display=swap" />
    </div>
  )
}
