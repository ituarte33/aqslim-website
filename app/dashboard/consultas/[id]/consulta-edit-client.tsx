'use client'

import { useState, useTransition } from 'react'
import { UserButton } from '@clerk/nextjs'
import type { Consulta, Cliente, Suplemento } from '@/lib/airtable'
import { pt } from '@/lib/portal-type'
import { updateConsultaRecord } from './actions'

type Props = {
  consulta: Consulta | null
  patient: Cliente | null
  supplementos: Suplemento[]
  error: string | null
}

type CartItem = { key: number; id: string; nombre: string; precio: number }

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

function ScoreInput({ label, name, value, onChange }: {
  label: string; name: string; value: number | null; onChange: (v: number | null) => void
}) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n} type="button"
            onClick={() => onChange(value === n ? null : n)}
            style={{
              width: 38, height: 38,
              border: value === n ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.25)',
              background: value === n ? 'rgba(201,168,76,0.18)' : 'rgba(255,255,255,0.03)',
              color: value === n ? '#C9A84C' : '#9A9590',
              cursor: 'pointer', fontSize: pt.sm, fontFamily: pt.sans, transition: 'all 0.12s',
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value ?? ''} />
    </div>
  )
}

function ToggleGroup<T extends string>({ label, name, options, value, onChange }: {
  label: string; name: string; options: { value: T; label: string }[]; value: T | null; onChange: (v: T | null) => void
}) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {options.map(o => (
          <button
            key={o.value} type="button"
            onClick={() => onChange(value === o.value ? null : o.value)}
            style={{
              padding: '10px 18px', fontSize: pt.base, fontFamily: pt.sans,
              cursor: 'pointer', fontWeight: 500, flex: 'none',
              border: value === o.value ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.3)',
              background: value === o.value ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
              color: value === o.value ? '#C9A84C' : '#9A9590', transition: 'all 0.15s',
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value ?? ''} />
    </div>
  )
}

function readStr(val: unknown): string {
  if (val == null) return ''
  if (typeof val === 'string') return val
  return ''
}

function readNum(val: unknown): string {
  if (val == null) return ''
  const n = Number(val)
  return isNaN(n) ? '' : String(n)
}

// Parse "Suplementos vendidos:\n- Name ($X.XX)\nTotal: $X.XX" into cart items.
// Handles \r\n and \n line endings, and trims whitespace on each line.
function parseExistingCart(notes: string): { cart: CartItem[]; unparsedNotes: string } {
  if (!notes) return { cart: [], unparsedNotes: '' }
  if (!notes.includes('Suplementos vendidos:')) return { cart: [], unparsedNotes: notes }

  const items: CartItem[] = []
  let key = 0
  for (const raw of notes.split(/\r?\n/)) {
    const line = raw.trim()
    const m = line.match(/^-\s+(.+?)\s+\(\$([0-9.]+)\)$/)
    if (m) items.push({ key: key++, id: '', nombre: m[1], precio: parseFloat(m[2]) })
  }
  // If the header was present but no items parsed, keep notes as unparsed fallback
  return { cart: items, unparsedNotes: items.length === 0 ? notes : '' }
}

export function ConsultaEditClient({ consulta, patient, supplementos, error }: Props) {
  const f = consulta?.fields ?? {}

  // ── pre-parse supplement notes into cart ───────────────────────────────────
  const existingNotes = readStr(f['Notas del Terapeuta'])
  const { cart: initialCart, unparsedNotes: initialUnparsed } = parseExistingCart(existingNotes)
  const initialSuppTotal = initialCart.reduce((s, i) => s + i.precio, 0)
  const existingMonto    = typeof f['Monto Cobrado ($)'] === 'number' ? f['Monto Cobrado ($)'] as number : 0
  const initialFee       = Math.max(0, existingMonto - initialSuppTotal)

  // ── form state pre-filled from existing record ─────────────────────────────
  const [tipoConsulta, setTipoConsulta]   = useState<string | null>(readStr(f['Tipo de Consulta']) || null)
  const [nivelEnergia, setNivelEnergia]   = useState<string | null>(readStr(f['Nivel de Energía']) || null)
  const [calidadSueno, setCalidadSueno]   = useState<string | null>(readStr(f['Calidad de Sueño']) || null)
  const [metodoPago,   setMetodoPago]     = useState<string | null>(readStr(f['Método de Pago']) || null)
  const [ansiedad,     setAnsiedad]       = useState<string | null>(readStr(f['¿Ansiedad?']) || null)
  const [tuvoHambre,   setTuvoHambre]     = useState<string | null>(readStr(f['¿Tuvo Hambre?']) || null)
  const [cumplimiento, setCumplimiento]   = useState<number | null>(
    typeof f['Cumplimiento Dieta (1-10)'] === 'number' ? f['Cumplimiento Dieta (1-10)'] as number : null
  )
  const [comoSeSiente, setComoSeSiente]   = useState<number | null>(
    typeof f['Cómo Se Siente (1-10)'] === 'number' ? f['Cómo Se Siente (1-10)'] as number : null
  )

  const [pesoUnit,  setPesoUnit]  = useState<'kg' | 'lbs'>('kg')
  const [pesoValue, setPesoValue] = useState(readNum(f['Peso (kg)']))

  // ── supplement cart state ──────────────────────────────────────────────────
  const [cart,          setCart]          = useState<CartItem[]>(initialCart)
  const [cartKeySeq,    setCartKeySeq]    = useState(initialCart.length)
  const [suppSearch,    setSuppSearch]    = useState('')
  const [unparsedNotes, setUnparsedNotes] = useState(initialUnparsed)
  const [consultaFee,   setConsultaFee]   = useState(initialFee > 0 ? String(initialFee) : readNum(f['Monto Cobrado ($)']))

  const supplementTotal   = cart.reduce((s, i) => s + i.precio, 0)
  const montoCobradoTotal = supplementTotal + (parseFloat(consultaFee) || 0)

  function handlePesoUnitChange(newUnit: 'kg' | 'lbs') {
    if (newUnit === pesoUnit) return
    const v = parseFloat(pesoValue)
    if (!isNaN(v) && pesoValue !== '') {
      const converted = newUnit === 'lbs' ? v / 0.453592 : v * 0.453592
      setPesoValue(converted.toFixed(1))
    }
    setPesoUnit(newUnit)
  }

  const [saved,     setSaved]     = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!consulta) return
    setSaveError(null)

    const formData = new FormData(e.currentTarget)

    // Weight → always store in kg
    const pesoKgVal = pesoValue !== '' && !isNaN(parseFloat(pesoValue))
      ? (pesoUnit === 'lbs' ? parseFloat(pesoValue) * 0.453592 : parseFloat(pesoValue))
      : null
    if (pesoKgVal !== null) formData.set('pesoKg', String(pesoKgVal))
    else formData.delete('pesoKg')

    // Serialize cart to Notas del Terapeuta format
    if (cart.length > 0) {
      const lines = cart.map(i => `- ${i.nombre} ($${i.precio.toFixed(2)})`).join('\n')
      formData.set('notasSuplemento', `Suplementos vendidos:\n${lines}\nTotal: $${supplementTotal.toFixed(2)}`)
    } else if (unparsedNotes) {
      formData.set('notasSuplemento', unparsedNotes)
    } else {
      formData.set('notasSuplemento', '')
    }

    // Always write computed monto
    formData.set('montoCobrado', montoCobradoTotal > 0 ? String(montoCobradoTotal) : '')

    startTransition(async () => {
      try {
        await updateConsultaRecord(consulta.id, formData)
        setSaved(true)
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Error al guardar.')
      }
    })
  }

  const patientId = patient?.id
  const nombre    = patient?.fields['Nombre Completo'] ?? '—'
  const fechaDisp = readStr(f['Fecha Consulta']) || '—'

  // ── Error / Not found ───────────────────────────────────────────────────────
  if (error || !consulta) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ padding: 32, border: '1px solid rgba(255,80,80,0.3)', background: 'rgba(255,80,80,0.06)', maxWidth: 480 }}>
          <div style={{ fontSize: pt.sm, color: '#ff6b6b', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Error</div>
          <p style={{ fontSize: pt.base, color: '#FAFAF8', margin: 0 }}>{error ?? 'Consulta no encontrada.'}</p>
        </div>
      </div>
    )
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (saved) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#FAFAF8' }}>
        <PageHeader nombre={nombre} fechaDisp={fechaDisp} patientId={patientId} />
        <main style={{ padding: '48px 40px', maxWidth: 680, margin: '0 auto' }}>
          <div style={{
            border: '1px solid rgba(111,191,111,0.4)', background: 'rgba(111,191,111,0.06)',
            padding: '28px 32px', marginBottom: 24,
          }}>
            <div style={{ fontSize: pt.xs, color: '#6fbf6f', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              Cambios guardados
            </div>
            <div style={{ fontFamily: pt.serif, fontSize: 22, color: '#FAFAF8', marginBottom: 6 }}>{nombre}</div>
            <div style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans }}>
              Consulta del {fechaDisp} actualizada exitosamente en Airtable.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setSaved(false)}
              style={{
                background: '#C9A84C', color: '#0A0A0A', border: 'none',
                padding: '12px 24px', fontSize: pt.sm, letterSpacing: '0.14em',
                textTransform: 'uppercase', fontFamily: pt.sans, fontWeight: 500, cursor: 'pointer',
              }}
            >
              Seguir editando
            </button>
            {patientId && (
              <button
                onClick={() => window.location.href = `/dashboard/${patientId}`}
                style={{
                  background: 'none', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.5)',
                  padding: '12px 24px', fontSize: pt.sm, letterSpacing: '0.14em',
                  textTransform: 'uppercase', fontFamily: pt.sans, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Ver expediente →
              </button>
            )}
          </div>
        </main>
      </div>
    )
  }

  // ── Supplement picker helpers ─────────────────────────────────────────────
  const q = suppSearch.toLowerCase()
  const filteredSupps = q
    ? supplementos.filter(s => String(s.fields['Nombre'] ?? '').toLowerCase().includes(q))
    : supplementos

  const suppGroups = new Map<string, typeof supplementos>()
  for (const s of filteredSupps) {
    const cat = String(s.fields['Categoría'] ?? '').trim() || 'Sin Categoría'
    if (!suppGroups.has(cat)) suppGroups.set(cat, [])
    suppGroups.get(cat)!.push(s)
  }
  const sortedGroups = [...suppGroups.entries()].sort(([a], [b]) => {
    const rank = (c: string) => c === 'Sin Categoría' ? 2 : c === 'Suplemento' ? 1 : 0
    return rank(a) - rank(b) || a.localeCompare(b)
  })

  // ── Edit form ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#FAFAF8' }}>
      <PageHeader nombre={nombre} fechaDisp={fechaDisp} patientId={patientId} />

      <main style={{ padding: '48px 40px', maxWidth: 680, margin: '0 auto' }}>
        <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 4, marginTop: 0 }}>
          Editar Consulta
        </h1>
        <p style={{ fontSize: pt.sm, color: '#6A6560', margin: '0 0 32px', fontFamily: pt.sans }}>
          Los cambios se guardan directamente en el registro de Airtable.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <SectionDivider label="Tipo de Consulta" />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {([
              ['Cliente Nuevo',       'Cliente Nuevo'      ],
              ['Cliente subsecuente', 'Cliente Subsecuente'],
              ['Cliente Re-Inicio',   'Cliente Re-Inicio'  ],
            ] as [string, string][]).map(([value, label]) => (
              <button
                key={value} type="button"
                onClick={() => setTipoConsulta(tipoConsulta === value ? null : value)}
                style={{
                  padding: '11px 20px', fontSize: pt.base, fontFamily: pt.sans, fontWeight: 500,
                  cursor: 'pointer', flex: 'none',
                  border: tipoConsulta === value ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.3)',
                  background: tipoConsulta === value ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
                  color: tipoConsulta === value ? '#C9A84C' : '#9A9590', transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <input type="hidden" name="tipoConsulta" value={tipoConsulta ?? ''} />

          <SectionDivider label="Fecha" />
          <div>
            <label htmlFor="ce-fecha" style={labelStyle}>Fecha de Consulta</label>
            <input
              id="ce-fecha" name="fechaConsulta" type="date"
              defaultValue={readStr(f['Fecha Consulta'])}
              style={{ ...inputStyle, maxWidth: 220 }}
            />
          </div>

          <SectionDivider label="Mediciones" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ ...labelStyle, display: 'inline', marginBottom: 0 }}>Peso</span>
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
                        color: pesoUnit === unit ? '#C9A84C' : '#9A9590', transition: 'all 0.12s',
                      }}
                    >
                      {unit.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number" step="0.1" min="0"
                value={pesoValue}
                onChange={e => setPesoValue(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="ce-grasa" style={labelStyle}>% Grasa Corporal</label>
              <input
                id="ce-grasa" name="grasaCorporal" type="number" step="0.1" min="0" max="100"
                defaultValue={readNum(f['% Grasa Corporal'])}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[
              { id: 'ce-cintura', name: 'cintura', label: 'Cintura (cm)',      field: 'Cintura (cm)'      },
              { id: 'ce-cadera',  name: 'cadera',  label: 'Cadera (cm)',       field: 'Cadera (cm)'       },
              { id: 'ce-brazos',  name: 'brazos',  label: 'Brazos (cm)',       field: 'Brazos (cm)'       },
              { id: 'ce-muslos',  name: 'muslos',  label: 'Muslos (cm)',       field: 'Muslos (cm)'       },
              { id: 'ce-pecho',   name: 'pecho',   label: 'Pecho/Busto (cm)', field: 'Pecho/Busto (cm)'  },
            ].map(({ id, name, label, field }) => (
              <div key={name}>
                <label htmlFor={id} style={labelStyle}>{label}</label>
                <input
                  id={id} name={name} type="number" step="0.1" min="0"
                  defaultValue={readNum(f[field])}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>

          <SectionDivider label="Bienestar" />
          <ScoreInput label="Cumplimiento de Dieta (1-10)" name="cumplimientoDieta" value={cumplimiento} onChange={setCumplimiento} />
          <ScoreInput label="Cómo Se Siente (1-10)" name="comoSeSiente" value={comoSeSiente} onChange={setComoSeSiente} />
          <ToggleGroup
            label="Nivel de Energía" name="nivelEnergia"
            options={[
              { value: 'Excelente', label: 'Excelente' }, { value: 'Bueno', label: 'Bueno' },
              { value: 'Regular',   label: 'Regular'   }, { value: 'Malo',  label: 'Malo'  },
              { value: 'Muy Malo',  label: 'Muy Malo'  },
            ]}
            value={nivelEnergia} onChange={setNivelEnergia}
          />
          <ToggleGroup
            label="Calidad de Sueño" name="calidadSueno"
            options={[
              { value: 'Excelente', label: 'Excelente' }, { value: 'Bueno', label: 'Bueno' },
              { value: 'Regular',   label: 'Regular'   }, { value: 'Malo',  label: 'Malo'  },
              { value: 'Muy Malo',  label: 'Muy Malo'  },
            ]}
            value={calidadSueno} onChange={setCalidadSueno}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ToggleGroup
              label="¿Ansiedad?" name="ansiedad"
              options={[{ value: 'Mucha', label: 'Mucha' }, { value: 'Poca', label: 'Poca' }, { value: 'Nada', label: 'Nada' }]}
              value={ansiedad} onChange={setAnsiedad}
            />
            <ToggleGroup
              label="¿Tuvo Hambre?" name="tuvoHambre"
              options={[
                { value: 'Mucha',     label: 'Mucha'     }, { value: 'Manejable', label: 'Manejable' },
                { value: 'Poca',      label: 'Poca'      }, { value: 'Nada',      label: 'Nada'      },
              ]}
              value={tuvoHambre} onChange={setTuvoHambre}
            />
          </div>

          <SectionDivider label="Notas" />
          <div>
            <label htmlFor="ce-reco" style={labelStyle}>Recomendaciones al Cliente</label>
            <textarea
              id="ce-reco" name="recomendaciones" rows={4}
              defaultValue={readStr(f['Recomendaciones al Cliente'])}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 100, display: 'block' }}
            />
          </div>

          <SectionDivider label="Suplementos" />

          {/* Fallback: show raw notes when the structured format couldn't be parsed */}
          {unparsedNotes && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: pt.xs, color: '#C9A84C', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: pt.sans, marginBottom: 6 }}>
                Notas del Terapeuta (formato libre)
              </div>
              <textarea
                rows={4}
                value={unparsedNotes}
                onChange={e => setUnparsedNotes(e.target.value)}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 80, display: 'block' }}
              />
              <p style={{ fontSize: pt.xs, color: '#6A6560', margin: '6px 0 0', fontFamily: pt.sans }}>
                Estas notas no están en el formato de carrito. Edítalas aquí o añade suplementos del catálogo abajo.
              </p>
            </div>
          )}

          {supplementos.length === 0 ? (
            <p style={{ fontSize: pt.sm, color: '#6A6560', margin: 0, fontFamily: pt.sans }}>
              No hay suplementos activos registrados.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input
                type="text"
                placeholder="Buscar suplemento..."
                value={suppSearch}
                onChange={e => setSuppSearch(e.target.value)}
                style={{ ...inputStyle, maxWidth: 340 }}
              />
              {filteredSupps.length === 0 ? (
                <p style={{ fontSize: pt.sm, color: '#6A6560', margin: 0, fontFamily: pt.sans }}>Sin resultados.</p>
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
          )}

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
                  Subtotal suplementos
                </span>
                <span style={{ fontSize: pt.base, color: '#C9A84C', fontFamily: pt.sans, fontWeight: 500 }}>
                  ${supplementTotal.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <SectionDivider label="Pago" />
          <ToggleGroup
            label="Método de Pago" name="metodoPago"
            options={[
              { value: 'Efectivo',      label: 'Efectivo'      },
              { value: 'Card',          label: 'Card'          },
              { value: 'Venmo',         label: 'Venmo'         },
              { value: 'Zelle',         label: 'Zelle'         },
              { value: 'Transferencia', label: 'Transferencia' },
            ]}
            value={metodoPago} onChange={setMetodoPago}
          />

          {/* Payment breakdown */}
          <div style={{ border: '1px solid rgba(201,168,76,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="ce-fee" style={{ ...labelStyle, margin: 0 }}>Cargo de Consulta ($)</label>
              <input
                id="ce-fee" type="number" step="0.01" min="0" placeholder="0.00"
                value={consultaFee}
                onChange={e => setConsultaFee(e.target.value)}
                style={{ ...inputStyle, width: 120, textAlign: 'right' }}
              />
            </div>
            {cart.length > 0 && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans }}>Suplementos</span>
                <span style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans }}>${supplementTotal.toFixed(2)}</span>
              </div>
            )}
            <div style={{ padding: '14px 16px', background: 'rgba(201,168,76,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: pt.sm, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: pt.sans, fontWeight: 500 }}>
                Monto Cobrado
              </span>
              <span style={{ fontSize: pt.lg, color: '#C9A84C', fontFamily: pt.serif }}>
                ${montoCobradoTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {saveError && (
            <p style={{ fontSize: pt.sm, color: '#ff6b6b', margin: 0 }}>{saveError}</p>
          )}

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
              {isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            {patientId && (
              <button
                type="button"
                onClick={() => window.location.href = `/dashboard/${patientId}`}
                style={{
                  background: 'none', color: '#9A9590',
                  border: '1px solid rgba(255,255,255,0.12)',
                  padding: '14px 24px', fontSize: pt.sm,
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                  fontFamily: pt.sans, cursor: 'pointer',
                }}
              >
                Ver expediente
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  )
}

function PageHeader({
  nombre, fechaDisp, patientId,
}: { nombre: string; fechaDisp: string; patientId?: string }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 40px', borderBottom: '1px solid rgba(201,168,76,0.2)',
      position: 'sticky', top: 0, background: 'rgba(10,10,10,0.92)', zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <span style={{ fontFamily: pt.serif, fontSize: pt.lg, letterSpacing: '0.08em' }}>
          AQ<span style={{ color: '#C9A84C' }}>SLIM</span>
          <span style={{ fontSize: pt.sm, color: '#9A9590', marginLeft: 12, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: pt.sans }}>
            Portal
          </span>
        </span>
        <div style={{ fontSize: pt.sm, color: '#6A6560', fontFamily: pt.sans }}>
          {nombre} · {fechaDisp}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {patientId && (
          <a
            href={`/dashboard/${patientId}`}
            style={{
              fontSize: pt.sm, color: '#C9A84C', fontFamily: pt.sans,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              border: '1px solid rgba(201,168,76,0.3)', padding: '8px 16px',
              textDecoration: 'none',
            }}
          >
            ← Expediente
          </a>
        )}
        <UserButton />
      </div>
    </header>
  )
}
