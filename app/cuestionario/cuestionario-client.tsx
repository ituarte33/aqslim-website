'use client'

import { useState, useTransition } from 'react'
import { UserButton } from '@clerk/nextjs'
import { saveCuestionario } from './actions'

// Field IDs match CUESTIONARIO_FIELDS in lib/airtable.ts
const SECTIONS = [
  {
    title: 'Sistema Digestivo',
    items: [
      { fid: 'fldluEzmmArzfIzQz', label: 'Estreñimiento' },
      { fid: 'flddDVMWsuO72KPBR', label: 'Diarrea / Heces blandas' },
      { fid: 'fldDiOE21l40db8m1', label: 'Gases / Flatulencia' },
      { fid: 'fld1gckNyHtmsXLOb', label: 'Acidez / Reflujo' },
      { fid: 'fldAPVi83pKs6NmkO', label: 'Náusea' },
      { fid: 'fldtPuzaTx342X2wZ', label: 'Dolor abdominal' },
      { fid: 'fldjrzc05a98kv1xY', label: 'Hinchazón abdominal' },
      { fid: 'fldwkjYZ6TfvnCHwV', label: 'Colitis / IBS' },
    ],
  },
  {
    title: 'Sistema Hepático',
    items: [
      { fid: 'fld8y2aLuEjh4lIhd', label: 'Fatiga crónica' },
      { fid: 'fld0csAjXnA48fvYQ', label: 'Dolor costado derecho' },
      { fid: 'fldqVmygsnkui2Mc4', label: 'Piel / ojos amarillos' },
      { fid: 'fldv1FHnONjVR40NK', label: 'Boca amarga' },
      { fid: 'fld8zzQpy8nslUdja', label: 'Intolerancia a grasas' },
    ],
  },
  {
    title: 'Sistema Hormonal',
    items: [
      { fid: 'fldpTFVJxc7AaX3SV', label: 'Tiroides lenta' },
      { fid: 'fldoNzzgXoaLBjOTz', label: 'Sudoración excesiva' },
      { fid: 'fld99HsQQwlg8hCG4', label: 'Irregularidad menstrual' },
      { fid: 'fldXGKArf7a39xlfy', label: 'PMS / SPM' },
      { fid: 'fldCXsIsLlgtVgSZn', label: 'Aumento de peso inexplicable' },
      { fid: 'fld0xXqE8DaxzFMPP', label: 'Frío frecuente' },
    ],
  },
  {
    title: 'Sistema Nervioso',
    items: [
      { fid: 'fldUzmw1RLEJ0m3Rd', label: 'Ansiedad' },
      { fid: 'fldweQxO1yvadbt1m', label: 'Estrés' },
      { fid: 'fldL5KMuMyF6p130P', label: 'Insomnio' },
      { fid: 'fldqYUsEJHJJO27UR', label: 'Depresión / tristeza' },
      { fid: 'fldZCDJXqHHZpVG1k', label: 'Dolores de cabeza' },
      { fid: 'fldGt7WTbtRgcqRjC', label: 'Migrañas' },
      { fid: 'fldcXas3JOtA12O7p', label: 'Mareos' },
    ],
  },
  {
    title: 'Sistema Renal',
    items: [
      { fid: 'fldb7GThzY6NfDLpC', label: 'Micción frecuente' },
      { fid: 'fldhppvDFJYVqcX3I', label: 'Infecciones urinarias recurrentes' },
      { fid: 'fld9goQb0ezI5Hf8v', label: 'Ardor al orinar' },
    ],
  },
  {
    title: 'Sistema Cardiovascular',
    items: [
      { fid: 'fldU7blWhHz22B9gv', label: 'Presión alta' },
      { fid: 'fldwwOKn32UIxq4Nn', label: 'Palpitaciones' },
      { fid: 'fldqoanqQrube5sjo', label: 'Mala circulación' },
      { fid: 'fldgC0jnJd8a6ueMZ', label: 'Manos / pies fríos' },
      { fid: 'fldSoIjDCd04r0I23', label: 'Retención de líquidos / edema' },
    ],
  },
  {
    title: 'Sistema Músculo-Esquelético',
    items: [
      { fid: 'fldplCTHMJB4WciQI', label: 'Dolor de espalda' },
      { fid: 'fldZ5wCWOU0EB6dRB', label: 'Dolor articular' },
      { fid: 'fldJ1BQ8cQWuIcEnt', label: 'Dolor muscular' },
      { fid: 'fldhD7qPovwxbsrNM', label: 'Rigidez matutina' },
    ],
  },
  {
    title: 'Piel',
    items: [
      { fid: 'fldoNt3tBApOMcOkq', label: 'Acné' },
      { fid: 'fldIV9lUaiGtlzSbm', label: 'Eczema / dermatitis' },
      { fid: 'fldAel2zk1Aehwy3R', label: 'Piel reseca' },
      { fid: 'flds3bvAYn85pF4ox', label: 'Picazón / Pruritis' },
    ],
  },
  {
    title: 'Estado General',
    items: [
      { fid: 'fldksbjNbbK2dlc6E', label: 'Energía baja' },
      { fid: 'fldQVYo5LvgKeeb2U', label: 'Dificultad para concentrarse' },
      { fid: 'fld65YMBTMdVzDDdj', label: 'Aumento de peso' },
    ],
  },
] as const

const ALL_ITEMS = SECTIONS.flatMap(s => s.items as unknown as { fid: string; label: string }[])
const INITIAL_RATINGS: Record<string, number> = Object.fromEntries(ALL_ITEMS.map(i => [i.fid, 0]))

type Props = {
  clienteId: string
  nombreCliente: string
}

