'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import type { Cliente, Consulta, CuestionarioSintoma } from '@/lib/airtable'
import { pt } from '@/lib/portal-type'
import { BookingWidget } from '@/app/onboarding/booking-widget'
import { ADMIN_SERVICES } from '@/app/onboarding/booking-constants'
import { sendNoShowEmail } from '@/app/dashboard/[id]/edit/actions'
import { FoodLogWidget } from '@/app/food-log-widget'

type Props = {
  patient: Cliente | null
  consultations: Consulta[]
  cuestionarios: CuestionarioSintoma[]
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

function EstaturaCard({ cm, label }: { cm: number; label: string }) {
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
          {label}
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

type TabId = 'weight' | 'measurements' | 'wellness' | 'notes' | 'cuestionario'

const TABS: { id: TabId; label: string }[] = [
  { id: 'weight',       label: 'Peso'         },
  { id: 'measurements', label: 'Medidas'       },
  { id: 'wellness',     label: 'Bienestar'     },
  { id: 'notes',        label: 'Notas'         },
  { id: 'cuestionario', label: 'Cuestionario'  },
]

function toxicidadColor(nivel: string | undefined): string {
  if (!nivel) return '#9A9590'
  const n = nivel.toLowerCase()
  if (n.includes('crít')) return '#ff6b6b'
  if (n.includes('moder')) return '#C9A84C'
  if (n.includes('bajo')) return '#6fbf6f'
  return '#9A9590'
}

function CuestionarioTab({ cuestionarios, lang }: { cuestionarios: CuestionarioSintoma[]; lang: 'es' | 'en' }) {
  if (cuestionarios.length === 0) {
    return <p style={{ color: '#6A6560', fontSize: pt.base }}>{copy[lang].noQuestionnaires}</p>
  }

  const cols = [
    { key: 'fecha',     label: 'Fecha'              },
    { key: 'total',     label: 'Total'              },
    { key: 'nivel',     label: 'Nivel de Toxicidad' },
    { key: 'sistema',   label: 'Sistema Prioritario' },
    { key: 'secundario',label: 'Sistema Secundario'  },
    { key: 'rec',       label: 'Protocolo'           },
    { key: 'obs',       label: 'Observaciones'       },
  ]

  function cell(c: CuestionarioSintoma, key: string): string {
    const f = c.fields
    switch (key) {
      case 'fecha':      return c.createdTime
        ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeZone: 'America/Los_Angeles' }).format(new Date(c.createdTime))
        : '—'
      case 'total':      return f['TOTAL GENERAL'] != null ? String(f['TOTAL GENERAL']) : '—'
      case 'nivel':      return f['Nivel de toxicidad'] ?? '—'
      case 'sistema':    return f['Sistema Prioritarios'] ?? '—'
      case 'secundario': return f['Sistema Secundario'] ?? '—'
      case 'rec':        return f['Rec. de Protocolo'] ?? '—'
      case 'obs':        return f['Observaciones'] ? String(f['Observaciones']) : '—'
      default:           return '—'
    }
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: pt.base }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.3)' }}>
            {cols.map(col => (
              <th key={col.key} style={{
                textAlign: 'left', padding: '10px 16px', whiteSpace: 'nowrap',
                fontSize: pt.xs, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A84C',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cuestionarios.map((c, i) => (
            <tr key={c.id} style={{
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
            }}>
              {cols.map(col => (
                <td key={col.key} style={{
                  padding: '12px 16px', whiteSpace: col.key === 'obs' ? 'normal' : 'nowrap',
                  maxWidth: col.key === 'obs' ? 240 : undefined,
                  color: col.key === 'nivel'
                    ? toxicidadColor(c.fields['Nivel de toxicidad'])
                    : col.key === 'fecha' ? '#FAFAF8'
                    : col.key === 'total' ? '#C9A84C'
                    : '#9A9590',
                  fontWeight: col.key === 'total' ? 600 : 400,
                }}>
                  {cell(c, col.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ConsultaTable({ consultations, columns, lang }: { consultations: Consulta[]; columns: ColDef[]; lang: 'es' | 'en' }) {
  const router = useRouter()
  if (consultations.length === 0) {
    return <p style={{ color: '#6A6560', fontSize: pt.base }}>{copy[lang].noConsultas}</p>
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <p style={{ fontSize: pt.xs, color: '#6A6560', margin: '0 0 8px', fontFamily: 'sans-serif', letterSpacing: '0.04em' }}>
        {copy[lang].clickToEdit}
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: pt.base }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.3)' }}>
            {columns.map(col => {
              const key = col.colKey ?? String(col.field)
              const label = COL_LABELS[key]?.[lang] ?? COL_LABELS[String(col.field)]?.[lang] ?? col.label ?? String(col.field)
              return (
                <th key={key} style={{
                  textAlign: 'left', padding: '10px 16px', whiteSpace: 'nowrap',
                  fontSize: pt.xs, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A84C',
                }}>
                  {label}
                </th>
              )
            })}
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

function NotesTab({ consultations, lang }: { consultations: Consulta[]; lang: 'es' | 'en' }) {
  const withNotes = consultations.filter(
    c => c.fields['Recomendaciones al Cliente'] || c.fields['Notas del Terapeuta']
  )
  if (withNotes.length === 0) {
    return <p style={{ color: '#6A6560', fontSize: pt.base }}>{copy[lang].noNotes}</p>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {withNotes.map(c => (
        <div key={c.id} style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '20px 24px',
        }}>
          <div style={{ fontSize: pt.sm, color: '#C9A84C', letterSpacing: '0.12em', marginBottom: 14 }}>
            {fmt(c.fields['Fecha Consulta'])}
          </div>
          {c.fields['Recomendaciones al Cliente'] && (
            <div style={{ marginBottom: c.fields['Notas del Terapeuta'] ? 16 : 0 }}>
              <div style={{ fontSize: pt.sm, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9590', marginBottom: 6, fontFamily: pt.sans }}>
                {copy[lang].notes.recomendaciones}
              </div>
              <p style={{ fontSize: pt.md, color: '#FAFAF8', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                {String(c.fields['Recomendaciones al Cliente'])}
              </p>
            </div>
          )}
          {c.fields['Notas del Terapeuta'] && (
            <div>
              <div style={{ fontSize: pt.sm, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9590', marginBottom: 6, fontFamily: pt.sans }}>
                {copy[lang].notes.notas}
              </div>
              <p style={{ fontSize: pt.md, color: '#FAFAF8', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                {String(c.fields['Notas del Terapeuta'])}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const copy = {
  es: {
    pageLabel:       'Expediente del Paciente',
    foodScanner:     'Escáner de Alimentos con IA',
    mealLog:         'Registro de Comidas',
    schedule:        '+ Agendar Cita',
    closeSchedule:   '✕ Cerrar',
    followUp:        '+ Consulta Subsecuente',
    editPatient:     'Editar Paciente',
    clickToEdit:     'Haz clic en una fila para editar esa consulta.',
    noConsultas:     'Sin consultas registradas.',
    noNotes:         'Sin notas registradas.',
    noQuestionnaires:'Sin cuestionarios registrados.',
    notFound:        'Paciente no encontrado.',
    patients:        'Pacientes',
    tabs: { weight: 'Peso', measurements: 'Medidas', wellness: 'Bienestar', notes: 'Notas', cuestionario: 'Cuestionario' },
    stats: { idCliente: 'ID Cliente', edad: 'Edad', estatura: 'Estatura', pesoMeta: 'Peso Meta', consultas: 'Consultas' },
    notes: { recomendaciones: 'Recomendaciones al Cliente', notas: 'Notas del Terapeuta' },
  },
  en: {
    pageLabel:       'Patient File',
    foodScanner:     'AI Food Scanner',
    mealLog:         'Meal Log',
    schedule:        '+ Schedule Appointment',
    closeSchedule:   '✕ Close',
    followUp:        '+ Follow-up Consultation',
    editPatient:     'Edit Patient',
    clickToEdit:     'Click a row to edit that consultation.',
    noConsultas:     'No consultations on record.',
    noNotes:         'No notes on record.',
    noQuestionnaires:'No questionnaires on record.',
    notFound:        'Patient not found.',
    patients:        'Patients',
    tabs: { weight: 'Weight', measurements: 'Measurements', wellness: 'Wellness', notes: 'Notes', cuestionario: 'Questionnaire' },
    stats: { idCliente: 'Client ID', edad: 'Age', estatura: 'Height', pesoMeta: 'Goal Weight', consultas: 'Consultations' },
    notes: { recomendaciones: 'Client Recommendations', notas: 'Therapist Notes' },
  },
}

// Column header translations keyed by colKey or field name
const COL_LABELS: Record<string, { es: string; en: string }> = {
  'Fecha Consulta':            { es: 'Fecha Consulta',            en: 'Date'                    },
  'peso-kg':                   { es: 'Peso (kg)',                 en: 'Weight (kg)'             },
  'peso-lbs':                  { es: 'Peso (lbs)',                en: 'Weight (lbs)'            },
  'dif-kg':                    { es: 'Dif. (kg)',                 en: 'Diff. (kg)'              },
  'dif-lbs':                   { es: 'Dif. (lbs)',                en: 'Diff. (lbs)'             },
  '% Grasa Corporal':          { es: '% Grasa Corporal',          en: '% Body Fat'              },
  'IMC':                       { es: 'IMC',                       en: 'BMI'                     },
  'Cintura (cm)':              { es: 'Cintura (cm)',              en: 'Waist (cm)'              },
  'Cadera (cm)':               { es: 'Cadera (cm)',               en: 'Hips (cm)'               },
  'Brazos (cm)':               { es: 'Brazos (cm)',               en: 'Arms (cm)'               },
  'Muslos (cm)':               { es: 'Muslos (cm)',               en: 'Thighs (cm)'             },
  'Pecho/Busto (cm)':          { es: 'Pecho/Busto (cm)',          en: 'Chest/Bust (cm)'         },
  'Cumplimiento Dieta (1-10)': { es: 'Cumplimiento Dieta (1-10)', en: 'Diet Compliance (1-10)'  },
  'Cómo Se Siente (1-10)':     { es: 'Cómo Se Siente (1-10)',     en: 'Feeling (1-10)'          },
  'Nivel de Energía':          { es: 'Nivel de Energía',          en: 'Energy Level'            },
  'Calidad de Sueño':          { es: 'Calidad de Sueño',          en: 'Sleep Quality'           },
  '¿Ansiedad?':                { es: '¿Ansiedad?',                en: 'Anxiety?'                },
  '¿Tuvo Hambre?':             { es: '¿Tuvo Hambre?',             en: 'Hunger?'                 },
}

export function PatientDetailClient({ patient, consultations, cuestionarios, error, isAdmin }: Props) {
  const router = useRouter()
  const [lang, setLang]           = useState<'es' | 'en'>('es')
  const [activeTab, setActiveTab] = useState<TabId>('weight')
  const [showBooking, setShowBooking] = useState(false)
  const [noShowPending, startNoShowTransition] = useTransition()
  const [noShowStatus, setNoShowStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [noShowError, setNoShowError]   = useState<string | null>(null)

  const t = copy[lang]

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
              ← {t.patients}
            </button>
          )}
          <div style={{ display: 'flex', gap: 2 }}>
            {(['es', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                padding: '4px 8px', fontSize: 10, fontFamily: pt.sans, cursor: 'pointer',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                border: lang === l ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.25)',
                background: lang === l ? 'rgba(201,168,76,0.12)' : 'transparent',
                color: lang === l ? '#C9A84C' : '#6A6560', transition: 'all 0.15s',
              }}>
                {l}
              </button>
            ))}
          </div>
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
                {t.pageLabel}
              </p>
              <h1 style={{ fontFamily: pt.serif, fontSize: pt.hero, fontWeight: 400, margin: '0 0 24px' }}>
                {fmt(patient.fields['Nombre Completo'])}
              </h1>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <StatCard label={t.stats.idCliente} value={fmt(patient.fields['ID Cliente'])} />
                <StatCard label={t.stats.edad} value={fmt(patient.fields['Edad'])} />
                {typeof patient.fields['Estatura (cm)'] === 'number' && (
                  <EstaturaCard cm={patient.fields['Estatura (cm)'] as number} label={t.stats.estatura} />
                )}
                <StatCard label={t.stats.pesoMeta} value={fmt(patient.fields['Peso Meta (con unidad)'])} highlight />
                <StatCard label={t.stats.consultas} value={String(consultations.length)} />
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
                      {t.followUp}
                    </Link>
                    <Link href={`/dashboard/${patient.id}/edit`} style={{
                      background: 'none', color: '#C9A84C',
                      border: '1px solid rgba(201,168,76,0.5)',
                      padding: '12px 24px', fontSize: pt.sm, letterSpacing: '0.14em',
                      textTransform: 'uppercase', fontFamily: pt.sans, fontWeight: 500,
                      textDecoration: 'none', display: 'inline-block',
                    }}>
                      {t.editPatient}
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
                  {showBooking ? t.closeSchedule : t.schedule}
                </button>
                {!isAdmin && (
                  <Link href="/food-scanner" style={{
                    background: 'none', color: '#C9A84C',
                    border: '1px solid rgba(201,168,76,0.5)',
                    padding: '12px 24px', fontSize: pt.sm, letterSpacing: '0.14em',
                    textTransform: 'uppercase', fontFamily: pt.sans, fontWeight: 500,
                    textDecoration: 'none', display: 'inline-block',
                  }}>
                    {t.foodScanner}
                  </Link>
                )}
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
                    lang={lang}
                    onBooked={() => setShowBooking(false)}
                  />
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 32 }}>
              {TABS.map(tab => (
                <button key={tab.id} style={tabBtn(tab.id)} onClick={() => setActiveTab(tab.id)}>
                  {t.tabs[tab.id]}
                </button>
              ))}
            </div>

            {activeTab === 'weight' && <ConsultaTable consultations={consultations} columns={WEIGHT_COLS} lang={lang} />}
            {activeTab === 'measurements' && <ConsultaTable consultations={consultations} columns={MEASUREMENTS_COLS} lang={lang} />}
            {activeTab === 'wellness' && <ConsultaTable consultations={consultations} columns={WELLNESS_COLS} lang={lang} />}
            {activeTab === 'notes' && <NotesTab consultations={consultations} lang={lang} />}
            {activeTab === 'cuestionario' && <CuestionarioTab cuestionarios={cuestionarios} lang={lang} />}

            {!isAdmin && (
              <div style={{ marginTop: 56 }}>
                <h2 style={{ fontFamily: pt.serif, fontSize: 24, fontWeight: 400, marginBottom: 16, color: '#FAFAF8' }}>
                  {t.mealLog}
                </h2>
                <FoodLogWidget />
              </div>
            )}
          </>
        )}

        {!patient && !error && (
          <p style={{ color: '#6A6560', fontSize: pt.base }}>{t.notFound}</p>
        )}
      </main>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400&family=Montserrat:wght@300;400;500&display=swap" />
    </div>
  )
}
