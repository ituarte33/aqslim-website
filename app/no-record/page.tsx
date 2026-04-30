import { UserButton } from '@clerk/nextjs'

export default function NoRecordPage() {
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 }}>
        <p style={{ fontSize: 11, color: '#9A9590', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>
          Cuenta no encontrada
        </p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 400, marginBottom: 16 }}>
          Tu expediente no está vinculado aún
        </h1>
        <p style={{ fontSize: 14, color: '#9A9590', maxWidth: 420, lineHeight: 1.7 }}>
          Tu cuenta ha sido creada exitosamente. Contacta a tu nutriólogo para vincular tu expediente con este portal.
        </p>
      </div>

      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400&family=Montserrat:wght@300;400;500&display=swap" />
    </div>
  )
}
