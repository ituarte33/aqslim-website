'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardShell } from '../dashboard-shell'
import { saveConsultaSubsecuente, fetchPatientConsultations, fetchPatientCuestionarios } from './actions'
import { sendReinitiationEmail } from '@/app/dashboard/[id]/edit/actions'
import type { Cliente, Consulta, CuestionarioSintoma, Suplemento } from '@/lib/airtable'
import { pt } from '@/lib/portal-type'
import { BookingWidget } from '@/app/onboarding/booking-widget'
import { ADMIN_SERVICES } from '@/app/onboarding/booking-constants'

// One week from now as a datetime-local string (YYYY-MM-DDTHH:MM) in local time
function nextWeekDatetimeLocal(): string {
  const d = new Date(Date.now() + 7 * 24 * 3_600_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Convert a UTC ISO string from Square to datetime-local in Pacific time
function utcToPtDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  const h = get('hour') === '24' ? '00' : get('hour')
  return `${get('year')}-${get('month')}-${get('day')}T${h}:${get('minute')}`
}

type CartItem = { key: number; id: string; nombre: string; precio: number }

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
  patient: Cliente | null
  allPatients: Cliente[]
  supplementos: Suplemento[]
  initialConsultations: Consulta[]
  initialCuestionarios: CuestionarioSintoma[]
}

// ── Styles ────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(201,168,76,0.3)', color: '#FAFAF8',
  padding: '12px 16px', fontSize: pt.base, outline: 'none',
  fontFamily: pt.sans, boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: pt.sm, letterSpacing: '0.14em', textTransform: 'uppercase',
  color: '#9A9590', display: 'block', marginBottom: 8,
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 4px' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      <span style={{ fontSize: pt.xs, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6A6560', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
    </div>
  )
}

// ── Score selector (1-10) ─────────────────────────────────────────────────────

