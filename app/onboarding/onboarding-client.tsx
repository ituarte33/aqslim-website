'use client'

import { useState, useTransition } from 'react'
import { UserButton } from '@clerk/nextjs'
import { saveProfile } from './actions'

// ─── PASTE YOUR SQUARESPACE SCHEDULING LINK HERE ───────────────────────────
const SCHEDULING_URL = 'https://book.squareup.com/appointments/46af1166-2cd2-4127-b94f-531a768d54c9/location/8PN49DRQ1C6TC/services'
// ────────────────────────────────────────────────────────────────────────────

type Props = {
  defaultNombre: string
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

const labelStyle = {
  fontSize: 10,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: '#9A9590',
  display: 'block',
  marginBottom: 8,
}

export function OnboardingClient({ defaultNombre }: Props) {
  const [step, setStep] = useState<'profile' | 'next-steps'>('profile')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await saveProfile(formData)
        setStep('next-steps')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar')
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', width: '100%' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>

          {step === 'profile' && (
            <>
              <p style={{ fontSize: 11, color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
                Bienvenido a AQSLIM
              </p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 400, marginBottom: 8 }}>
                Completa tu perfil
              </h1>
              <p style={{ fontSize: 13, color: '#9A9590', marginBottom: 40, lineHeight: 1.7 }}>
                Solo necesitamos un par de datos para empezar.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <label htmlFor="nombre" style={labelStyle}>Nombre completo</label>
                  <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    required
                    defaultValue={defaultNombre}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label htmlFor="telefono" style={labelStyle}>Teléfono</label>
                  <input
                    id="telefono"
                    name="telefono"
                    type="tel"
                    required
                    placeholder="(619) 555-0100"
                    style={inputStyle}
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
                    padding: '14px 32px',
                    fontSize: 11,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    fontFamily: 'Montserrat, sans-serif',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    fontWeight: 500,
                    alignSelf: 'flex-start',
                  }}
                >
                  {isPending ? 'Guardando...' : 'Continuar'}
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
