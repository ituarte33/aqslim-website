'use client'

import { useState, useTransition } from 'react'
import { UserButton } from '@clerk/nextjs'
import { saveProfile, acceptTerminos, updateProfileAndAcceptTerminos } from './actions'
import { pt } from '@/lib/portal-type'
import { BookingWidget } from './booking-widget'

type ClienteData = {
  nombre?: string
  telefono?: string
  fechaNacimiento?: string
  sexo?: string
  direccion?: string
  ciudad?: string
  zip?: number
  idioma?: string
  unidadDePeso?: string
  pesoMeta?: number
  metaDelCliente?: string
  condiciones?: string
  comoNosConocio?: string
}

type BookingInfo = {
  clienteId: string
  nombre: string
  email?: string
  telefono?: string
}

type Props = {
  defaultFirstName: string
  defaultLastName: string
  initialStep?: 'profile' | 'confirm' | 'next-steps'
  step1Done?: boolean
  cuestionarioDone?: boolean
  allDone?: boolean
  clienteData?: ClienteData
  bookingInfo?: BookingInfo
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(201,168,76,0.3)',
  color: '#FAFAF8',
  padding: '12px 16px',
  fontSize: pt.base,
  outline: 'none',
  fontFamily: pt.sans,
  boxSizing: 'border-box' as const,
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

function DisclaimerBox({ lang }: { lang: 'en' | 'es' }) {
  const en = lang === 'en'
  const sections = [
    {
      num: '1',
      title: en ? 'Nutritional & Supplementation Program' : 'Programa Nutricional y de Suplementación',
      text: en
        ? 'All dietary guidance and supplement recommendations provided by AQSLIM Wellness Center are for educational purposes only and are not intended to treat, cure, diagnose, or prevent any disease or medical condition. Individual results may vary. AQSLIM coaches are wellness educators — not licensed dietitians, nutritionists, or medical professionals. You agree to consult your physician before making any dietary or supplementation changes, particularly if you have a pre-existing medical condition, are pregnant, nursing, or taking prescription medications.'
        : 'Todas las recomendaciones dietéticas y de suplementos proporcionadas por AQSLIM Wellness Center son únicamente con fines educativos y no están destinadas a tratar, curar, diagnosticar ni prevenir ninguna enfermedad o condición médica. Los resultados individuales pueden variar. Los coaches de AQSLIM son educadores de bienestar — no son dietistas, nutriólogos ni médicos con licencia. Usted se compromete a consultar a su médico antes de hacer cambios en su dieta o suplementación, especialmente si tiene alguna condición médica preexistente, está embarazada, en período de lactancia o tomando medicamentos recetados.',
    },
    {
      num: '2',
      title: en ? 'Auriculotherapy' : 'Auriculoterapia',
      text: en
        ? 'Auriculotherapy is a complementary wellness technique involving the placement of small pellets (balines) on specific points of the outer ear. It is not a substitute for medical treatment and is offered solely as a complementary wellness service. By proceeding, you confirm that you have informed your AQSLIM coach of any known allergies, skin sensitivities, or medical conditions relevant to this service, and that you consent to receive auriculotherapy sessions voluntarily. You understand you may discontinue at any time.'
        : 'La auriculoterapia es una técnica de bienestar complementaria que consiste en la colocación de pequeños balines en puntos específicos del oído externo. No es un sustituto del tratamiento médico y se ofrece únicamente como un servicio de bienestar complementario. Al continuar, confirma que ha informado a su coach de AQSLIM sobre cualquier alergia, sensibilidad en la piel o condición médica relevante para este servicio, y que consiente voluntariamente recibir sesiones de auriculoterapia. Entiende que puede interrumpirlas en cualquier momento.',
    },
    {
      num: '3',
      title: en ? 'Privacy & Data Collection' : 'Privacidad y Recopilación de Datos',
      text: en
        ? 'The personal and health information you provide is collected solely for the purpose of delivering wellness services at AQSLIM Wellness Center. Your information will not be sold, shared, or disclosed to third parties without your consent, except as required by law. By submitting this form, you consent to the collection and use of your information for the purposes described above.'
        : 'La información personal y de salud que proporciona se recopila únicamente para brindarle los servicios de bienestar de AQSLIM Wellness Center. Su información no será vendida, compartida ni divulgada a terceros sin su consentimiento, salvo cuando lo exija la ley. Al enviar este formulario, usted consiente la recopilación y uso de su información para los fines descritos anteriormente.',
    },
    {
      num: '4',
      title: en ? 'Assumption of Responsibility' : 'Asunción de Responsabilidad',
      text: en
        ? "By checking the box below, you acknowledge that you have read and understood this policy in its entirety, that you voluntarily choose to participate in AQSLIM's wellness programs, and that you release AQSLIM Wellness Center, its coaches, employees, and affiliates from liability for outcomes resulting from your participation. You confirm that all information provided is accurate and complete."
        : 'Al marcar la casilla a continuación, usted reconoce que ha leído y comprendido esta política en su totalidad, que elige voluntariamente participar en los programas de bienestar de AQSLIM, y que exonera a AQSLIM Wellness Center, sus coaches, empleados y afiliados de cualquier responsabilidad por los resultados derivados de su participación. Confirma que toda la información proporcionada es verídica y completa.',
    },
  ]

  return (
    <div style={{
      maxHeight: 320,
      overflowY: 'auto',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(201,168,76,0.25)',
      padding: '20px 22px',
      fontSize: pt.sm,
      lineHeight: 1.75,
    }}>
      {/* Important notice */}
      <div style={{
        borderLeft: '3px solid #C9A84C',
        background: 'rgba(201,168,76,0.06)',
        padding: '10px 14px',
        marginBottom: 18,
      }}>
        <div style={{ fontSize: pt.xs, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: 6 }}>
          ⚠ {en ? 'Important Notice — Not Medical Advice' : 'Aviso Importante — No es Consejo Médico'}
        </div>
        <p style={{ margin: 0, color: '#9A9590' }}>
          {en
            ? (<><strong style={{ color: '#FAFAF8' }}>AQSLIM Wellness Center coaches are not licensed medical doctors, physicians, or healthcare providers.</strong> All programs, recommendations, and information provided are strictly <strong style={{ color: '#FAFAF8' }}>educational and informational in nature</strong>. Nothing presented at AQSLIM constitutes medical advice, a medical diagnosis, or a prescription of any kind. Before beginning any program, consult your licensed physician.</>)
            : (<><strong style={{ color: '#FAFAF8' }}>Los coaches de AQSLIM Wellness Center no son médicos, doctores ni proveedores de servicios de salud con licencia.</strong> Todos los programas, recomendaciones e información proporcionados son de carácter estrictamente <strong style={{ color: '#FAFAF8' }}>educativo e informativo</strong>. Nada de lo presentado en AQSLIM constituye consejo médico, diagnóstico médico ni prescripción de ningún tipo. Antes de comenzar cualquier programa, consulte a su médico.</>)
          }
        </p>
      </div>

      {/* Numbered sections */}
      {sections.map((s, i) => (
        <div key={s.num}>
          {i > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '14px 0' }} />}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 20, height: 20, background: '#C9A84C', color: '#0A0A0A',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1,
            }}>
              {s.num}
            </div>
            <div>
              <div style={{ fontSize: pt.xs, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FAFAF8', marginBottom: 5 }}>
                {s.title}
              </div>
              <p style={{ margin: 0, color: '#9A9590' }}>{s.text}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function OnboardingClient({ defaultFirstName, defaultLastName, initialStep = 'profile', step1Done: initStep1Done = false, cuestionarioDone = false, allDone = false, clienteData, bookingInfo }: Props) {
  const [step, setStep] = useState<'profile' | 'confirm' | 'next-steps'>(initialStep)
  const [step1Done, setStep1Done] = useState(initStep1Done)
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
        <span style={{ fontFamily: pt.serif, fontSize: pt.lg, letterSpacing: '0.08em' }}>
          AQ<span style={{ color: '#C9A84C' }}>SLIM</span>
        </span>
        <UserButton />
      </header>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '48px 40px', width: '100%' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>

          {step === 'profile' && (
            <>
              <p style={{ fontSize: pt.sm, color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
                Bienvenido a AQSLIM
              </p>
              <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 8 }}>
                {t('Completa tu perfil', 'Complete your profile')}
              </h1>
              <p style={{ fontSize: pt.base, color: '#9A9590', marginBottom: 36, lineHeight: 1.7 }}>
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

                <SectionDivider label={t('Política de Privacidad y Consentimiento', 'Privacy Policy & Consent')} />

                <DisclaimerBox lang={idioma === 'English' ? 'en' : 'es'} />

                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={aceptoTerminos}
                    onChange={(e) => setAceptoTerminos(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#C9A84C', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: pt.base, color: aceptoTerminos ? '#FAFAF8' : '#9A9590' }}>
                    {t('He leído y acepto los términos anteriores', 'I have read and accept the above terms')}
                  </span>
                </label>

                {error && (
                  <p style={{ fontSize: pt.sm, color: '#ff6b6b', margin: 0 }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  style={{
                    background: isPending ? 'rgba(201,168,76,0.4)' : '#C9A84C',
                    color: '#0A0A0A',
                    border: 'none',
                    padding: '14px 32px',
                    fontSize: pt.sm,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    fontFamily: pt.sans,
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

          {step === 'confirm' && (
            <ConfirmStep
              clienteData={clienteData ?? {}}
              idioma={idioma}
              onConfirmed={() => setStep('next-steps')}
            />
          )}

          {step === 'next-steps' && (
            <>
              <p style={{ fontSize: pt.sm, color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
                {allDone ? 'Todo listo' : 'Perfil guardado'}
              </p>
              <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 8 }}>
                {allDone ? '¡Estás listo para tu consulta!' : 'Prepara tu primera consulta'}
              </h1>
              <p style={{ fontSize: pt.base, color: '#9A9590', marginBottom: 40, lineHeight: 1.7 }}>
                {allDone
                  ? 'Hemos recibido toda tu información. Tu expediente estará disponible aquí una vez que se registre tu primera consulta.'
                  : 'Completa los siguientes pasos antes de tu cita inicial.'
                }
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Step 1 — Schedule */}
                <div style={{
                  background: step1Done ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.03)',
                  border: step1Done ? '1px solid rgba(201,168,76,0.6)' : '1px solid rgba(201,168,76,0.3)',
                  transition: 'all 0.3s',
                  overflow: 'hidden',
                }}>
                  {/* Card header */}
                  <div style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <span style={{ fontFamily: pt.serif, fontSize: pt.lg, color: '#C9A84C', minWidth: 28 }}>
                        {step1Done ? '✓' : '01'}
                      </span>
                      <div>
                        <div style={{ fontSize: pt.base, color: '#FAFAF8', marginBottom: 4 }}>Agenda tu consulta inicial</div>
                        <div style={{ fontSize: pt.sm, color: '#9A9590' }}>
                          {step1Done ? 'Cita agendada.' : 'Selecciona el horario que mejor se adapte a ti.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!step1Done && bookingInfo && (
                    <div style={{ padding: '0 24px 24px' }}>
                      <BookingWidget
                        clienteId={bookingInfo.clienteId}
                        nombre={bookingInfo.nombre}
                        email={bookingInfo.email}
                        telefono={bookingInfo.telefono}
                        allowedServices={['New Client', 'New Beggining']}
                        lang={(idioma === 'English' || clienteData?.idioma === 'English') ? 'en' : 'es'}
                        onBooked={() => setStep1Done(true)}
                      />
                    </div>
                  )}
                </div>

                {/* Step 2 — Questionnaire */}
                <div style={{
                  background: cuestionarioDone ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.03)',
                  border: cuestionarioDone ? '1px solid rgba(201,168,76,0.6)' : '1px solid rgba(201,168,76,0.3)',
                  padding: '24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                  transition: 'all 0.3s',
                }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: pt.serif, fontSize: pt.lg, color: '#C9A84C', minWidth: 28 }}>
                      {cuestionarioDone ? '✓' : '02'}
                    </span>
                    <div>
                      <div style={{ fontSize: pt.base, color: '#FAFAF8', marginBottom: 4 }}>Cuestionario de síntomas</div>
                      <div style={{ fontSize: pt.sm, color: '#9A9590' }}>
                        {cuestionarioDone ? 'Cuestionario completado.' : 'Cuéntanos cómo te has sentido.'}
                      </div>
                    </div>
                  </div>
                  {!cuestionarioDone && (
                    <a
                      href="/cuestionario"
                      style={{
                        background: '#C9A84C', color: '#0A0A0A',
                        padding: '10px 20px', fontSize: pt.sm,
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        fontFamily: pt.sans, fontWeight: 500,
                        textDecoration: 'none', whiteSpace: 'nowrap',
                      }}
                    >
                      Completar →
                    </a>
                  )}
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

function ConfirmStep({
  clienteData,
  idioma,
  onConfirmed,
}: {
  clienteData: ClienteData
  idioma: 'English' | 'Español' | null
  onConfirmed: () => void
}) {
  const es = idioma !== 'English'
  const [isEditing, setIsEditing] = useState(false)

  return isEditing ? (
    <EditProfileForm
      clienteData={clienteData}
      es={es}
      onSaved={onConfirmed}
      onCancel={() => setIsEditing(false)}
    />
  ) : (
    <ViewProfile
      clienteData={clienteData}
      es={es}
      onEdit={() => setIsEditing(true)}
      onConfirmed={onConfirmed}
    />
  )
}

function ViewProfile({
  clienteData,
  es,
  onEdit,
  onConfirmed,
}: {
  clienteData: ClienteData
  es: boolean
  onEdit: () => void
  onConfirmed: () => void
}) {
  const [accepted, setAccepted] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function InfoField({ label, value }: { label: string; value?: string | number }) {
    return (
      <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: pt.xs, color: '#6A6560', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: labelStyle.fontFamily as string, marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: pt.base, color: value ? '#FAFAF8' : '#3A3530' }}>
          {value ?? (es ? 'No especificado' : 'Not specified')}
        </div>
      </div>
    )
  }

  const pesoDisplay = clienteData.pesoMeta
    ? `${clienteData.pesoMeta} ${clienteData.unidadDePeso ?? ''}`
    : undefined

  function handleConfirm() {
    if (!accepted) {
      setError(es ? 'Debes aceptar los términos para continuar.' : 'You must accept the terms to continue.')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await acceptTerminos()
        onConfirmed()
      } catch (err) {
        setError(err instanceof Error ? err.message : (es ? 'Error al confirmar.' : 'Error confirming.'))
      }
    })
  }

  return (
    <>
      <p style={{ fontSize: pt.sm, color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
        {es ? 'Bienvenido a AQSLIM' : 'Welcome to AQSLIM'}
      </p>
      <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 8 }}>
        {es ? 'Verifica tu información' : 'Verify your information'}
      </h1>
      <p style={{ fontSize: pt.base, color: '#9A9590', marginBottom: 32, lineHeight: 1.7 }}>
        {es
          ? 'Tu perfil ya está creado. Revisa que tus datos estén correctos y acepta los términos para continuar.'
          : 'Your profile is already set up. Please review your information and accept the terms to continue.'}
      </p>

      <div style={{ border: '1px solid rgba(201,168,76,0.2)', padding: '0 24px', marginBottom: 12 }}>
        <InfoField label={es ? 'Nombre Completo' : 'Full Name'}          value={clienteData.nombre} />
        <InfoField label={es ? 'Teléfono' : 'Phone'}                     value={clienteData.telefono} />
        <InfoField label={es ? 'Fecha de Nacimiento' : 'Date of Birth'}  value={clienteData.fechaNacimiento} />
        <InfoField label={es ? 'Sexo' : 'Sex'}                           value={clienteData.sexo} />
        <InfoField label={es ? 'Dirección' : 'Address'}                  value={[clienteData.direccion, clienteData.ciudad, clienteData.zip].filter(Boolean).join(', ') || undefined} />
        <InfoField label={es ? 'Idioma Preferido' : 'Preferred Language'} value={clienteData.idioma} />
        <InfoField label={es ? 'Peso Meta' : 'Goal Weight'}              value={pesoDisplay} />
        <InfoField label={es ? 'Meta del Cliente' : 'Client Goal'}       value={clienteData.metaDelCliente} />
        {clienteData.condiciones && (
          <InfoField label={es ? 'Condiciones / Alergias' : 'Conditions / Allergies'} value={clienteData.condiciones} />
        )}
      </div>

      <button
        onClick={onEdit}
        style={{
          background: 'none', border: '1px solid rgba(201,168,76,0.4)',
          color: '#C9A84C', padding: '9px 20px', fontSize: pt.sm,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          fontFamily: labelStyle.fontFamily as string, cursor: 'pointer',
          fontWeight: 500, marginBottom: 28, display: 'inline-block',
        }}
      >
        {es ? 'Editar información' : 'Edit information'}
      </button>

      <DisclaimerBox lang={es ? 'es' : 'en'} />

      <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginTop: 16, marginBottom: 20 }}>
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: '#C9A84C', cursor: 'pointer', flexShrink: 0 }}
        />
        <span style={{ fontSize: pt.base, color: accepted ? '#FAFAF8' : '#9A9590' }}>
          {es ? 'La información es correcta y acepto los términos anteriores' : 'The information is correct and I accept the above terms'}
        </span>
      </label>

      {error && <p style={{ fontSize: pt.sm, color: '#ff6b6b', margin: '0 0 16px' }}>{error}</p>}

      <button
        onClick={handleConfirm}
        disabled={isPending}
        style={{
          background: isPending ? 'rgba(201,168,76,0.4)' : '#C9A84C',
          color: '#0A0A0A', border: 'none',
          padding: '14px 32px', fontSize: pt.sm,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          fontFamily: labelStyle.fontFamily as string, cursor: isPending ? 'not-allowed' : 'pointer',
          fontWeight: 500,
        }}
      >
        {isPending
          ? (es ? 'Confirmando...' : 'Confirming...')
          : (es ? 'Confirmar y continuar' : 'Confirm and continue')}
      </button>
    </>
  )
}

function isoToMmddyyyy(iso?: string): string {
  if (!iso) return ''
  const [yyyy, mm, dd] = iso.split('-')
  if (!yyyy || !mm || !dd) return ''
  return `${mm}/${dd}/${yyyy}`
}

function EditProfileForm({
  clienteData,
  es,
  onSaved,
  onCancel,
}: {
  clienteData: ClienteData
  es: boolean
  onSaved: () => void
  onCancel: () => void
}) {
  const nameParts = (clienteData.nombre ?? '').split(' ')
  const [defaultFirst] = nameParts
  const defaultLast = nameParts.slice(1).join(' ')

  const [sexo, setSexo]                     = useState<'Masculino' | 'Femenino' | 'Otro' | null>(
    (clienteData.sexo as 'Masculino' | 'Femenino' | 'Otro') ?? null
  )
  const [idioma, setIdioma]                 = useState<'English' | 'Español' | null>(
    (clienteData.idioma as 'English' | 'Español') ?? null
  )
  const [unidadDePeso, setUnidadDePeso]     = useState<'Lbs' | 'Kg'>(
    (clienteData.unidadDePeso as 'Lbs' | 'Kg') ?? 'Lbs'
  )
  const [comoNosConocio, setComoNosConocio] = useState<string | null>(clienteData.comoNosConocio ?? null)
  const [telefono, setTelefono]             = useState(clienteData.telefono ?? '')
  const [fechaNacimiento, setFechaNacimiento] = useState(isoToMmddyyyy(clienteData.fechaNacimiento))
  const [aceptoTerminos, setAceptoTerminos]  = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [isPending, startTransition]        = useTransition()

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

  function toggleBtn(selected: boolean): React.CSSProperties {
    return {
      flex: 1, padding: '11px 14px', fontSize: pt.base,
      fontFamily: labelStyle.fontFamily as string, fontWeight: 500, cursor: 'pointer',
      border: selected ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.3)',
      background: selected ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
      color: selected ? '#C9A84C' : '#9A9590', transition: 'all 0.15s',
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!sexo)  { setError(es ? 'Por favor selecciona tu sexo.' : 'Please select your sex.'); return }
    if (!idioma) { setError(es ? 'Por favor selecciona tu idioma preferido.' : 'Please select your preferred language.'); return }
    if (fechaNacimiento.length < 10) { setError(es ? 'Por favor ingresa tu fecha de nacimiento completa (mm/dd/aaaa).' : 'Please enter your complete date of birth (mm/dd/yyyy).'); return }
    if (!comoNosConocio) { setError(es ? 'Por favor indícanos cómo nos conociste.' : 'Please tell us how you found us.'); return }
    if (!aceptoTerminos) { setError(es ? 'Debes aceptar los términos para continuar.' : 'You must accept the terms to continue.'); return }

    const formData = new FormData(e.currentTarget)
    formData.set('telefono', telefono)
    formData.set('fechaNacimiento', fechaNacimiento)
    formData.set('sexo', sexo)
    formData.set('idioma', idioma)
    formData.set('unidadDePeso', unidadDePeso)
    formData.set('comoNosConocio', comoNosConocio)

    startTransition(async () => {
      try {
        await updateProfileAndAcceptTerminos(formData)
        onSaved()
      } catch (err) {
        setError(err instanceof Error ? err.message : (es ? 'Error al guardar.' : 'Error saving.'))
      }
    })
  }

  return (
    <>
      <p style={{ fontSize: pt.sm, color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
        {es ? 'Editar información' : 'Edit information'}
      </p>
      <h1 style={{ fontFamily: pt.serif, fontSize: pt.h1, fontWeight: 400, marginBottom: 8 }}>
        {es ? 'Actualiza tu perfil' : 'Update your profile'}
      </h1>
      <p style={{ fontSize: pt.base, color: '#9A9590', marginBottom: 32, lineHeight: 1.7 }}>
        {es ? 'Corrige cualquier dato incorrecto antes de continuar.' : 'Correct any incorrect information before continuing.'}
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <SectionDivider label={es ? 'Información Personal' : 'Personal Information'} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label htmlFor="ef-firstName" style={labelStyle}>{es ? 'Nombre' : 'First Name'}</label>
            <input id="ef-firstName" name="firstName" type="text" required defaultValue={defaultFirst} style={inputStyle} />
          </div>
          <div>
            <label htmlFor="ef-lastName" style={labelStyle}>{es ? 'Apellido' : 'Last Name'}</label>
            <input id="ef-lastName" name="lastName" type="text" required defaultValue={defaultLast} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label htmlFor="ef-telefono" style={labelStyle}>{es ? 'Teléfono' : 'Phone'}</label>
            <input
              id="ef-telefono" name="telefono" type="tel" required
              placeholder="(619) 555-0100"
              value={telefono}
              onChange={(e) => setTelefono(formatPhone(e.target.value))}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="ef-fechaNacimiento" style={labelStyle}>{es ? 'Fecha de Nacimiento' : 'Date of Birth'}</label>
            <input
              id="ef-fechaNacimiento" name="fechaNacimiento" type="text" required
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
              <button key={s} type="button" onClick={() => setSexo(s)} style={toggleBtn(sexo === s)}>
                {s === 'Masculino' ? (es ? 'Masculino' : 'Male') : s === 'Femenino' ? (es ? 'Femenino' : 'Female') : (es ? 'Otro' : 'Other')}
              </button>
            ))}
          </div>
        </div>

        <SectionDivider label={es ? 'Contacto y Ubicación' : 'Contact & Location'} />

        <div>
          <label htmlFor="ef-direccion" style={labelStyle}>{es ? 'Dirección' : 'Address'}</label>
          <input id="ef-direccion" name="direccion" type="text" defaultValue={clienteData.direccion ?? ''} style={inputStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label htmlFor="ef-ciudad" style={labelStyle}>{es ? 'Ciudad' : 'City'}</label>
            <input id="ef-ciudad" name="ciudad" type="text" defaultValue={clienteData.ciudad ?? ''} style={inputStyle} />
          </div>
          <div>
            <label htmlFor="ef-zip" style={labelStyle}>ZIP</label>
            <input id="ef-zip" name="zip" type="text" inputMode="numeric" pattern="[0-9]*" defaultValue={clienteData.zip ?? ''} style={inputStyle} />
          </div>
        </div>

        <SectionDivider label={es ? 'Programa' : 'Program'} />

        <div>
          <span style={labelStyle}>{es ? 'Idioma Preferido' : 'Preferred Language'}</span>
          <div style={{ display: 'flex', gap: 12 }}>
            {(['English', 'Español'] as const).map((l) => (
              <button key={l} type="button" onClick={() => setIdioma(l)} style={toggleBtn(idioma === l)}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <span style={labelStyle}>{es ? 'Unidad de Peso' : 'Weight Unit'}</span>
            <div style={{ display: 'flex', gap: 12 }}>
              {(['Lbs', 'Kg'] as const).map((u) => (
                <button key={u} type="button" onClick={() => setUnidadDePeso(u)} style={toggleBtn(unidadDePeso === u)}>{u}</button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="ef-pesoMeta" style={labelStyle}>{es ? 'Peso Meta' : 'Goal Weight'} ({unidadDePeso})</label>
            <input
              id="ef-pesoMeta" name="pesoMeta" type="number" min="0" required
              defaultValue={clienteData.pesoMeta ?? ''}
              placeholder={unidadDePeso === 'Lbs' ? '150' : '68'}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <span style={labelStyle}>{es ? '¿Cómo Nos Conociste?' : 'How Did You Find Us?'}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {([
              ['Referido',       es ? 'Referido'       : 'Referral'],
              ['Anuncio',        es ? 'Anuncio'        : 'Ad'],
              ['Google search',  'Google Search'],
              ['Redes Sociales', es ? 'Redes Sociales' : 'Social Media'],
            ] as [string, string][]).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setComoNosConocio(value)}
                style={{ ...toggleBtn(comoNosConocio === value), flex: 'none' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <SectionDivider label={es ? 'Metas y Salud' : 'Goals & Health'} />

        <div>
          <label htmlFor="ef-metaDelCliente" style={labelStyle}>{es ? 'Meta del Cliente' : 'Client Goal'}</label>
          <textarea
            id="ef-metaDelCliente" name="metaDelCliente" required
            defaultValue={clienteData.metaDelCliente ?? ''}
            placeholder={es ? 'Describe tu meta principal...' : 'Describe your main goal...'}
            style={textareaStyle}
          />
        </div>

        <div>
          <label htmlFor="ef-condiciones" style={labelStyle}>{es ? 'Condiciones / Alergias' : 'Conditions / Allergies'}</label>
          <textarea
            id="ef-condiciones" name="condiciones"
            defaultValue={clienteData.condiciones ?? ''}
            placeholder={es ? 'Opcional...' : 'Optional...'}
            style={textareaStyle}
          />
        </div>

        <SectionDivider label={es ? 'Política de Privacidad y Consentimiento' : 'Privacy Policy & Consent'} />

        <DisclaimerBox lang={es ? 'es' : 'en'} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={aceptoTerminos}
            onChange={(e) => setAceptoTerminos(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#C9A84C', cursor: 'pointer', flexShrink: 0 }}
          />
          <span style={{ fontSize: pt.base, color: aceptoTerminos ? '#FAFAF8' : '#9A9590' }}>
            {es ? 'He leído y acepto los términos anteriores' : 'I have read and accept the above terms'}
          </span>
        </label>

        {error && <p style={{ fontSize: pt.sm, color: '#ff6b6b', margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button
            type="submit"
            disabled={isPending}
            style={{
              background: isPending ? 'rgba(201,168,76,0.4)' : '#C9A84C',
              color: '#0A0A0A', border: 'none',
              padding: '14px 32px', fontSize: pt.sm,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              fontFamily: labelStyle.fontFamily as string,
              cursor: isPending ? 'not-allowed' : 'pointer', fontWeight: 500,
            }}
          >
            {isPending ? (es ? 'Guardando...' : 'Saving...') : (es ? 'Guardar y continuar' : 'Save and continue')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none', color: '#9A9590',
              border: '1px solid rgba(255,255,255,0.12)',
              padding: '14px 24px', fontSize: pt.sm,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              fontFamily: labelStyle.fontFamily as string, cursor: 'pointer',
            }}
          >
            {es ? 'Cancelar' : 'Cancel'}
          </button>
        </div>
      </form>
    </>
  )
}
