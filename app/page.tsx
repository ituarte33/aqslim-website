import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0A0A0A',
      padding: '40px 20px',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: 11, letterSpacing: '0.3em', color: '#C9A84C', marginBottom: 24, textTransform: 'uppercase' }}>
        El Cajon, California
      </p>

      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 400, letterSpacing: '0.08em', marginBottom: 16 }}>
        AQ<span style={{ color: '#C9A84C' }}>SLIM</span>
      </h1>

      <p style={{ fontSize: 13, letterSpacing: '0.2em', color: '#9A9590', textTransform: 'uppercase', marginBottom: 48 }}>
        Wellness Center
      </p>

      <Link href="/sign-in" className="btn-gold">
        Patient Portal
      </Link>

      <p style={{ marginTop: 48, fontSize: 12, color: '#6A6560' }}>
        (619) 392-0797 &nbsp;·&nbsp; 270 E Douglas Ave, El Cajon, CA 92020
      </p>

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=Montserrat:wght@300;400;500&display=swap" />
    </main>
  )
}
