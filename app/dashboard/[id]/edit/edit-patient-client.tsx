'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import type { Cliente } from '@/lib/airtable'
import { pt } from '@/lib/portal-type'
import { updatePaciente, sendReinitiationEmail } from './actions'

type Props = {
  patient: Cliente
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(201,168,76,0.3)',
  color: '#FAFAF8',
  padding: '12px 16px',
  fontSize: pt.base,
  outline: 'none',
  fontFamily: pt.sans,
  boxSizing: 'border-box',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: 88,
  display: 'block',
}

const labelStyle: React.CSSProperties = {
  fontSize: pt.sm,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#9A9590',
  display: 'block',
  marginBottom: 8,
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      <span style={{ fontSize: pt.xs, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6A6560', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
    </div>
  )
}

function isoToMmddyyyy(iso?: string): string {
  if (!iso) return ''
  const [yyyy, mm, dd] = iso.split('-')
  if (!yyyy || !mm || !dd) return ''
  return `${mm}/${dd}/${yyyy}`
}

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length < 4) return digits.length ? `(${digits}` : ''
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function formatDate(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length < 3) return digits
  if (digits.length < 5) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export function EditPatientClient({ patient }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [emailPending, startEmailTransition] = useTransition()
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [emailError, setEmailError] = useState<string | null>(null)

  const f = patient.fields
  const nameParts = (f['Nombre Completo'] ?? '').split(' ')
  const defaultFirst = nameParts[0] ?? ''
  const defaultLast  = nameParts.slice(1).join(' ')

  const [sexo, setSexo]                     = useState<'Masculino' | 'Femenino' | 'Otro' | null>(
    (f['Sexo'] as 'Masculino' | 'Femenino' | 'Otro') ?? null
  )
  const [idioma, setIdioma]                 = useState<'English' | 'Español' | null>(
    (f['Idioma Preferido'] as 'English' | 'Español') ?? null
  )
  const [unidadDePeso, setUnidadDePeso]     = useState<'Lbs' | 'Kg'>(
    (f['Unidad de Peso'] as 'Lbs' | 'Kg') ?? 'Lbs'
  )
  const [comoNosConocio, setComoNosConocio] = useState<string | null>(f['Cómo Nos Conoció'] ?? null)
  const [canalPublicidad, setCanalPublicidad] = useState((f['Canal de Publicidad'] as string | undefined) ?? '')
  const [responsableCaptacion, setResponsableCaptacion] = useState((f['Responsable de Captación'] as string | undefined) ?? '')
  const [telefono, setTelefono]             = useState(f['Teléfono'] ?? '')
  const [fechaNacimiento, setFechaNacimiento] = useState(isoToMmddyyyy(f['Fecha Nacimiento']))

  // Height state — initialize from existing record if available
  const [estaturaUnit, setEstaturaUnit] = useState<'ft-in' | 'cm'>('ft-in')
  const [estaturaFt, setEstaturaFt] = useState(() => {
    const cm = f['Estatura (cm)']
    return typeof cm === 'number' ? String(Math.floor(cm / 2.54 / 12)) : ''
  })
  const [estaturaIn, setEstaturaIn] = useState(() => {
    const cm = f['Estatura (cm)']
    return typeof cm === 'number' ? String(Math.round((cm / 2.54) % 12)) : ''
  })
  const [estaturaCm, setEstaturaCm] = useState(() => {
    const cm = f['Estatura (cm)']
    return typeof cm === 'number' ? String(cm) : ''
  })

  function handleEstaturaUnitChange(newUnit: 'ft-in' | 'cm') {
    if (newUnit === estaturaUnit) return
    if (newUnit === 'cm') {
      const ft = parseInt(estaturaFt || '0')
      const inches = parseInt(estaturaIn || '0')
      if (!isNaN(ft) && !isNaN(inches)) setEstaturaCm(String(Math.round((ft * 12 + inches) * 2.54)))
    } else {
      const cm = parseInt(estaturaCm)
      if (!isNaN(cm) && cm > 0) {
        const totalIn = cm / 2.54
        setEstaturaFt(String(Math.floor(totalIn / 12)))
        setEstaturaIn(String(Math.round(totalIn % 12)))
      }
    }
    setEstaturaUnit(newUnit)
  }

  function toggleBtn(selected: boolean): React.CSSProperties {
    return {
      flex: 1,
      padding: '11px 14px',
      fontSize: pt.base,
      fontFamily: pt.sans,
      fontWeight: 500,
      cursor: 'pointer',
      border: selected ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.3)',
      background: selected ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
      color: selected ? '#C9A84C' : '#9A9590',
      transition: 'all 0.15s',
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!sexo)   { setError('Por favor selecciona el sexo.'); return }
    if (!idioma) { setError('Por favor selecciona el idioma preferido.'); return }
    if (fechaNacimiento && fechaNacimiento.length > 0 && fechaNacimiento.length < 10) {
      setError('La fecha de nacimiento debe estar completa (mm/dd/aaaa).')
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set('clienteId',       patient.id)
    formData.set('telefono',        telefono)
    formData.set('fechaNacimiento', fechaNacimiento)
    formData.set('sexo',            sexo)
    formData.set('idioma',          idioma)
    formData.set('unidadDePeso',    unidadDePeso)
    formData.set('comoNosConocio',  comoNosConocio ?? '')
    formData.set('canalPublicidad', canalPublicidad)
    formData.set('responsableCaptacion', responsableCaptacion)
    const estaturaCmVal = estaturaUnit === 'cm'
      ? estaturaCm
      : (() => {
          const ft = parseInt(estaturaFt || '0')
          const inches = parseInt(estaturaIn || '0')
          return (!isNaN(ft) && !isNaN(inches)) ? String(Math.round((ft * 12 + inches) * 2.54)) : ''
        })()
    if (estaturaCmVal) formData.set('estaturaCm', estaturaCmVal)

    startTransition(async () => {
      try {
        await updatePaciente(formData)
        setSaved(true)
        setTimeout(() => router.push(`/dashboard/${patient.id}`), 1200)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar.')
      }
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#FAFAF8' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: '1px solid rgba(201,168,76,0.2)',
        position: 'sticky', top: 0, background: 'rgba(10,10,10,0.92)', zIndex: 10,
      }}>
        <span style={{ fontFamily: pt.serif, fontSize: pt.lg, letterSpacing: '0.08em' }}>
          AQ<span style={{ color: '#C9A84C' }}>SLIM</span>
          <span style={{ fontSize: pt.sm, color: '#9A9590', marginLeft: 12, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: pt.sans }}>
            Portal
          </span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => router.push(`/dashboard/${patient.id}`)}
            style={{
              background: 'none', border: '1px solid rgba(201,168,76,0.3)',
              color: '#C9A84C', cursor: 'pointer', fontSize: pt.sm,
              letterSpacing: '0.12em', padding: '8px 16px',
              fontFamily: pt.sans, textTransform: 'uppercase',
            }}
          >
            ← Expediente
          </button>
          <UserButton />
        </div>
      </header>

      <main style={{ padding: '48px 40px', maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: pt.sm, color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
          Expediente del Paciente
        </p>
        <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 8 }}>
          Editar Paciente
        </h1>
        <p style={{ fontSize: pt.base, color: '#9A9590', marginBottom: 40, lineHeight: 1.7 }}>
          {f['Nombre Completo'] ?? ''}
        </p>

        {saved && (
          <div style={{
            padding: '14px 20px', background: 'rgba(201,168,76,0.1)',
            border: '1px solid rgba(201,168,76,0.4)', marginBottom: 24,
            fontSize: pt.base, color: '#C9A84C',
          }}>
            Cambios guardados. Regresando al expediente...
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <input type="hidden" name="clienteId" value={patient.id} />

          <SectionDivider label="Información Personal" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label htmlFor="firstName" style={labelStyle}>Nombre</label>
              <input id="firstName" name="firstName" type="text" required defaultValue={defaultFirst} style={inputStyle} />
            </div>
            <div>
              <label htmlFor="lastName" style={labelStyle}>Apellido</label>
              <input id="lastName" name="lastName" type="text" required defaultValue={defaultLast} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label htmlFor="email" style={labelStyle}>Email</label>
              <input id="email" name="email" type="email" required defaultValue={f['Email'] ?? ''} style={inputStyle} />
            </div>
            <div>
              <label htmlFor="telefono" style={labelStyle}>Teléfono</label>
              <input
                id="telefono" name="telefono" type="tel"
                placeholder="(619) 555-0100"
                value={telefono}
                onChange={(e) => setTelefono(formatPhone(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label htmlFor="fechaNacimiento" style={labelStyle}>Fecha de Nacimiento</label>
              <input
                id="fechaNacimiento" name="fechaNacimiento" type="text"
                placeholder="mm/dd/yyyy"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(formatDate(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="estadoDelCliente" style={labelStyle}>Estado del Cliente</label>
              <select
                id="estadoDelCliente" name="estadoDelCliente"
                defaultValue={f['Estado del Cliente'] ?? 'Activo'}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="Activo">Activo</option>
                <option value="Prospecto">Prospecto</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          <div>
            <span style={labelStyle}>Sexo</span>
            <div style={{ display: 'flex', gap: 12 }}>
              {(['Masculino', 'Femenino', 'Otro'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setSexo(s)} style={toggleBtn(sexo === s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Height */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ ...labelStyle, display: 'inline', marginBottom: 0 }}>Estatura</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['ft-in', 'cm'] as const).map(unit => (
                  <button key={unit} type="button" onClick={() => handleEstaturaUnitChange(unit)} style={{
                    padding: '3px 8px', fontSize: pt.xs, fontFamily: pt.sans, cursor: 'pointer',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    border: estaturaUnit === unit ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.25)',
                    background: estaturaUnit === unit ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                    color: estaturaUnit === unit ? '#C9A84C' : '#9A9590', transition: 'all 0.12s',
                  }}>
                    {unit === 'ft-in' ? 'ft / in' : 'cm'}
                  </button>
                ))}
              </div>
            </div>
            {estaturaUnit === 'ft-in' ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <input type="number" min="0" max="8" placeholder="5" value={estaturaFt}
                    onChange={e => setEstaturaFt(e.target.value)} style={{ ...inputStyle, textAlign: 'center' }} />
                  <span style={{ color: '#9A9590', fontSize: pt.sm, whiteSpace: 'nowrap', fontFamily: pt.sans }}>ft</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <input type="number" min="0" max="11" placeholder="8" value={estaturaIn}
                    onChange={e => setEstaturaIn(e.target.value)} style={{ ...inputStyle, textAlign: 'center' }} />
                  <span style={{ color: '#9A9590', fontSize: pt.sm, whiteSpace: 'nowrap', fontFamily: pt.sans }}>in</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" min="0" max="300" placeholder="170" value={estaturaCm}
                  onChange={e => setEstaturaCm(e.target.value)} style={{ ...inputStyle, maxWidth: 160, textAlign: 'center' }} />
                <span style={{ color: '#9A9590', fontSize: pt.sm, fontFamily: pt.sans }}>cm</span>
              </div>
            )}
          </div>

          <SectionDivider label="Contacto y Ubicación" />

          <div>
            <label htmlFor="direccion" style={labelStyle}>Dirección</label>
            <input id="direccion" name="direccion" type="text" defaultValue={f['Dirección'] ?? ''} style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label htmlFor="ciudad" style={labelStyle}>Ciudad</label>
              <input id="ciudad" name="ciudad" type="text" defaultValue={f['Ciudad'] ?? ''} style={inputStyle} />
            </div>
            <div>
              <label htmlFor="zip" style={labelStyle}>ZIP</label>
              <input id="zip" name="zip" type="text" inputMode="numeric" pattern="[0-9]*" defaultValue={f['ZIP'] ?? ''} style={inputStyle} />
            </div>
          </div>

          <SectionDivider label="Programa" />

          <div>
            <span style={labelStyle}>Idioma Preferido</span>
            <div style={{ display: 'flex', gap: 12 }}>
              {(['English', 'Español'] as const).map((l) => (
                <button key={l} type="button" onClick={() => setIdioma(l)} style={toggleBtn(idioma === l)}>{l}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <span style={labelStyle}>Unidad de Peso</span>
              <div style={{ display: 'flex', gap: 12 }}>
                {(['Lbs', 'Kg'] as const).map((u) => (
                  <button key={u} type="button" onClick={() => setUnidadDePeso(u)} style={toggleBtn(unidadDePeso === u)}>{u}</button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="pesoMeta" style={labelStyle}>Peso Meta ({unidadDePeso})</label>
              <input
                id="pesoMeta" name="pesoMeta" type="number" min="0"
                defaultValue={f['Peso Meta'] ?? ''}
                placeholder={unidadDePeso === 'Lbs' ? '150' : '68'}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <span style={labelStyle}>¿Cómo Nos Conoció?</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {([
                ['Referido',       'Referido'],
                ['Anuncio',        'Anuncio'],
                ['Google search',  'Google Search'],
                ['Redes Sociales', 'Redes Sociales'],
              ] as [string, string][]).map(([value, label]) => (
                <button
                  key={value} type="button"
                  onClick={() => setComoNosConocio(value)}
                  style={{ ...toggleBtn(comoNosConocio === value), flex: 'none' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {['Anuncio', 'Google search', 'Redes Sociales'].includes(comoNosConocio ?? '') && (
            <div>
              <label htmlFor="canalPublicidad" style={labelStyle}>Canal de Publicidad</label>
              <select id="canalPublicidad" value={canalPublicidad} onChange={e => setCanalPublicidad(e.target.value)} style={inputStyle}>
                <option value="">Seleccionar…</option>
                {['Facebook', 'Instagram', 'Google', 'TikTok', 'YouTube', 'Otro'].map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="responsableCaptacion" style={labelStyle}>Responsable de Captación</label>
            <select id="responsableCaptacion" value={responsableCaptacion} onChange={e => setResponsableCaptacion(e.target.value)} style={inputStyle}>
              <option value="">Sin especificar</option>
              {['Hillary', 'Rómulo', 'Otro'].map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>

          <SectionDivider label="Metas y Salud" />

          <div>
            <label htmlFor="metaDelCliente" style={labelStyle}>Meta del Cliente</label>
            <textarea
              id="metaDelCliente" name="metaDelCliente"
              defaultValue={f['Meta del Cliente'] ?? ''}
              placeholder="Describe la meta principal del paciente..."
              style={textareaStyle}
            />
          </div>

          <div>
            <label htmlFor="condiciones" style={labelStyle}>Condiciones Especiales / Alergias</label>
            <textarea
              id="condiciones" name="condiciones"
              defaultValue={f['Condiciones Especiales / Alergias'] ?? ''}
              placeholder="Opcional..."
              style={textareaStyle}
            />
          </div>

          {error && (
            <p style={{ fontSize: pt.sm, color: '#ff6b6b', margin: 0 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              type="submit"
              disabled={isPending || saved}
              style={{
                background: (isPending || saved) ? 'rgba(201,168,76,0.4)' : '#C9A84C',
                color: '#0A0A0A', border: 'none',
                padding: '14px 32px', fontSize: pt.sm,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                fontFamily: pt.sans, fontWeight: 500,
                cursor: (isPending || saved) ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
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
              Cancelar
            </button>
          </div>
        </form>

        {/* Re-initiation email */}
        <div style={{
          marginTop: 40,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: 32,
        }}>
          <p style={{ fontSize: pt.sm, color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
            Comunicaciones
          </p>
          <h2 style={{ fontFamily: pt.serif, fontSize: pt.lg, fontWeight: 400, marginBottom: 8 }}>
            Email de Re-Inicio
          </h2>
          <p style={{ fontSize: pt.sm, color: '#9A9590', marginBottom: 20, lineHeight: 1.6 }}>
            Envía un correo de bienvenida de regreso con un enlace para agendar cita y completar el cuestionario de síntomas.
          </p>

          {emailStatus === 'sent' && (
            <div style={{
              padding: '12px 16px', background: 'rgba(111,191,111,0.08)',
              border: '1px solid rgba(111,191,111,0.35)', marginBottom: 16,
              fontSize: pt.sm, color: '#6fbf6f', fontFamily: pt.sans,
            }}>
              Email enviado correctamente a {f['Email']}.
            </div>
          )}
          {emailStatus === 'error' && emailError && (
            <p style={{ fontSize: pt.sm, color: '#ff6b6b', margin: '0 0 16px' }}>{emailError}</p>
          )}

          <button
            type="button"
            disabled={emailPending || emailStatus === 'sent'}
            onClick={() => {
              setEmailStatus('idle')
              setEmailError(null)
              startEmailTransition(async () => {
                try {
                  await sendReinitiationEmail(patient.id)
                  setEmailStatus('sent')
                } catch (err) {
                  setEmailStatus('error')
                  setEmailError(err instanceof Error ? err.message : 'Error al enviar.')
                }
              })
            }}
            style={{
              background: 'none',
              color: emailStatus === 'sent' ? '#6fbf6f' : '#C9A84C',
              border: `1px solid ${emailStatus === 'sent' ? 'rgba(111,191,111,0.4)' : 'rgba(201,168,76,0.5)'}`,
              padding: '12px 24px', fontSize: pt.sm,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              fontFamily: pt.sans, fontWeight: 500,
              cursor: (emailPending || emailStatus === 'sent') ? 'not-allowed' : 'pointer',
              opacity: (emailPending || emailStatus === 'sent') ? 0.6 : 1,
            }}
          >
            {emailPending ? 'Enviando...' : emailStatus === 'sent' ? '✓ Email enviado' : 'Enviar Email de Re-Inicio'}
          </button>
        </div>
      </main>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400&family=Montserrat:wght@300;400;500&display=swap" />
    </div>
  )
}
