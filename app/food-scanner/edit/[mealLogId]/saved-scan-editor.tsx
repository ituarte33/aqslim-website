'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Snapshot = {
  mealLogId: string
  food: string
  calories: number
  carbs: number
  fats: number
  proteins: number
  notes: string
  mealType: string
  consumptionStatus: 'Unconfirmed' | 'Consumed' | 'Reference only'
  portionPercent: number
  reanalysisUsed: number
  reanalysisLimit: number
  reanalysisRemaining: number
}

export function SavedScanEditor({ mealLogId }: { mealLogId: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [correction, setCorrection] = useState('')
  const [portionPercent, setPortionPercent] = useState(100)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/food-scan/saved/${mealLogId}`, { cache: 'no-store' })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'load_failed')
        setSnapshot(data)
        setPortionPercent(data.portionPercent ?? 100)
      })
      .catch(() => setError('No pudimos abrir este escaneo guardado.'))
      .finally(() => setLoading(false))
  }, [mealLogId])

  async function recalculate() {
    if (!snapshot || saving || correction.trim().length < 3 || snapshot.reanalysisRemaining <= 0) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/food-scan/saved/${mealLogId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correction, portionPercent, language: 'es' }),
      })
      const data = await response.json()
      if (!response.ok) {
        if (data.error === 'reanalysis_limit_reached') {
          setSnapshot(current => current ? {
            ...current,
            reanalysisUsed: data.reanalysisUsed,
            reanalysisLimit: data.reanalysisLimit,
            reanalysisRemaining: data.reanalysisRemaining,
          } : current)
          setError('Ya utilizaste las 2 correcciones disponibles para este escaneo.')
          return
        }
        throw new Error(data.error || 'correction_failed')
      }
      setSnapshot(current => current ? { ...current, ...data } : data)
      setCorrection('')
    } catch {
      setError('No pudimos corregir la estimación. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main style={pageStyle}><div style={cardStyle}>Cargando escaneo…</div></main>
  if (!snapshot) return <main style={pageStyle}><div style={cardStyle}>{error ?? 'Escaneo no disponible.'}<div style={{ marginTop: 20 }}><Link href="/food-scanner" style={linkStyle}>← Regresar al escáner</Link></div></div></main>

  const correctionDisabled = snapshot.consumptionStatus !== 'Unconfirmed' || snapshot.reanalysisRemaining <= 0

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}><Link href="/food-scanner" style={linkStyle}>← Regresar al escáner</Link></div>
        <p style={{ color: '#d5b34c', letterSpacing: 1.6, textTransform: 'uppercase' }}>P5 · Clinic AI · Escaneo guardado</p>
        <h1 style={{ fontSize: 40, margin: '8px 0 18px' }}>Editar análisis</h1>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>{snapshot.food}</h2>
          <div style={{ fontSize: 42, color: '#d5b34c', marginBottom: 16 }}>{snapshot.calories} kcal</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
            <Metric label="Carbos" value={`${snapshot.carbs}g`} />
            <Metric label="Grasas" value={`${snapshot.fats}g`} />
            <Metric label="Proteína" value={`${snapshot.proteins}g`} />
          </div>
          {snapshot.notes ? <p style={{ marginTop: 18, color: '#aaa', lineHeight: 1.6 }}>{snapshot.notes}</p> : null}
        </section>

        <section style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Corregir ingredientes o porción</h2>
          <p style={{ color: '#aaa' }}>Esta corrección usa el análisis guardado y tu descripción como autoridad. No consume otro scan.</p>
          <p><strong>{snapshot.reanalysisRemaining}</strong> de {snapshot.reanalysisLimit} correcciones restantes.</p>

          <label style={{ display: 'block', marginTop: 18 }}>
            <span style={{ display: 'block', marginBottom: 8 }}>¿Qué debe corregirse?</span>
            <textarea
              value={correction}
              onChange={event => setCorrection(event.target.value)}
              placeholder="Ejemplo: agrega 50 g de chorizo; no hay papas; la porción completa tiene 3 huevos."
              disabled={correctionDisabled || saving}
              style={{ width: '100%', minHeight: 120, boxSizing: 'border-box', background: '#0d0d0d', color: '#eee', border: '1px solid #555', padding: 12 }}
            />
          </label>

          <label style={{ display: 'block', marginTop: 16 }}>
            <span style={{ marginRight: 10 }}>Porción:</span>
            <input
              type="number"
              min={10}
              max={100}
              step={5}
              value={portionPercent}
              onChange={event => setPortionPercent(Math.min(100, Math.max(10, Number(event.target.value) || 100)))}
              disabled={correctionDisabled || saving}
              style={{ width: 90, background: '#0d0d0d', color: '#eee', border: '1px solid #555', padding: 8 }}
            /> %
          </label>

          <button
            type="button"
            onClick={() => void recalculate()}
            disabled={correctionDisabled || saving || correction.trim().length < 3}
            style={{ marginTop: 20, padding: '13px 18px', background: correctionDisabled ? '#444' : '#d5b34c', color: correctionDisabled ? '#999' : '#111', border: 0, fontWeight: 700, cursor: correctionDisabled ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Recalculando…' : 'Recalcular sin usar otro scan'}
          </button>

          {snapshot.reanalysisRemaining <= 0 ? <p style={{ marginTop: 14, color: '#d5b34c' }}>Ya utilizaste las 2 correcciones disponibles para este escaneo.</p> : null}
          {snapshot.consumptionStatus !== 'Unconfirmed' ? <p style={{ marginTop: 14, color: '#d5b34c' }}>Este escaneo ya fue confirmado y ya no puede corregirse.</p> : null}
          {error ? <p style={{ marginTop: 14, color: '#e6b7b7' }}>{error}</p> : null}
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={{ border: '1px solid #444', padding: 14, textAlign: 'center' }}><div style={{ color: '#999', fontSize: 13 }}>{label}</div><div style={{ fontSize: 24 }}>{value}</div></div>
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#0b0b0b',
  color: '#eee',
  padding: '32px 20px 64px',
  fontFamily: 'system-ui, sans-serif',
}

const cardStyle: React.CSSProperties = {
  background: '#151515',
  border: '1px solid #3f3a2b',
  padding: 22,
  marginTop: 18,
}

const linkStyle: React.CSSProperties = { color: '#d5b34c', textDecoration: 'none' }
