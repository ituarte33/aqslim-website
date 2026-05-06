'use client'

import { useState, useTransition } from 'react'
import { UserButton } from '@clerk/nextjs'
import { saveProfile } from './actions'

// ─── PASTE YOUR SQUARESPACE SCHEDULING LINK HERE ───────────────────────────
const SCHEDULING_URL = 'https://book.squareup.com/appointments/46af1166-2cd2-4127-b94f-531a768d54c9/location/8PN49DRQ1C6TC/services'
// ────────────────────────────────────────────────────────────────────────────

type Props = {
  defaultFirstName: string
  defaultLastName: string
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(201,168,76,0.3)',
  color: '#FAFAF8',
  padding: '12px 16px',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'Montserrat, sans-serif',
  boxSizing: 'border-box' as const,
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: 88,
  display: 'block',
}

const labelStyle: React.CSSProperties = {
  fontSize: 10,
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
      <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6A6560', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
    </div>
  )
}

export function OnboardingClient({ defaultFirstName, defaultLastName }: Props) {
  const [step, setStep] = useState<'profile' | 'next-steps'>('profile')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Controlled toggle fields
  const [idioma, setIdioma] = useState<'English' | 'Español' | null>(null)
  const [sexo, setSexo] = useState<'Masculino' | 'Femenino' | 'Otro' | null>(null)
  const [unidadDePeso, setUnidadDePeso] = useState<'Lbs' | 'Kg'>('Lbs')
  const [comoNosConocio, setComoNosConocio] = useState<string | null>(null)

  // Formatted inputs
  const [telefono, setTelefono] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')

  // Terms
  const [aceptoTerminos, setAceptoTerminos] = useState(false)

  // Returns Spanish or English label based on selected language (defaults to Spanish)
  function t(es: string, en: string) {
    return idioma === 'English' ? en : es
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

  function toggleBtnStyle(selected: boolean): React.CSSProperties {
    return {
      flex: 1,
      padding: '11px 14px',
      fontSize: 13,
      fontFamily: 'Montserrat, sans-serif',
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

    if (!sexo) {
      setError(t('Por favor selecciona tu sexo.', 'Please select your sex.'))
      return
    }
    if (!idioma) {
      setError(t('Por favor selecciona tu idioma preferido.', 'Please select your preferred language.'))
      return
    }
    if (fechaNacimiento.length < 10) {
      setError(t('Por favor ingresa tu fecha de nacimiento completa (mm/dd/aaaa).', 'Please enter your complete date of birth (mm/dd/yyyy).'))
      return
    }
    if (!comoNosConocio) {
      setError(t('Por favor indícanos cómo nos conociste.', 'Please tell us how you found us.'))
      return
    }
    if (!aceptoTerminos) {
      setError(t('Debes aceptar los términos para continuar.', 'You must accept the terms to continue.'))
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
        await saveProfile(formData)
        setStep('next-steps')
      } catch (err) {
        setError(err instanceof Error ? err.message : t('Error al guardar.', 'Error saving.'))
      }
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', color: '#FAFAF8', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: '1px solid rgba(201,168,76,0.2)',
      }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, letterSpacing: '0.08em' }}>
          AQ<span style={{ color: '#C9A84C' }}>SLIM</span>
        </span>
        <UserButton />
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '48px 40px', width: '100%' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>

          {step === 'profile' && (
            <>
              <p style={{ fontSize: 11, color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
                Bienvenido a AQSLIM
              </p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 400, marginBottom: 8 }}>
                {t('Completa tu perfil', 'Complete your profile')}
              </h1>
              <p style={{ fontSize: 13, color: '#9A9590', marginBottom: 36, lineHeight: 1.7 }}>
                {t('Necesitamos algunos datos para personalizar tu programa.', 'We need a few details to personalize your program.')}
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                <SectionDivider label={t('Información Personal', 'Personal Information')} />

                {/* First + Last name */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label htmlFor="firstName" style={labelStyle}>{t('Nombre', 'First Name')}</label>
                    <input id="firstName" name="firstName" type="text" required defaultValue={defaultFirstName} style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="lastName" style={labelStyle}>{t('Apellido', 'Last Name')}</label>
                    <input id="lastName" name="lastName" type="text" required defaultValue={defaultLastName} style={inputStyle} />
                  </div>
                </div>

                {/* Phone + DOB */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label htmlFor="telefono" style={labelStyle}>{t('Teléfono', 'Phone')}</label>
                    <input
                      id="telefono"
                      name="telefono"
                      type="tel"
                      required
                      placeholder="(619) 555-0100"
                      value={telefono}
                      onChange={(e) => setTelefono(formatPhone(e.target.value))}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label htmlFor="fechaNacimiento" style={labelStyle}>{t('Fecha de Nacimiento', 'Date of Birth')}</label>
                    <input
                      id="fechaNacimiento"
                      name="fechaNacimiento"
                      type="text"
                      required
                      placeholder="mm/dd/yyyy"
                      value={fechaNacimiento}
                      onChange={(e) => setFechaNacimiento(formatDate(e.target.value))}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Sex */}
                <div>
                  <span style={labelStyle}>{t('Sexo', 'Sex')}</span>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {(['Masculino', 'Femenino', 'Otro'] as const).map((s) => (
                      <button key={s} type="button" onClick={() => setSexo(s)} style={toggleBtnStyle(sexo === s)}>
                        {s === 'Masculino' ? t('Masculino', 'Male') : s === 'Femenino' ? t('Femenino', 'Female') : t('Otro', 'Other')}
                      </button>
                    ))}
                  </div>
                </div>

                <SectionDivider label={t('Contacto y Ubicación', 'Contact & Location')} />

                {/* Address */}
                <div>
                  <label htmlFor="direccion" style={labelStyle}>{t('Dirección', 'Address')}</label>
                  <input id="direccion" name="direccion" type="text" style={inputStyle} />
                </div>

                {/* City + ZIP */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label htmlFor="ciudad" style={labelStyle}>{t('Ciudad', 'City')}</label>
                    <input id="ciudad" name="ciudad" type="text" style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="zip" style={labelStyle}>ZIP</label>
                    <input id="zip" name="zip" type="text" inputMode="numeric" pattern="[0-9]*" style={inputStyle} />
                  </div>
                </div>

                <SectionDivider label={t('Programa', 'Program')} />

                {/* Preferred Language */}
                <div>
                  <span style={labelStyle}>{t('Idioma Preferido', 'Preferred Language')}</span>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {(['English', 'Español'] as const).map((lang) => (
                      <button key={lang} type="button" onClick={() => setIdioma(lang)} style={toggleBtnStyle(idioma === lang)}>
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weight Unit + Goal Weight */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <span style={labelStyle}>{t('Unidad de Peso', 'Weight Unit')}</span>
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
                      {t('Peso Meta', 'Goal Weight')} ({unidadDePeso})
                    </label>
                    <input
                      id="pesoMeta"
                      name="pesoMeta"
                      type="number"
                      min="0"
                      required
                      placeholder={unidadDePeso === 'Lbs' ? '150' : '68'}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* How did you find us */}
                <div>
                  <span style={labelStyle}>{t('¿Cómo Nos Conociste?', 'How Did You Find Us?')}</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {([
                      ['Referido',      t('Referido', 'Referral')],
                      ['Anuncio',       t('Anuncio', 'Ad')],
                      ['Google search', 'Google Search'],
                      ['Redes Sociales', t('Redes Sociales', 'Social Media')],
                    ] as [string, string][]).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setComoNosConocio(value)}
                        style={{ ...toggleBtnStyle(comoNosConocio === value), flex: 'none' }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <SectionDivider label={t('Metas y Salud', 'Goals & Health')} />

                {/* Client Goal */}
                <div>
                  <label htmlFor="metaDelCliente" style={labelStyle}>{t('Meta del Cliente', 'Client Goal')}</label>
                  <textarea
                    id="metaDelCliente"
                    name="metaDelCliente"
                    required
                    placeholder={t(
                      'Describe tu meta principal (ej. bajar de peso, mejorar energía)...',
                      'Describe your main goal (e.g. lose weight, improve energy)...'
                    )}
                    style={textareaStyle}
                  />
                </div>

                {/* Conditions / Allergies */}
                <div>
                  <label htmlFor="condiciones" style={labelStyle}>
                    {t('Condiciones Especiales / Alergias', 'Special Conditions / Allergies')}
                  </label>
                  <textarea
                    id="condiciones"
                    name="condiciones"
                    placeholder={t(
                      'Lista cualquier condición médica o alergia relevante (opcional)...',
                      'List any relevant medical conditions or allergies (optional)...'
                    )}
                    style={textareaStyle}
                  />
                </div>

                <SectionDivider label={t('Términos', 'Terms')} />

                {/* Terms box */}
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '16px',
                  fontSize: 12,
                  color: '#9A9590',
                  lineHeight: 1.8,
                }}>
                  {t(
                    'Al completar este registro, confirmo que la información proporcionada es verídica. Autorizo a AQSLIM a contactarme para coordinar mi programa de salud y acepto su política de privacidad.',
                    'By completing this registration, I confirm that the provided information is truthful. I authorize AQSLIM to contact me to coordinate my health program and accept their privacy policy.'
                  )}
                </div>

                {/* Terms checkbox */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={aceptoTerminos}
                    onChange={(e) => setAceptoTerminos(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#C9A84C', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13, color: aceptoTerminos ? '#FAFAF8' : '#9A9590' }}>
                    {t('He leído y acepto los términos anteriores', 'I have read and accept the terms above')}
                  </span>
                </label>

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
                    padding: '14px 32px',
                    fontSize: 11,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    fontFamily: 'Montserrat, sans-serif',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    fontWeight: 500,
                    alignSelf: 'flex-start',
                    marginTop: 8,
                  }}
                >
                  {isPending ? t('Guardando...', 'Saving...') : t('Continuar', 'Continue')}
                </button>
              </form>
            </>
          )}

          {step === 'next-steps' && (
            <>
              <p style={{ fontSize: 11, color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
                Perfil guardado
              </p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 400, marginBottom: 8 }}>
                Prepara tu primera consulta
              </h1>
              <p style={{ fontSize: 13, color: '#9A9590', marginBottom: 40, lineHeight: 1.7 }}>
                Completa los siguientes pasos antes de tu cita inicial.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Step 1 — Schedule */}
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(201,168,76,0.3)',
                  padding: '24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: '#C9A84C', minWidth: 28 }}>01</span>
                    <div>
                      <div style={{ fontSize: 13, color: '#FAFAF8', marginBottom: 4 }}>Agenda tu consulta inicial</div>
                      <div style={{ fontSize: 12, color: '#9A9590' }}>Selecciona el horario que mejor se adapte a ti.</div>
                    </div>
                  </div>
                  <a
                    href={SCHEDULING_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#C9A84C', color: '#0A0A0A',
                      padding: '10px 20px', fontSize: 11,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      fontFamily: 'Montserrat, sans-serif', fontWeight: 500,
                      textDecoration: 'none', whiteSpace: 'nowrap',
                    }}
                  >
                    Agendar →
                  </a>
                </div>

                {/* Step 2 — Questionnaire */}
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  padding: '24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: '#6A6560', minWidth: 28 }}>02</span>
                    <div>
                      <div style={{ fontSize: 13, color: '#9A9590', marginBottom: 4 }}>Cuestionario de síntomas</div>
                      <div style={{ fontSize: 12, color: '#6A6560' }}>Disponible próximamente en tu portal.</div>
                    </div>
                  </div>
                  <span style={{
                    border: '1px solid rgba(255,255,255,0.1)', color: '#6A6560',
                    padding: '10px 20px', fontSize: 11,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    fontFamily: 'Montserrat, sans-serif',
                  }}>
                    Próximamente
                  </span>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400&family=Montserrat:wght@300;400;500&display=swap" />
    </div>
  )
}
