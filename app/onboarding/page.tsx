import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'

export default async function OnboardingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <p style={{ fontSize: 11, color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>
          Bienvenido a AQSLIM
        </p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 400, marginBottom: 16, textAlign: 'center' }}>
          Tu cuenta está lista
        </h1>
        <p style={{ fontSize: 14, color: '#9A9590', lineHeight: 1.8, textAlign: 'center', marginBottom: 48 }}>
          El siguiente paso es agendar tu primera consulta con el Dr. Ituarte. Durante tu cita inicial, realizaremos una evaluación completa para diseñar tu plan personalizado.
        </p>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Steps */}
          {[
            { num: '01', title: 'Agenda tu consulta inicial', desc: 'Selecciona el horario que mejor se adapte a ti.' },
            { num: '02', title: 'Completa tu historial médico', desc: 'Un cuestionario breve para conocer tu estado de salud actual.' },
            { num: '03', title: 'Prepara tu primera visita', desc: 'Te enviaremos instrucciones por correo antes de tu cita.' },
          ].map(step => (
            <div key={step.num} style={{
              display: 'flex', gap: 20, alignItems: 'flex-start',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '20px 24px',
            }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: '#C9A84C', minWidth: 36 }}>
                {step.num}
              </span>
              <div>
                <div style={{ fontSize: 13, color: '#FAFAF8', marginBottom: 4 }}>{step.title}</div>
                <div style={{ fontSize: 12, color: '#9A9590' }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40, padding: '20px 24px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', width: '100%' }}>
          <p style={{ fontSize: 13, color: '#9A9590', margin: 0, textAlign: 'center' }}>
            Para agendar tu cita llama o escribe al{' '}
            <span style={{ color: '#C9A84C' }}>(619) 555-0100</span>{' '}
            o envía un correo a{' '}
            <span style={{ color: '#C9A84C' }}>aqslim@gmail.com</span>
          </p>
        </div>
      </div>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400&family=Montserrat:wght@300;400;500&display=swap" />
    </div>
  )
}
