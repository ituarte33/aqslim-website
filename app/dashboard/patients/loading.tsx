export default function Loading() {
  return (
    <main style={{ minHeight: '100vh', padding: '112px 40px 48px', color: '#FAFAF8', background: '#0A0A0A' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <h1 style={{ margin: '8px 0 32px', fontFamily: 'Playfair Display, serif', fontSize: 42, fontWeight: 400 }}>Pacientes</h1>
        <div style={{ width: 420, maxWidth: '100%', height: 42, border: '1px solid rgba(201,168,76,.28)', background: 'rgba(255,255,255,.035)' }} />
        <p style={{ margin: '16px 0 28px', color: '#C9A84C', fontFamily: 'Montserrat, sans-serif', fontSize: 13 }}>Cargando pacientes… / Loading patients…</p>
        {[0, 1, 2, 3, 4, 5].map(row => (
          <div key={row} style={{ height: 48, marginBottom: 1, opacity: 1 - row * .1, background: 'linear-gradient(90deg, rgba(255,255,255,.025), rgba(201,168,76,.07), rgba(255,255,255,.025))' }} />
        ))}
      </div>
    </main>
  )
}