export function CuestionarioClient({ clienteId, nombreCliente }: Props) {
  const [ratings, setRatings] = useState<Record<string, number>>(INITIAL_RATINGS)
  const [observaciones, setObservaciones] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function rate(fid: string, value: number) {
    setRatings(prev => ({ ...prev, [fid]: value }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await saveCuestionario(clienteId, nombreCliente, ratings, observaciones)
        setDone(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al enviar. Intenta de nuevo.')
      }
    })
  }

  const RATING_LABELS = ['Nunca', 'Leve', 'Moderado', 'Severo']

  function ratingBtnStyle(fid: string, value: number): React.CSSProperties {
    const selected = ratings[fid] === value
    const colors: Record<number, string> = { 0: '#6A6560', 1: '#C9A84C', 2: '#C9A84C', 3: '#C9A84C' }
    return {
      width: 38,
      height: 38,
      border: selected ? `1px solid ${colors[value]}` : '1px solid rgba(255,255,255,0.1)',
      background: selected
        ? value === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(201,168,76,0.15)'
        : 'rgba(255,255,255,0.02)',
      color: selected ? (value === 0 ? '#9A9590' : '#C9A84C') : '#4A4540',
      fontSize: 13,
      fontFamily: 'Montserrat, sans-serif',
      fontWeight: selected ? 600 : 400,
      cursor: 'pointer',
      transition: 'all 0.1s',
      flexShrink: 0,
    }
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#FAFAF8', display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, letterSpacing: '0.08em' }}>
            AQ<span style={{ color: '#C9A84C' }}>SLIM</span>
          </span>
          <UserButton />
        </header>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>
          <p style={{ fontSize: 11, color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>Enviado</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 400, marginBottom: 16 }}>
            Cuestionario completado
          </h1>
          <p style={{ fontSize: 14, color: '#9A9590', maxWidth: 440, textAlign: 'center', lineHeight: 1.8, marginBottom: 40 }}>
            Gracias, {nombreCliente.split(' ')[0]}. Tu cuestionario ha sido enviado. Tu terapeuta lo revisará antes de tu consulta.
          </p>
          <a
            href={`/dashboard/${clienteId}`}
            style={{
              background: '#C9A84C', color: '#0A0A0A',
              padding: '14px 32px', fontSize: 11,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              fontFamily: 'Montserrat, sans-serif', fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Ir a mi portal →
          </a>
        </div>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400&family=Montserrat:wght@300;400;500;600&display=swap" />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#FAFAF8', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(201,168,76,0.2)', position: 'sticky', top: 0, background: '#0A0A0A', zIndex: 10 }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, letterSpacing: '0.08em' }}>
          AQ<span style={{ color: '#C9A84C' }}>SLIM</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 12, color: '#9A9590' }}>{nombreCliente}</span>
          <UserButton />
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 40px', width: '100%' }}>
        <div style={{ width: '100%', maxWidth: 680 }}>

          {/* Page header */}
          <p style={{ fontSize: 11, color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
            Paso 2
          </p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 400, marginBottom: 8 }}>
            Cuestionario de Síntomas
          </h1>
          <p style={{ fontSize: 13, color: '#9A9590', marginBottom: 8, lineHeight: 1.7 }}>
            Califica cada síntoma según la frecuencia con la que lo presentas.
          </p>

          {/* Legend */}
          <div style={{
            display: 'flex', gap: 0,
            border: '1px solid rgba(201,168,76,0.2)',
            marginBottom: 40, overflow: 'hidden',
          }}>
            {RATING_LABELS.map((lbl, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center', padding: '10px 8px',
                borderRight: i < 3 ? '1px solid rgba(201,168,76,0.2)' : 'none',
                background: i === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(201,168,76,0.04)',
              }}>
                <div style={{ fontSize: 16, fontFamily: "'Playfair Display', serif", color: i === 0 ? '#6A6560' : '#C9A84C', marginBottom: 2 }}>{i}</div>
                <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: i === 0 ? '#6A6560' : '#9A9590' }}>{lbl}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {SECTIONS.map((section) => (
              <div key={section.title}>
                {/* Section header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <span style={{
                    fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase',
                    color: '#C9A84C', whiteSpace: 'nowrap',
                  }}>
                    {section.title}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.2)' }} />
                </div>

                {/* Symptom rows */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {section.items.map((item) => (
                    <div
                      key={item.fid}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '11px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        gap: 16,
                      }}
                    >
                      <span style={{ fontSize: 13, color: '#FAFAF8', flex: 1 }}>{item.label}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {([0, 1, 2, 3] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            title={RATING_LABELS[v]}
                            onClick={() => rate(item.fid, v)}
                            style={ratingBtnStyle(item.fid, v)}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Observaciones */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', whiteSpace: 'nowrap' }}>
                  Observaciones
                </span>
                <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.2)' }} />
              </div>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Agrega cualquier información adicional que consideres relevante (opcional)..."
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(201,168,76,0.3)',
                  color: '#FAFAF8',
                  padding: '12px 16px',
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'Montserrat, sans-serif',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  minHeight: 100,
                }}
              />
            </div>

            {error && (
              <p style={{ fontSize: 12, color: '#ff6b6b', margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              style={{
                background: isPending ? 'rgba(201,168,76,0.4)' : '#C9A84C',
                color: '#0A0A0A',
                border: 'none',
                padding: '14px 40px',
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontFamily: 'Montserrat, sans-serif',
                cursor: isPending ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                alignSelf: 'flex-start',
                marginBottom: 48,
              }}
            >
              {isPending ? 'Enviando...' : 'Enviar Cuestionario'}
            </button>
          </form>
        </div>
      </div>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400&family=Montserrat:wght@300;400;500;600&display=swap" />
    </div>
  )
}