function ScoreInput({
  label, value, onChange,
}: { label: string; value: number | null; onChange: (v: number) => void }) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n} type="button" onClick={() => onChange(n)}
            style={{
              width: 38, height: 38,
              border: value === n ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.25)',
              background: value === n ? 'rgba(201,168,76,0.18)' : 'rgba(255,255,255,0.03)',
              color: value === n ? '#C9A84C' : '#9A9590',
              cursor: 'pointer', fontSize: pt.sm, fontFamily: pt.sans,
              transition: 'all 0.12s',
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Toggle group ──────────────────────────────────────────────────────────────

function ToggleGroup<T extends string>({
  label, options, value, onChange,
}: { label: string; options: { value: T; label: string }[]; value: T | null; onChange: (v: T) => void }) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {options.map(o => (
          <button
            key={o.value} type="button" onClick={() => onChange(o.value)}
            style={{
              padding: '10px 18px', fontSize: pt.base, fontFamily: pt.sans,
              cursor: 'pointer', fontWeight: 500, flex: 'none',
              border: value === o.value ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.3)',
              background: value === o.value ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
              color: value === o.value ? '#C9A84C' : '#9A9590',
              transition: 'all 0.15s',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Cuestionario table ────────────────────────────────────────────────────────

function toxicidadColor(nivel: string | undefined): string {
  if (!nivel) return '#9A9590'
  const n = nivel.toLowerCase()
  if (n.includes('crít') || n.includes('crit')) return '#ff6b6b'
  if (n.includes('moder')) return '#C9A84C'
  if (n.includes('bajo')) return '#6fbf6f'
  return '#9A9590'
}

function CuestionarioTable({ cuestionarios, es }: { cuestionarios: CuestionarioSintoma[]; es: boolean }) {
  if (cuestionarios.length === 0) {
    return (
      <p style={{ fontSize: pt.sm, color: '#6A6560', margin: '12px 0 0', fontFamily: pt.sans }}>
        {es ? 'Sin cuestionarios registrados.' : 'No questionnaires on record.'}
      </p>
    )
  }

  const cols = [
    { key: 'fecha',    label: es ? 'Fecha'           : 'Date'            },
    { key: 'total',    label: 'Total'                                     },
    { key: 'nivel',    label: es ? 'Toxicidad'        : 'Toxicity'        },
    { key: 'sistema',  label: es ? 'Sist. Prioritario' : 'Priority System' },
    { key: 'secundario', label: es ? 'Sist. Secundario' : 'Secondary System' },
    { key: 'protocolo', label: es ? 'Protocolo'       : 'Protocol'        },
  ]

  return (
    <div style={{ overflowX: 'auto', marginTop: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: pt.sm }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.25)' }}>
            {cols.map(col => (
              <th key={col.key} style={{
                textAlign: 'left', padding: '8px 12px', whiteSpace: 'nowrap',
                fontSize: pt.xs, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A84C',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cuestionarios.map((q, i) => {
            const f = q.fields
            const nivel = f['Nivel de toxicidad'] as string | undefined
            return (
              <tr
                key={q.id}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                }}
              >
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#FAFAF8' }}>
                  {q.createdTime
                    ? new Intl.DateTimeFormat(es ? 'es-MX' : 'en-US', { dateStyle: 'medium', timeZone: 'America/Los_Angeles' }).format(new Date(q.createdTime))
                    : '—'}
                </td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#9A9590' }}>
                  {f['TOTAL GENERAL'] != null ? String(f['TOTAL GENERAL']) : '—'}
                </td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: toxicidadColor(nivel), fontWeight: 500 }}>
                  {nivel ?? '—'}
                </td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#9A9590' }}>
                  {(f['Sistema Prioritarios'] as string | undefined) ?? '—'}
                </td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#9A9590' }}>
                  {(f['Sistema Secundario'] as string | undefined) ?? '—'}
                </td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#9A9590' }}>
                  {(f['Rec. de Protocolo'] as string | undefined) ?? '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Patient info banner (expandable) ─────────────────────────────────────────

function fmt(val: unknown): string {
  if (val == null) return '—'
  if (typeof val === 'boolean') return val ? 'Sí' : 'No'
  if (Array.isArray(val)) return val.join(', ') || '—'
  const s = String(val).trim()
  return s || '—'
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: pt.xs, color: '#6A6560', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: pt.sans, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: pt.base, color: '#FAFAF8' }}>{value}</div>
    </div>
  )
}

function ConsultaHistoryTable({
  consultations,
  weightUnit,
  es,
}: {
  consultations: Consulta[]
  weightUnit: 'kg' | 'lbs'
  es: boolean
}) {
  if (consultations.length === 0) {
    return (
      <p style={{ fontSize: pt.sm, color: '#6A6560', margin: '12px 0 0', fontFamily: pt.sans }}>
        {es ? 'Sin consultas registradas.' : 'No consultations on record.'}
      </p>
    )
  }

  const u = weightUnit
  const toDisplay = (kg: number) => u === 'lbs' ? kg * 2.20462 : kg

  const cols = [
    { key: 'fecha',    label: es ? 'Fecha'    : 'Date'    },
    { key: 'tipo',     label: es ? 'Tipo'     : 'Type'    },
    { key: 'peso',     label: `Peso (${u})`               },
    { key: 'dif',      label: `Dif. (${u})`               },
    { key: 'grasa',    label: '% Grasa'                   },
    { key: 'cintura',  label: es ? 'Cintura'  : 'Waist'   },
    { key: 'cadera',   label: es ? 'Cadera'   : 'Hips'    },
    { key: 'cumplim',  label: es ? 'Dieta'    : 'Diet'    },
    { key: 'sentirse', label: es ? 'Sentirse' : 'Feeling' },
  ]

  function getCell(c: Consulta, i: number, key: string): string {
    const f = c.fields
    switch (key) {
      case 'fecha':    return fmt(f['Fecha Consulta'])
      case 'tipo':     return fmt(f['Tipo de Consulta'])
      case 'peso': {
        const kg = f['Peso (kg)']
        return kg != null ? toDisplay(Number(kg)).toFixed(1) : '—'
      }
      case 'dif': {
        const curr = f['Peso (kg)']
        const prev = consultations[i + 1]?.fields['Peso (kg)']
        if (curr == null || prev == null) return '—'
        const d = toDisplay(Number(curr) - Number(prev))
        return `${d > 0 ? '+' : ''}${d.toFixed(1)}`
      }
      case 'grasa':    return f['% Grasa Corporal'] != null ? `${Number(f['% Grasa Corporal']).toFixed(1)}%` : '—'
      case 'cintura':  return f['Cintura (cm)'] != null ? `${f['Cintura (cm)']}` : '—'
      case 'cadera':   return f['Cadera (cm)'] != null ? `${f['Cadera (cm)']}` : '—'
      case 'cumplim':  return f['Cumplimiento Dieta (1-10)'] != null ? `${f['Cumplimiento Dieta (1-10)']}/10` : '—'
      case 'sentirse': return f['Cómo Se Siente (1-10)'] != null ? `${f['Cómo Se Siente (1-10)']}/10` : '—'
      default:         return '—'
    }
  }

  return (
    <div style={{ overflowX: 'auto', marginTop: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: pt.sm }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.25)' }}>
            {cols.map(col => (
              <th key={col.key} style={{
                textAlign: 'left', padding: '8px 12px', whiteSpace: 'nowrap',
                fontSize: pt.xs, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A84C',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {consultations.map((c, i) => (
            <tr
              key={c.id}
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
              }}
              onClick={() => window.open(`/dashboard/consultas/${c.id}`, '_blank', 'noopener,noreferrer')}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)')}
            >
              {cols.map(col => (
                <td key={col.key} style={{
                  padding: '10px 12px', whiteSpace: 'nowrap',
                  color: col.key === 'fecha' ? '#FAFAF8' : col.key === 'dif'
                    ? (getCell(c, i, 'dif').startsWith('+') ? '#ff6b6b' : getCell(c, i, 'dif') === '—' ? '#6A6560' : '#6fbf6f')
                    : '#9A9590',
                }}>
                  {getCell(c, i, col.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PatientBanner({
  patient,
  consultations = [],
  loadingConsultas,
  cuestionarios = [],
  loadingCuestionarios,
  es,
}: {
  patient: Cliente
  consultations: Consulta[]
  loadingConsultas: boolean
  cuestionarios: CuestionarioSintoma[]
  loadingCuestionarios: boolean
  es: boolean
}) {
  const nombre     = patient.fields['Nombre Completo'] ?? '—'
  const idCliente  = patient.fields['ID Cliente']
  const edad       = typeof patient.fields['Edad'] === 'number' ? patient.fields['Edad'] : null
  const unidad     = patient.fields['Unidad de Peso'] ?? 'Lbs'
  const pesoMeta   = patient.fields['Peso Meta (con unidad)'] ?? patient.fields['Peso Meta']
  const idioma     = patient.fields['Idioma Preferido']
  const email      = patient.fields['Email']
  const telefono   = patient.fields['Teléfono']
  const estaturaCm = typeof patient.fields['Estatura (cm)'] === 'number' ? patient.fields['Estatura (cm)'] as number : null
  const proximaCita = patient.fields['Próxima Cita']

  const [expanded, setExpanded]         = useState(false)
  const [estaturaUnit, setEstaturaUnit] = useState<'ft-in' | 'cm'>('ft-in')
  const [weightUnit,   setWeightUnit]   = useState<'kg' | 'lbs'>('kg')

  const estaturaDisplay = estaturaCm
    ? estaturaUnit === 'cm'
      ? `${estaturaCm} cm`
      : (() => {
          const totalIn = estaturaCm / 2.54
          return `${Math.floor(totalIn / 12)}'${Math.round(totalIn % 12)}"`
        })()
    : null

  const toWu = (kg: number) => weightUnit === 'lbs' ? kg * 2.20462 : kg

  const latestConsulta = consultations[0]
  const latestPesoKg   = latestConsulta?.fields['Peso (kg)']
  const prevPesoKg     = consultations[1]?.fields['Peso (kg)']
  const weightDiffKg   = latestPesoKg != null && prevPesoKg != null
    ? Number(latestPesoKg) - Number(prevPesoKg)
    : null

  return (
    <div style={{
      border: '1px solid rgba(201,168,76,0.35)', background: 'rgba(201,168,76,0.04)',
      marginBottom: 32, overflow: 'hidden',
    }}>
      {/* Collapsed header — always visible; div instead of button to allow nested buttons */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(v => !v)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(v => !v) } }}
        style={{
          width: '100%', cursor: 'pointer',
          padding: '20px 28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: pt.xs, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.2em', fontFamily: pt.sans, marginBottom: 6 }}>
            {es ? 'Paciente' : 'Patient'}
          </div>
          <div style={{ fontFamily: pt.serif, fontSize: 22, color: '#FAFAF8', marginBottom: 4 }}>{nombre}</div>
          <div style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans }}>
            {[
              idCliente ? `ID ${idCliente}` : null,
              edad ? `${edad} ${es ? 'años' : 'yrs'}` : null,
              latestPesoKg != null ? `${toWu(Number(latestPesoKg)).toFixed(1)} ${weightUnit}` : null,
            ].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {weightDiffKg != null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: pt.xs, color: '#6A6560', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: pt.sans, marginBottom: 3 }}>
                {es ? 'Último cambio' : 'Last change'}
              </div>
              <div style={{ fontSize: pt.base, color: weightDiffKg > 0 ? '#ff6b6b' : '#6fbf6f', fontFamily: pt.sans, fontWeight: 500 }}>
                {weightDiffKg > 0 ? '+' : ''}{toWu(weightDiffKg).toFixed(1)} {weightUnit}
              </div>
            </div>
          )}
          {/* kg / lbs toggle — stopPropagation so it doesn't collapse/expand the banner */}
          <div
            style={{ display: 'flex', gap: 3 }}
            onClick={e => e.stopPropagation()}
          >
            {(['kg', 'lbs'] as const).map(u => (
              <button
                key={u} type="button"
                onClick={() => setWeightUnit(u)}
                style={{
                  padding: '3px 9px', fontSize: pt.xs, fontFamily: pt.sans, cursor: 'pointer',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  border: weightUnit === u ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.25)',
                  background: weightUnit === u ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                  color: weightUnit === u ? '#C9A84C' : '#6A6560',
                  transition: 'all 0.12s',
                }}
              >
                {u}
              </button>
            ))}
          </div>
          <div style={{ fontSize: pt.sm, color: '#6A6560', fontFamily: pt.sans }}>
            {expanded ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 28px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Patient info pills */}
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', paddingTop: 20, marginBottom: 24 }}>
            {estaturaDisplay && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <div style={{ fontSize: pt.xs, color: '#6A6560', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: pt.sans }}>
                    {es ? 'Estatura' : 'Height'}
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {(['ft-in', 'cm'] as const).map(u => (
                      <button key={u} type="button" onClick={e => { e.stopPropagation(); setEstaturaUnit(u) }} style={{
                        padding: '1px 5px', fontSize: 9, fontFamily: pt.sans, cursor: 'pointer',
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        border: estaturaUnit === u ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.2)',
                        background: estaturaUnit === u ? 'rgba(201,168,76,0.12)' : 'transparent',
                        color: estaturaUnit === u ? '#C9A84C' : '#6A6560', transition: 'all 0.1s',
                      }}>
                        {u === 'ft-in' ? 'ft' : 'cm'}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: pt.base, color: '#FAFAF8' }}>{estaturaDisplay}</div>
              </div>
            )}
            {pesoMeta && <InfoPill label={es ? 'Peso Meta' : 'Goal Weight'} value={String(pesoMeta)} />}
            <InfoPill label={es ? 'Unidad' : 'Unit'} value={String(unidad)} />
            {idioma && <InfoPill label={es ? 'Idioma' : 'Language'} value={String(idioma)} />}
            {email && <InfoPill label="Email" value={String(email)} />}
            {telefono && <InfoPill label={es ? 'Teléfono' : 'Phone'} value={String(telefono)} />}
            {proximaCita && (
              <InfoPill
                label={es ? 'Próxima Cita' : 'Next Appt.'}
                value={new Intl.DateTimeFormat(es ? 'es-MX' : 'en-US', {
                  dateStyle: 'medium', timeZone: 'America/Los_Angeles',
                }).format(new Date(proximaCita))}
              />
            )}
            {latestConsulta && (
              <>
                {latestConsulta.fields['% Grasa Corporal'] != null && (
                  <InfoPill label="% Grasa" value={`${Number(latestConsulta.fields['% Grasa Corporal']).toFixed(1)}%`} />
                )}
                {latestConsulta.fields['IMC'] != null && (
                  <InfoPill label="IMC" value={String(latestConsulta.fields['IMC'])} />
                )}
              </>
            )}
          </div>

          {/* Consultation history */}
          <div style={{ fontSize: pt.xs, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.18em', fontFamily: pt.sans, marginBottom: 4 }}>
            {es ? 'Historial de Consultas' : 'Consultation History'}
          </div>
          <div style={{ fontSize: pt.xs, color: '#6A6560', fontFamily: pt.sans, marginBottom: 4 }}>
            {es ? 'Haz clic en una fila para ver el expediente completo en una nueva pestaña.' : 'Click a row to open the full record in a new tab.'}
          </div>
          {loadingConsultas ? (
            <p style={{ fontSize: pt.sm, color: '#6A6560', margin: '12px 0 0', fontFamily: pt.sans }}>
              {es ? 'Cargando consultas...' : 'Loading consultations...'}
            </p>
          ) : (
            <ConsultaHistoryTable
              consultations={consultations}
              weightUnit={weightUnit}
              es={es}
            />
          )}

          {/* Cuestionario Síntomas history */}
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: pt.xs, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.18em', fontFamily: pt.sans, marginBottom: 4 }}>
              {es ? 'Cuestionario de Síntomas' : 'Symptom Questionnaire'}
            </div>
            {loadingCuestionarios ? (
              <p style={{ fontSize: pt.sm, color: '#6A6560', margin: '12px 0 0', fontFamily: pt.sans }}>
                {es ? 'Cargando cuestionarios...' : 'Loading questionnaires...'}
              </p>
            ) : (
              <CuestionarioTable cuestionarios={cuestionarios} es={es} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ConsultaSubsecuenteClient({ user, patient: initialPatient, allPatients, supplementos, initialConsultations, initialCuestionarios }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const es = lang === 'es'
  const router = useRouter()

  // When no patient is pre-selected, admin picks one from the list
  const [selectedPatient, setSelectedPatient] = useState<Cliente | null>(initialPatient)
  const [patientSearch, setPatientSearch] = useState('')

  const patient = selectedPatient

  // Consultation history for the banner
  const [consultasData, setConsultasData] = useState<Consulta[]>(initialConsultations ?? [])
  const [consultasPending, startConsultasTransition] = useTransition()

  // Cuestionario data for the banner
  const [cuestionariosData, setCuestionariosData] = useState<CuestionarioSintoma[]>(initialCuestionarios ?? [])
  const [cuestionariosPending, startCuestionariosTransition] = useTransition()

  // Weight unit toggle
  const [pesoUnit,  setPesoUnit]  = useState<'kg' | 'lbs'>('kg')
  const [pesoValue, setPesoValue] = useState('')

  function handlePesoUnitChange(newUnit: 'kg' | 'lbs') {
    if (newUnit === pesoUnit) return
    const v = parseFloat(pesoValue)
    if (!isNaN(v) && pesoValue !== '') {
      const converted = newUnit === 'lbs' ? v / 0.453592 : v * 0.453592
      setPesoValue(converted.toFixed(1))
    }
    setPesoUnit(newUnit)
  }

  // Form state
  const [tipoConsulta,    setTipoConsulta]    = useState<string | null>(null)
  const [nivelEnergia,    setNivelEnergia]    = useState<string | null>(null)
  const [calidadSueno,    setCalidadSueno]    = useState<string | null>(null)
  const [metodoPago,      setMetodoPago]      = useState<string | null>(null)
  const [ansiedad,        setAnsiedad]        = useState<string | null>(null)
  const [tuvoHambre,      setTuvoHambre]      = useState<string | null>(null)
  const [cumplimiento,    setCumplimiento]    = useState<number | null>(null)
  const [comoSeSiente,    setComoSeSiente]    = useState<number | null>(null)

  // Supplement cart
  const [cart, setCart]                   = useState<CartItem[]>([])
  const [cartKeySeq, setCartKeySeq]       = useState(0)
  const [consultaFee, setConsultaFee]     = useState('')
  const [suppSearch, setSuppSearch]       = useState('')

  // Shipping (only for "Suplementos + Envio")
  const [shippingOption, setShippingOption] = useState<'Small' | 'Medium' | 'Large' | 'Custom' | null>(null)
  const [shippingCustom, setShippingCustom] = useState('')

  const supplementTotal = cart.reduce((s, i) => s + i.precio, 0)
  const shippingCost =
    shippingOption === 'Small'  ? 5  :
    shippingOption === 'Medium' ? 10 :
    shippingOption === 'Large'  ? 15 :
    shippingOption === 'Custom' ? (parseFloat(shippingCustom) || 0) : 0
  const montoCobradoTotal = supplementTotal + (parseFloat(consultaFee) || 0) + shippingCost

  const [proximaCita, setProximaCita] = useState(nextWeekDatetimeLocal)
  const [showBooking, setShowBooking] = useState(false)

  const [saved,      setSaved]      = useState<{ id: string } | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [isPending,  startTransition] = useTransition()

  const [emailPending, startEmailTransition] = useTransition()
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [emailError,  setEmailError]  = useState<string | null>(null)

  // When opened from a patient's expediente, auto-redirect back after saving
  useEffect(() => {
    if (saved && initialPatient) {
      router.push(`/dashboard/${initialPatient.id}`)
    }
  }, [saved, initialPatient, router])

  // Today in YYYY-MM-DD local
  const todayISO = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD

  function handleSelectPatient(clienteId: string) {
    const p = allPatients.find(p => p.id === clienteId) ?? null
    setSelectedPatient(p)
    setConsultasData([])
    setCuestionariosData([])
    if (p) {
      const nombre = p.fields['Nombre Completo'] ?? ''
      startConsultasTransition(async () => {
        const consultas = await fetchPatientConsultations(nombre)
        setConsultasData(consultas)
      })
      startCuestionariosTransition(async () => {
        const cuestionarios = await fetchPatientCuestionarios(nombre)
        setCuestionariosData(cuestionarios)
      })
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!patient) { setError(es ? 'Selecciona un paciente.' : 'Select a patient.'); return }
    if (!tipoConsulta) { setError(es ? 'Selecciona el tipo de consulta.' : 'Select the consultation type.'); return }
    setError(null)

    const formData = new FormData(e.currentTarget)
    // Always store peso in kg regardless of which unit admin entered
    const pesoKgVal = pesoValue !== '' && !isNaN(parseFloat(pesoValue))
      ? (pesoUnit === 'lbs' ? parseFloat(pesoValue) * 0.453592 : parseFloat(pesoValue))
      : null
    if (pesoKgVal !== null) formData.set('pesoKg', String(pesoKgVal))
    else formData.delete('pesoKg')
    formData.set('clienteRecordId', patient.id)
    formData.set('tipoConsulta', tipoConsulta)
    formData.set('montoCobrado', montoCobradoTotal > 0 ? String(montoCobradoTotal) : '')
    if (ansiedad)   formData.set('ansiedad',   ansiedad)
    if (tuvoHambre) formData.set('tuvoHambre', tuvoHambre)
    if (nivelEnergia)  formData.set('nivelEnergia',       nivelEnergia)
    if (calidadSueno)  formData.set('calidadSueno',       calidadSueno)
    if (metodoPago)    formData.set('metodoPago',         metodoPago)
    if (cumplimiento !== null) formData.set('cumplimientoDieta', String(cumplimiento))
    if (comoSeSiente !== null) formData.set('comoSeSiente',      String(comoSeSiente))
    if (cart.length > 0) {
      const lines = cart.map(i => `- ${i.nombre} ($${i.precio.toFixed(2)})`).join('\n')
      formData.set('notasSuplemento', `Suplementos vendidos:\n${lines}\nTotal: $${supplementTotal.toFixed(2)}`)
    }

    startTransition(async () => {
      try {
        const result = await saveConsultaSubsecuente(formData)
        setSaved(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : (es ? 'Error al guardar.' : 'Error saving.'))
      }
    })
  }

  // ── Success state ────────────────────────────────────────────────────────────
  if (saved) {
    return (
      <DashboardShell user={user} lang={lang} setLang={setLang}>
        <div style={{ maxWidth: 560, marginTop: 40 }}>
          <div style={{
            border: '1px solid rgba(111,191,111,0.4)', background: 'rgba(111,191,111,0.06)',
            padding: '28px 32px', marginBottom: 24,
          }}>
            <div style={{ fontSize: pt.xs, color: '#6fbf6f', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: pt.sans, marginBottom: 8 }}>
              {es ? 'Consulta registrada' : 'Consultation recorded'}
            </div>
            <div style={{ fontFamily: pt.serif, fontSize: 22, color: '#FAFAF8', marginBottom: 6 }}>
              {patient?.fields['Nombre Completo']}
            </div>
            <div style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans }}>
              {es ? 'La consulta subsecuente fue guardada exitosamente en Airtable.' : 'The follow-up consultation was saved successfully to Airtable.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => { setSaved(null); setSelectedPatient(initialPatient) }}
              style={{
                background: '#C9A84C', color: '#0A0A0A', border: 'none',
                padding: '12px 24px', fontSize: pt.sm, letterSpacing: '0.14em',
                textTransform: 'uppercase', fontFamily: pt.sans, fontWeight: 500, cursor: 'pointer',
              }}
            >
              {es ? '+ Nueva consulta' : '+ New consultation'}
            </button>
            {patient && (
              <button
                onClick={() => router.push(`/dashboard/${patient.id}`)}
                style={{
                  background: 'none', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.5)',
                  padding: '12px 24px', fontSize: pt.sm, letterSpacing: '0.14em',
                  textTransform: 'uppercase', fontFamily: pt.sans, fontWeight: 500, cursor: 'pointer',
                }}
              >
                {es ? 'Ver expediente →' : 'View record →'}
              </button>
            )}
          </div>
        </div>
      </DashboardShell>
    )
  }

  // ── Filtered patient list for selector ────────────────────────────────────────
  const filteredPatients = patientSearch.trim()
    ? allPatients.filter(p =>
        (p.fields['Nombre Completo'] ?? '').toLowerCase().includes(patientSearch.toLowerCase()) ||
        String(p.fields['ID Cliente'] ?? '').includes(patientSearch)
      )
    : allPatients

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 8, marginTop: 8 }}>
        {es ? 'Consulta Subsecuente' : 'Follow-up Consultation'}
      </h1>
      <p style={{ fontSize: pt.base, color: '#6A6560', marginBottom: 32, marginTop: 0 }}>
        {es ? 'Registra el seguimiento de un paciente.' : 'Record a follow-up for an existing patient.'}
      </p>

      {/* Patient selector (only when not pre-filled from expediente) */}
      {!patient && (
        <div style={{ marginBottom: 32, maxWidth: 560 }}>
          <label style={labelStyle}>{es ? 'Buscar paciente' : 'Search patient'}</label>
          <input
            type="text"
            placeholder={es ? 'Nombre o ID del paciente...' : 'Patient name or ID...'}
            value={patientSearch}
            onChange={e => setPatientSearch(e.target.value)}
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          {patientSearch && (
            <div style={{
              border: '1px solid rgba(201,168,76,0.25)', background: '#111',
              maxHeight: 240, overflowY: 'auto',
            }}>
              {filteredPatients.length === 0 ? (
                <div style={{ padding: '12px 16px', fontSize: pt.sm, color: '#6A6560', fontFamily: pt.sans }}>
                  {es ? 'Sin resultados' : 'No results'}
                </div>
              ) : filteredPatients.slice(0, 10).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { handleSelectPatient(p.id); setPatientSearch('') }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '12px 16px', background: 'none',
                    border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    color: '#FAFAF8', cursor: 'pointer', fontSize: pt.base, fontFamily: pt.sans,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {p.fields['Nombre Completo']}
                  {p.fields['ID Cliente'] && (
                    <span style={{ fontSize: pt.xs, color: '#6A6560', marginLeft: 8 }}>
                      ID {p.fields['ID Cliente']}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Patient info banner */}
      {patient && (
        <PatientBanner
          patient={patient}
          consultations={consultasData}
          loadingConsultas={consultasPending}
          cuestionarios={cuestionariosData}
          loadingCuestionarios={cuestionariosPending}
          es={es}
        />
      )}

      {/* Form — only show once patient is identified */}
      {patient && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 620 }}>

          <SectionDivider label={es ? 'Tipo de Consulta' : 'Consultation Type'} />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {([
              ['Cliente Nuevo',        es ? 'Cliente Nuevo'        : 'New Client'             ],
              ['Cliente subsecuente',  es ? 'Cliente Subsecuente'  : 'Returning Client'       ],
              ['Cliente Re-Inicio',    es ? 'Cliente Re-Inicio'    : 'Re-Start Client'        ],
              ['Suplementos',          es ? 'Suplementos'          : 'Supplements'            ],
              ['Suplementos + Envio',  es ? 'Suplementos + Envío'  : 'Supplements + Shipping' ],
            ] as [string, string][]).map(([value, label]) => (
              <button
                key={value} type="button"
                onClick={() => {
                  setTipoConsulta(value)
                  const fee =
                    value === 'Cliente Nuevo'       ? '40' :
                    value === 'Cliente Re-Inicio'   ? '35' :
                    value === 'Suplementos'         ? '0'  :
                    value === 'Suplementos + Envio' ? '0'  : '30'
                  setConsultaFee(fee)
                  if (value !== 'Suplementos + Envio') {
                    setShippingOption(null)
                    setShippingCustom('')
                  }
                }}
                style={{
                  padding: '11px 20px', fontSize: pt.base, fontFamily: pt.sans, fontWeight: 500,
                  cursor: 'pointer', flex: 'none',
                  border: tipoConsulta === value ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.3)',
                  background: tipoConsulta === value ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
                  color: tipoConsulta === value ? '#C9A84C' : '#9A9590',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <SectionDivider label={es ? 'Fecha' : 'Date'} />

          <div>
            <label htmlFor="cs-fecha" style={labelStyle}>{es ? 'Fecha de Consulta' : 'Consultation Date'}</label>
            <input
              id="cs-fecha" name="fechaConsulta" type="date"
              defaultValue={todayISO} required style={{ ...inputStyle, maxWidth: 220 }}
            />
          </div>

          <SectionDivider label={es ? 'Mediciones' : 'Measurements'} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ ...labelStyle, display: 'inline', marginBottom: 0 }}>{es ? 'Peso' : 'Weight'}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['kg', 'lbs'] as const).map(unit => (
                    <button
                      key={unit} type="button"
                      onClick={() => handlePesoUnitChange(unit)}
                      style={{
                        padding: '3px 8px', fontSize: pt.xs, fontFamily: pt.sans, cursor: 'pointer',
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        border: pesoUnit === unit ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.25)',
                        background: pesoUnit === unit ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                        color: pesoUnit === unit ? '#C9A84C' : '#9A9590',
                        transition: 'all 0.12s',
                      }}
                    >
                      {unit.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="cs-peso" name="pesoKg" type="number" step="0.1" min="0"
                value={pesoValue}
                onChange={e => setPesoValue(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="cs-grasa" style={labelStyle}>% {es ? 'Grasa Corporal' : 'Body Fat'}</label>
              <input id="cs-grasa" name="grasaCorporal" type="number" step="0.1" min="0" max="100" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[
              { id: 'cs-cintura', name: 'cintura',  label: es ? 'Cintura (cm)' : 'Waist (cm)'  },
              { id: 'cs-cadera',  name: 'cadera',   label: es ? 'Cadera (cm)'  : 'Hips (cm)'   },
              { id: 'cs-brazos',  name: 'brazos',   label: es ? 'Brazos (cm)'  : 'Arms (cm)'   },
              { id: 'cs-muslos',  name: 'muslos',   label: es ? 'Muslos (cm)'  : 'Thighs (cm)' },
              { id: 'cs-pecho',   name: 'pecho',    label: es ? 'Pecho/Busto (cm)' : 'Chest/Bust (cm)' },
            ].map(f => (
              <div key={f.name}>
                <label htmlFor={f.id} style={labelStyle}>{f.label}</label>
                <input id={f.id} name={f.name} type="number" step="0.1" min="0" style={inputStyle} />
              </div>
            ))}
          </div>

          <SectionDivider label={es ? 'Bienestar' : 'Wellness'} />

          <ScoreInput
            label={es ? 'Cumplimiento de Dieta (1-10)' : 'Diet Compliance (1-10)'}
            value={cumplimiento} onChange={setCumplimiento}
          />
          <ScoreInput
            label={es ? 'Cómo Se Siente (1-10)' : 'How They Feel (1-10)'}
            value={comoSeSiente} onChange={setComoSeSiente}
          />

          <ToggleGroup
            label={es ? 'Nivel de Energía' : 'Energy Level'}
            options={[
              { value: 'Excelente', label: es ? 'Excelente' : 'Excellent' },
              { value: 'Bueno',     label: es ? 'Bueno'     : 'Good'      },
              { value: 'Regular',   label: es ? 'Regular'   : 'Fair'      },
              { value: 'Malo',      label: es ? 'Malo'      : 'Poor'      },
              { value: 'Muy Malo',  label: es ? 'Muy Malo'  : 'Very Poor' },
            ]}
            value={nivelEnergia}
            onChange={setNivelEnergia}
          />

          <ToggleGroup
            label={es ? 'Calidad de Sueño' : 'Sleep Quality'}
            options={[
              { value: 'Excelente', label: es ? 'Excelente' : 'Excellent' },
              { value: 'Bueno',     label: es ? 'Bueno'     : 'Good'      },
              { value: 'Regular',   label: es ? 'Regular'   : 'Fair'      },
              { value: 'Malo',      label: es ? 'Malo'      : 'Poor'      },
              { value: 'Muy Malo',  label: es ? 'Muy Malo'  : 'Very Poor' },
            ]}
            value={calidadSueno}
            onChange={setCalidadSueno}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ToggleGroup
              label={es ? '¿Ansiedad?' : 'Anxiety?'}
              options={[
                { value: 'Mucha', label: es ? 'Mucha' : 'High'  },
                { value: 'Poca',  label: es ? 'Poca'  : 'Some'  },
                { value: 'Nada',  label: es ? 'Nada'  : 'None'  },
              ]}
              value={ansiedad}
              onChange={setAnsiedad}
            />
            <ToggleGroup
              label={es ? '¿Tuvo Hambre?' : 'Felt Hungry?'}
              options={[
                { value: 'Mucha',     label: es ? 'Mucha'     : 'Very hungry'    },
                { value: 'Manejable', label: es ? 'Manejable' : 'Manageable'     },
                { value: 'Poca',      label: es ? 'Poca'      : 'A little'       },
                { value: 'Nada',      label: es ? 'Nada'      : 'Not at all'     },
              ]}
              value={tuvoHambre}
              onChange={setTuvoHambre}
            />
          </div>

          <SectionDivider label={es ? 'Suplementos' : 'Supplements'} />

          {/* Supplement search + grouped picker */}
          {supplementos.length === 0 ? (
            <p style={{ fontSize: pt.sm, color: '#6A6560', margin: 0, fontFamily: pt.sans }}>
              {es ? 'No hay suplementos activos registrados.' : 'No active supplements found.'}
            </p>
          ) : (() => {
            const q = suppSearch.toLowerCase()
            const filtered = q
              ? supplementos.filter(s => String(s.fields['Nombre'] ?? '').toLowerCase().includes(q))
              : supplementos

            // Group by category, preserving sort order within each group
            const groups = new Map<string, typeof supplementos>()
            for (const s of filtered) {
              const cat = String(s.fields['Categoría'] ?? '').trim() || 'Sin Categoría'
              if (!groups.has(cat)) groups.set(cat, [])
              groups.get(cat)!.push(s)
            }
            // Sort: specific system categories first (alphabetical), then Suplemento, then Sin Categoría
            const sortedGroups = [...groups.entries()].sort(([a], [b]) => {
              const rank = (c: string) => c === 'Sin Categoría' ? 2 : c === 'Suplemento' ? 1 : 0
              return rank(a) - rank(b) || a.localeCompare(b)
            })

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <input
                  type="text"
                  placeholder={es ? 'Buscar suplemento...' : 'Search supplement...'}
                  value={suppSearch}
                  onChange={e => setSuppSearch(e.target.value)}
                  style={{ ...inputStyle, maxWidth: 340 }}
                />
                {filtered.length === 0 ? (
                  <p style={{ fontSize: pt.sm, color: '#6A6560', margin: 0, fontFamily: pt.sans }}>
                    {es ? 'Sin resultados.' : 'No results.'}
                  </p>
                ) : sortedGroups.map(([cat, items]) => (
                  <div key={cat}>
                    <div style={{
                      fontSize: pt.xs, color: '#6A6560', letterSpacing: '0.14em',
                      textTransform: 'uppercase', fontFamily: pt.sans, marginBottom: 8,
                    }}>
                      {cat}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {items.map(s => {
                        const nombre = String(s.fields['Nombre'] ?? '')
                        const precio = s.fields['Precio de Venta ($)'] ?? 0
                        return (
                          <button
                            key={s.id} type="button"
                            onClick={() => {
                              const key = cartKeySeq
                              setCartKeySeq(k => k + 1)
                              setCart(prev => [...prev, { key, id: s.id, nombre, precio }])
                            }}
                            style={{
                              padding: '7px 12px', fontSize: pt.sm, fontFamily: pt.sans,
                              cursor: 'pointer', border: '1px solid rgba(201,168,76,0.3)',
                              background: 'rgba(255,255,255,0.04)', color: '#FAFAF8',
                              transition: 'all 0.12s', textAlign: 'left',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#C9A84C'; e.currentTarget.style.background = 'rgba(201,168,76,0.08)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                          >
                            <span style={{ display: 'block', fontWeight: 500 }}>{nombre}</span>
                            <span style={{ fontSize: pt.xs, color: '#C9A84C' }}>${precio.toFixed(2)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Cart */}
          {cart.length > 0 && (
            <div style={{ border: '1px solid rgba(201,168,76,0.2)', overflow: 'hidden' }}>
              {cart.map(item => (
                <div key={item.key} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  <span style={{ fontSize: pt.sm, color: '#FAFAF8', fontFamily: pt.sans }}>{item.nombre}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: pt.sm, color: '#C9A84C', fontFamily: pt.sans, minWidth: 60, textAlign: 'right' }}>
                      ${item.precio.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCart(prev => prev.filter(i => i.key !== item.key))}
                      style={{
                        background: 'none', border: 'none', color: '#6A6560',
                        cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 16px', background: 'rgba(201,168,76,0.06)',
              }}>
                <span style={{ fontSize: pt.xs, color: '#9A9590', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: pt.sans }}>
                  {es ? 'Subtotal suplementos' : 'Supplements subtotal'}
                </span>
                <span style={{ fontSize: pt.base, color: '#C9A84C', fontFamily: pt.sans, fontWeight: 500 }}>
                  ${supplementTotal.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <SectionDivider label={es ? 'Notas y Pago' : 'Notes & Payment'} />

          <div>
            <label htmlFor="cs-recomendaciones" style={labelStyle}>
              {es ? 'Recomendaciones al Cliente' : 'Client Recommendations'}
            </label>
            <textarea
              id="cs-recomendaciones" name="recomendaciones"
              rows={4}
              placeholder={es ? 'Instrucciones, observaciones, plan de dieta...' : 'Instructions, observations, diet plan...'}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 100, display: 'block' }}
            />
          </div>

          <div>
            <label htmlFor="cs-proxima" style={labelStyle}>{es ? 'Próxima Cita' : 'Next Appointment'}</label>
            <input
              id="cs-proxima" name="proximaCita" type="datetime-local"
              value={proximaCita}
              onChange={e => setProximaCita(e.target.value)}
              style={{ ...inputStyle, maxWidth: 280 }}
            />
          </div>

          {/* Payment breakdown */}
          <div style={{ border: '1px solid rgba(201,168,76,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="cs-fee" style={{ ...labelStyle, margin: 0 }}>
                {es ? 'Cargo de Consulta ($)' : 'Consultation Fee ($)'}
              </label>
              <input
                id="cs-fee"
                type="number" step="0.01" min="0" placeholder="0.00"
                value={consultaFee}
                onChange={e => setConsultaFee(e.target.value)}
                style={{ ...inputStyle, width: 120, textAlign: 'right' }}
              />
            </div>
            {cart.length > 0 && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans }}>
                  {es ? 'Suplementos' : 'Supplements'}
                </span>
                <span style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans }}>${supplementTotal.toFixed(2)}</span>
              </div>
            )}
            {tipoConsulta === 'Suplementos + Envio' && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans, display: 'block', marginBottom: 10 }}>
                  {es ? 'Costo de Envío' : 'Shipping Cost'}
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {([
                    ['Small',  es ? 'Chico'                 : 'Small',  5   ],
                    ['Medium', es ? 'Mediano'               : 'Medium', 10  ],
                    ['Large',  es ? 'Grande'                : 'Large',  15  ],
                    ['Custom', es ? 'Cantidad Personalizada': 'Custom Amt.', null],
                  ] as [string, string, number | null][]).map(([opt, label, price]) => (
                    <button
                      key={opt} type="button"
                      onClick={() => { setShippingOption(opt as 'Small' | 'Medium' | 'Large' | 'Custom'); if (opt !== 'Custom') setShippingCustom('') }}
                      style={{
                        padding: '8px 14px', fontSize: pt.sm, fontFamily: pt.sans, fontWeight: 500,
                        cursor: 'pointer',
                        border: shippingOption === opt ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.3)',
                        background: shippingOption === opt ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
                        color: shippingOption === opt ? '#C9A84C' : '#9A9590',
                        transition: 'all 0.15s',
                      }}
                    >
                      {label}{price !== null ? ` — $${price}` : ''}
                    </button>
                  ))}
                </div>
                {shippingOption === 'Custom' && (
                  <input
                    type="number" step="0.01" min="0"
                    placeholder="0.00"
                    value={shippingCustom}
                    onChange={e => setShippingCustom(e.target.value)}
                    style={{ ...inputStyle, width: 140, textAlign: 'right', marginTop: 10 }}
                  />
                )}
                {shippingOption && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <span style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans }}>
                      ${shippingCost.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
            <div style={{ padding: '14px 16px', background: 'rgba(201,168,76,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: pt.sm, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: pt.sans, fontWeight: 500 }}>
                {es ? 'Monto Cobrado' : 'Total Charged'}
              </span>
              <span style={{ fontSize: pt.lg, color: '#C9A84C', fontFamily: pt.serif }}>
                ${montoCobradoTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Book next appointment via Square */}
          <div>
            <button
              type="button"
              onClick={() => setShowBooking(v => !v)}
              style={{
                background: showBooking ? 'rgba(201,168,76,0.1)' : 'none',
                color: '#C9A84C',
                border: '1px solid rgba(201,168,76,0.4)',
                padding: '10px 20px',
                fontSize: pt.sm,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontFamily: pt.sans,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {showBooking
                ? (es ? '✕ Cerrar agenda' : '✕ Close booking')
                : (es ? '+ Agendar en Square' : '+ Book in Square')}
            </button>

            {showBooking && patient && (
              <div style={{ marginTop: 16, border: '1px solid rgba(201,168,76,0.15)', padding: '20px 24px' }}>
                <BookingWidget
                  clienteId={patient.id}
                  nombre={String(patient.fields['Nombre Completo'] ?? '')}
                  email={String(patient.fields['Email'] ?? '')}
                  telefono={patient.fields['Teléfono'] ? String(patient.fields['Teléfono']) : undefined}
                  allowedServices={ADMIN_SERVICES}
                  isAdmin
                  lang={es ? 'es' : 'en'}
                  onBooked={(startAt) => {
                    setProximaCita(utcToPtDatetimeLocal(startAt))
                    setShowBooking(false)
                  }}
                />
              </div>
            )}
          </div>

          <ToggleGroup
            label={es ? 'Método de Pago' : 'Payment Method'}
            options={[
              { value: 'Efectivo',      label: 'Efectivo'      },
              { value: 'Card',          label: 'Card'          },
              { value: 'Venmo',         label: 'Venmo'         },
              { value: 'Zelle',         label: 'Zelle'         },
              { value: 'Transferencia', label: 'Transferencia' },
            ]}
            value={metodoPago}
            onChange={setMetodoPago}
          />

          <SectionDivider label={es ? 'Email de Re-Inicio' : 'Re-Start Email'} />

          <div>
            <p style={{ fontSize: pt.sm, color: '#9A9590', margin: '0 0 12px', fontFamily: pt.sans, lineHeight: 1.6 }}>
              {es
                ? 'Envía un correo de bienvenida de regreso con enlace para agendar cita y cuestionario de síntomas.'
                : 'Send a welcome-back email with a booking link and symptom questionnaire.'}
            </p>

            {emailStatus === 'sent' && (
              <div style={{
                padding: '10px 14px', background: 'rgba(111,191,111,0.08)',
                border: '1px solid rgba(111,191,111,0.35)', marginBottom: 12,
                fontSize: pt.sm, color: '#6fbf6f', fontFamily: pt.sans,
              }}>
                {es ? `Email enviado a ${patient?.fields['Email'] ?? ''}.` : `Email sent to ${patient?.fields['Email'] ?? ''}.`}
              </div>
            )}
            {emailStatus === 'error' && emailError && (
              <p style={{ fontSize: pt.sm, color: '#ff6b6b', margin: '0 0 12px' }}>{emailError}</p>
            )}

            <button
              type="button"
              disabled={emailPending || emailStatus === 'sent'}
              onClick={() => {
                if (!patient) return
                setEmailStatus('idle')
                setEmailError(null)
                startEmailTransition(async () => {
                  try {
                    await sendReinitiationEmail(patient.id)
                    setEmailStatus('sent')
                  } catch (err) {
                    setEmailStatus('error')
                    setEmailError(err instanceof Error ? err.message : (es ? 'Error al enviar.' : 'Error sending.'))
                  }
                })
              }}
              style={{
                background: 'none',
                color: emailStatus === 'sent' ? '#6fbf6f' : '#C9A84C',
                border: `1px solid ${emailStatus === 'sent' ? 'rgba(111,191,111,0.4)' : 'rgba(201,168,76,0.4)'}`,
                padding: '10px 20px', fontSize: pt.sm,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                fontFamily: pt.sans, fontWeight: 500,
                cursor: (emailPending || emailStatus === 'sent') ? 'not-allowed' : 'pointer',
                opacity: (emailPending || emailStatus === 'sent') ? 0.6 : 1,
              }}
            >
              {emailPending
                ? (es ? 'Enviando...' : 'Sending...')
                : emailStatus === 'sent'
                  ? (es ? '✓ Email enviado' : '✓ Email sent')
                  : (es ? 'Enviar Email de Re-Inicio' : 'Send Re-Start Email')}
            </button>
          </div>

          {error && <p style={{ fontSize: pt.sm, color: '#ff6b6b', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              type="submit" disabled={isPending}
              style={{
                background: isPending ? 'rgba(201,168,76,0.4)' : '#C9A84C',
                color: '#0A0A0A', border: 'none',
                padding: '14px 32px', fontSize: pt.sm,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                fontFamily: pt.sans, cursor: isPending ? 'not-allowed' : 'pointer', fontWeight: 500,
              }}
            >
              {isPending
                ? (es ? 'Guardando...' : 'Saving...')
                : (es ? 'Guardar Consulta' : 'Save Consultation')}
            </button>
            {patient && (
              <button
                type="button"
                onClick={() => router.push(`/dashboard/${patient.id}`)}
                style={{
                  background: 'none', color: '#9A9590',
                  border: '1px solid rgba(255,255,255,0.12)',
                  padding: '14px 24px', fontSize: pt.sm,
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                  fontFamily: pt.sans, cursor: 'pointer',
                }}
              >
                {es ? 'Cancelar' : 'Cancel'}
              </button>
            )}
          </div>
        </form>
      )}
    </DashboardShell>
  )
}
