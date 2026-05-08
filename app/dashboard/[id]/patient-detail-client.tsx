'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import type { Cliente, Consulta } from '@/lib/airtable'
import { pt } from '@/lib/portal-type'

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

const WEIGHT_FIELDS: (keyof Consulta['fields'])[] = [
  'Fecha Consulta', 'Peso (kg)', 'Diferencia vs Semana Anterior (kg)',
  '% Grasa Corporal', 'IMC',
]

const MEASUREMENTS_FIELDS: (keyof Consulta['fields'])[] = [
  'Fecha Consulta', 'Cintura (cm)', 'Cadera (cm)', 'Brazos (cm)', 'Muslos (cm)', 'Pecho/Busto (cm)',
]

const WELLNESS_FIELDS: (keyof Consulta['fields'])[] = [
  'Fecha Consulta', 'Cumplimiento Dieta (1-10)', 'Cómo Se Siente (1-10)',
  'Nivel de Energía', 'Calidad de Sueño', '¿Ansiedad?', '¿Tuvo Hambre?',
]

type TabId = 'weight' | 'measurements' | 'wellness' | 'notes'

const TABS: { id: TabId; label: string }[] = [
  { id: 'weight', label: 'Peso' },
  { id: 'measurements', label: 'Medidas' },
  { id: 'wellness', label: 'Bienestar' },
  { id: 'notes', label: 'Notas' },
]

function ConsultaTable({ consultations, fields }: { consultations: Consulta[]; fields: (keyof Consulta['fields'])[] }) {
  if (consultations.length === 0) {
    return <p style={{ color: '#6A6560', fontSize: pt.base }}>Sin consultas registradas.</p>
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: pt.base }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.3)' }}>
            {fields.map(f => (
              <th key={String(f)} style={{
                textAlign: 'left', padding: '10px 16px', whiteSpace: 'nowrap',
                fontSize: pt.xs, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A84C',
              }}>
                {String(f)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {consultations.map((c, i) => (
            <tr key={c.id} style={{
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
            }}>
              {fields.map(f => (
                <td key={String(f)} style={{
                  padding: '12px 16px', whiteSpace: 'nowrap',
                  color: f === 'Fecha Consulta' ? '#FAFAF8' : '#9A9590',
                }}>
                  {fmt(c.fields[f])}
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
                <StatCard label="Peso Meta" value={fmt(patient.fields['Peso Meta (con unidad)'])} highlight />
                <StatCard label="Consultas" value={String(consultations.length)} />
              </div>

              {isAdmin && (
                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <Link href="/dashboard/consulta-subsecuente" style={{
                    background: 'none', color: '#C9A84C',
                    border: '1px solid rgba(201,168,76,0.5)',
                    padding: '12px 24px', fontSize: pt.sm, letterSpacing: '0.14em',
                    textTransform: 'uppercase', fontFamily: pt.sans, fontWeight: 500,
                    textDecoration: 'none', display: 'inline-block',
                  }}>
                    + Consulta Subsecuente
                  </Link>
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

            {activeTab === 'weight' && <ConsultaTable consultations={consultations} fields={WEIGHT_FIELDS} />}
            {activeTab === 'measurements' && <ConsultaTable consultations={consultations} fields={MEASUREMENTS_FIELDS} />}
            {activeTab === 'wellness' && <ConsultaTable consultations={consultations} fields={WELLNESS_FIELDS} />}
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
