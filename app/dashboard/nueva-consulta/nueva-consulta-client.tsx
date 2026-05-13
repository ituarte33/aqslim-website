'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { DashboardShell } from '../dashboard-shell'
import { registerPaciente } from './actions'
import { pt } from '@/lib/portal-type'

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
  prefillNombre?: string
  prefillEmail?: string
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

export function NuevaConsultaClient({ user, prefillNombre, prefillEmail }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const es = lang === 'es'

  const [registered, setRegistered] = useState<{ id: string; nombre: string } | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Controlled toggle fields
  const [sexo, setSexo]                   = useState<'Masculino' | 'Femenino' | 'Otro' | null>(null)
  const [idioma, setIdioma]               = useState<'English' | 'Español' | null>(null)
  const [unidadDePeso, setUnidadDePeso]   = useState<'Lbs' | 'Kg'>('Lbs')
  const [comoNosConocio, setComoNosConocio] = useState<string | null>(null)
  const [telefono, setTelefono]           = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')

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

  function toggleBtnStyle(selected: boolean): React.CSSProperties {
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

  function resetForm() {
    setRegistered(null)
    setError(null)
    setSexo(null)
    setIdioma(null)
    setUnidadDePeso('Lbs')
    setComoNosConocio(null)
    setTelefono('')
    setFechaNacimiento('')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!sexo) {
      setError(es ? 'Por favor selecciona el sexo del paciente.' : 'Please select the patient\'s sex.')
      return
    }
    if (!idioma) {
      setError(es ? 'Por favor selecciona el idioma preferido.' : 'Please select a preferred language.')
      return
    }
    if (fechaNacimiento.length < 10) {
      setError(es ? 'Por favor ingresa la fecha de nacimiento completa (mm/dd/aaaa).' : 'Please enter the complete date of birth (mm/dd/yyyy).')
      return
    }
    if (!comoNosConocio) {
      setError(es ? 'Por favor indica cómo nos conoció el paciente.' : 'Please indicate how the patient found us.')
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set('telefono', telefono)
    formData.set('fechaNacimiento', fechaNacimiento)
    formData.set('sexo', sexo)
    formData.set('idioma', idioma)
    formData.set('unidadDePeso', unidadDePeso)
    formData.set('comoNosConocio', comoNosConocio)

    startTransition(async () => {
      try {
        const result = await registerPaciente(formData)
        setRegistered(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : (es ? 'Error al registrar.' : 'Error registering.'))
      }
    })
  }

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 8, marginTop: 8 }}>
        {es ? 'Registrar Paciente Nuevo' : 'Register New Patient'}
      </h1>
      <p style={{ fontSize: pt.base, color: '#6A6560', marginBottom: 40, marginTop: 0 }}>
        {es
          ? 'Completa el perfil del paciente. Se enviará un correo de bienvenida automáticamente.'
          : 'Complete the patient profile. A welcome email will be sent automatically.'}
      </p>

      {registered ? (
        <div style={{ maxWidth: 560 }}>
          <div style={{
            border: '1px solid rgba(111,191,111,0.4)',
            background: 'rgba(111,191,111,0.06)',
            padding: '28px 32px',
            marginBottom: 24,
          }}>
            <div style={{ fontSize: pt.xs, color: '#6fbf6f', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8, fontFamily: pt.sans }}>
              {es ? 'Registro exitoso' : 'Registration successful'}
            </div>
            <div style={{ fontFamily: pt.serif, fontSize: 22, color: '#FAFAF8', marginBottom: 6 }}>
              {registered.nombre}
            </div>
            <div style={{ fontSize: pt.sm, color: '#9A9590', fontFamily: pt.sans }}>
              {es
                ? 'El paciente ha sido registrado y se le envió un correo de bienvenida con los siguientes pasos.'
                : 'The patient has been registered and sent a welcome email with next steps.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={resetForm}
              style={{
                background: '#C9A84C', color: '#0A0A0A', border: 'none',
                padding: '12px 24px', fontSize: pt.sm, letterSpacing: '0.14em',
                textTransform: 'uppercase', fontFamily: pt.sans, fontWeight: 500, cursor: 'pointer',
              }}
            >
              {es ? '+ Registrar otro' : '+ Register another'}
            </button>
            <Link
              href="/dashboard/patients"
              style={{
                background: 'none', color: '#C9A84C',
                border: '1px solid rgba(201,168,76,0.5)',
                padding: '12px 24px', fontSize: pt.sm, letterSpacing: '0.14em',
                textTransform: 'uppercase', fontFamily: pt.sans, fontWeight: 500,
                textDecoration: 'none', display: 'inline-block',
              }}
            >
              {es ? 'Ver pacientes →' : 'View patients →'}
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560 }}>

          <SectionDivider label={es ? 'Información Personal' : 'Personal Information'} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label htmlFor="firstName" style={labelStyle}>{es ? 'Nombre' : 'First Name'}</label>
              <input id="firstName" name="firstName" type="text" required style={inputStyle}
                defaultValue={prefillNombre ? prefillNombre.split(' ')[0] : undefined} />
            </div>
            <div>
              <label htmlFor="lastName" style={labelStyle}>{es ? 'Apellido' : 'Last Name'}</label>
              <input id="lastName" name="lastName" type="text" required style={inputStyle}
                defaultValue={prefillNombre ? prefillNombre.split(' ').slice(1).join(' ') : undefined} />
            </div>
          </div>

          <div>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input id="email" name="email" type="email" required style={inputStyle}
              defaultValue={prefillEmail} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label htmlFor="telefono" style={labelStyle}>{es ? 'Teléfono' : 'Phone'}</label>
              <input
                id="telefono" name="telefono" type="tel" required
                placeholder="(619) 555-0100"
                value={telefono}
                onChange={(e) => setTelefono(formatPhone(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="fechaNacimiento" style={labelStyle}>{es ? 'Fecha de Nacimiento' : 'Date of Birth'}</label>
              <input
                id="fechaNacimiento" name="fechaNacimiento" type="text" required
                placeholder="mm/dd/yyyy"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(formatDate(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <span style={labelStyle}>{es ? 'Sexo' : 'Sex'}</span>
            <div style={{ display: 'flex', gap: 12 }}>
              {(['Masculino', 'Femenino', 'Otro'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setSexo(s)} style={toggleBtnStyle(sexo === s)}>
                  {s === 'Masculino' ? (es ? 'Masculino' : 'Male') : s === 'Femenino' ? (es ? 'Femenino' : 'Female') : (es ? 'Otro' : 'Other')}
                </button>
              ))}
            </div>
          </div>

          <SectionDivider label={es ? 'Contacto y Ubicación' : 'Contact & Location'} />

          <div>
            <label htmlFor="direccion" style={labelStyle}>{es ? 'Dirección' : 'Address'}</label>
            <input id="direccion" name="direccion" type="text" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label htmlFor="ciudad" style={labelStyle}>{es ? 'Ciudad' : 'City'}</label>
              <input id="ciudad" name="ciudad" type="text" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="zip" style={labelStyle}>ZIP</label>
              <input id="zip" name="zip" type="text" inputMode="numeric" pattern="[0-9]*" style={inputStyle} />
            </div>
          </div>

          <SectionDivider label={es ? 'Programa' : 'Program'} />

          <div>
            <span style={labelStyle}>{es ? 'Idioma Preferido' : 'Preferred Language'}</span>
            <div style={{ display: 'flex', gap: 12 }}>
              {(['English', 'Español'] as const).map((l) => (
                <button key={l} type="button" onClick={() => setIdioma(l)} style={toggleBtnStyle(idioma === l)}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <span style={labelStyle}>{es ? 'Unidad de Peso' : 'Weight Unit'}</span>
              <div style={{ display: 'flex', gap: 12 }}>
                {(['Lbs', 'Kg'] as const).map((u) => (
                  <button key={u} type="button" onClick={() => setUnidadDePeso(u)} style={toggleBtnStyle(unidadDePeso === u)}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="pesoMeta" style={labelStyle}>
                {es ? 'Peso Meta' : 'Goal Weight'} ({unidadDePeso})
              </label>
              <input
                id="pesoMeta" name="pesoMeta" type="number" min="0" required
                placeholder={unidadDePeso === 'Lbs' ? '150' : '68'}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <span style={labelStyle}>{es ? '¿Cómo Nos Conoció?' : 'How Did They Find Us?'}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {([
                ['Referido',       es ? 'Referido'       : 'Referral'],
                ['Anuncio',        es ? 'Anuncio'        : 'Ad'],
                ['Google search',  'Google Search'],
                ['Redes Sociales', es ? 'Redes Sociales' : 'Social Media'],
              ] as [string, string][]).map(([value, label]) => (
                <button
                  key={value} type="button"
                  onClick={() => setComoNosConocio(value)}
                  style={{ ...toggleBtnStyle(comoNosConocio === value), flex: 'none' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <SectionDivider label={es ? 'Metas y Salud' : 'Goals & Health'} />

          <div>
            <label htmlFor="metaDelCliente" style={labelStyle}>{es ? 'Meta del Cliente' : 'Client Goal'}</label>
            <textarea
              id="metaDelCliente" name="metaDelCliente" required
              placeholder={es
                ? 'Describe la meta principal (ej. bajar de peso, mejorar energía)...'
                : 'Describe the main goal (e.g. lose weight, improve energy)...'}
              style={textareaStyle}
            />
          </div>

          <div>
            <label htmlFor="condiciones" style={labelStyle}>
              {es ? 'Condiciones Especiales / Alergias' : 'Special Conditions / Allergies'}
            </label>
            <textarea
              id="condiciones" name="condiciones"
              placeholder={es
                ? 'Lista cualquier condición médica o alergia relevante (opcional)...'
                : 'List any relevant medical conditions or allergies (optional)...'}
              style={textareaStyle}
            />
          </div>

          {error && (
            <p style={{ fontSize: pt.sm, color: '#ff6b6b', margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            style={{
              background: isPending ? 'rgba(201,168,76,0.4)' : '#C9A84C',
              color: '#0A0A0A', border: 'none',
              padding: '14px 32px', fontSize: pt.sm,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              fontFamily: pt.sans, cursor: isPending ? 'not-allowed' : 'pointer',
              fontWeight: 500, alignSelf: 'flex-start', marginTop: 8,
            }}
          >
            {isPending
              ? (es ? 'Registrando...' : 'Registering...')
              : (es ? 'Registrar Paciente' : 'Register Patient')}
          </button>
        </form>
      )}
    </DashboardShell>
  )
}
