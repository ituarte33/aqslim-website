'use client'

import { useMemo, useState } from 'react'

type Patient = {
  id: string
  name: string
  email: string
  phone: string
  status: string
  language: string
  nextAppointment: string
  goal: string
}

export function ClinicPreviewClient({ patients }: { patients: Patient[] }) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return patients
    return patients.filter(patient =>
      [patient.name, patient.email, patient.phone].some(value => value.toLowerCase().includes(q))
    )
  }, [patients, query])

  const selected = patients.find(patient => patient.id === selectedId) ?? null

  return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#FAFAF8', fontFamily: 'Montserrat, Arial, sans-serif' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,10,10,.96)', borderBottom: '1px solid rgba(201,168,76,.28)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, letterSpacing: '.08em' }}>AQ<span style={{ color: '#C9A84C' }}>SLIM</span> Clinic</div>
          <div style={{ color: '#8E8881', fontSize: 12, marginTop: 4 }}>MYAQ-001-CLINIC-001 · PREVIEW · Founder-only</div>
        </div>
        <a href="/my-aqslim" style={{ color: '#C9A84C', textDecoration: 'none', fontSize: 13 }}>Abrir My AQSLIM ↗</a>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', minHeight: 'calc(100vh - 80px)' }}>
        <aside style={{ borderRight: '1px solid rgba(201,168,76,.18)', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ color: '#C9A84C', fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase' }}>Pacientes</div>
              <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: 30, margin: '6px 0 0' }}>Atención clínica</h1>
            </div>
          </div>

          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Buscar nombre, email o teléfono…"
            style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(201,168,76,.28)', color: '#FAFAF8', padding: '12px 14px', borderRadius: 10, outline: 'none', marginBottom: 14 }}
          />

          <div style={{ color: '#6F6A64', fontSize: 12, marginBottom: 10 }}>{filtered.length} pacientes</div>

          <div style={{ display: 'grid', gap: 8, maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingRight: 4 }}>
            {filtered.map(patient => {
              const active = selectedId === patient.id
              return (
                <button
                  key={patient.id}
                  onClick={() => setSelectedId(patient.id)}
                  style={{ textAlign: 'left', cursor: 'pointer', borderRadius: 10, padding: '13px 14px', border: active ? '1px solid #C9A84C' : '1px solid rgba(255,255,255,.08)', background: active ? 'rgba(201,168,76,.11)' : 'rgba(255,255,255,.025)', color: '#FAFAF8' }}
                >
                  <div style={{ fontSize: 14, marginBottom: 5 }}>{patient.name}</div>
                  <div style={{ fontSize: 11, color: '#8E8881' }}>{patient.phone || patient.email || 'Sin contacto registrado'}</div>
                </button>
              )
            })}
          </div>
        </aside>

        <section style={{ padding: 28 }}>
          {!selected ? (
            <div style={{ maxWidth: 760, margin: '70px auto', border: '1px solid rgba(201,168,76,.22)', background: 'rgba(255,255,255,.025)', borderRadius: 18, padding: 34 }}>
              <div style={{ color: '#C9A84C', fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase' }}>AQSLIM Clinic</div>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 40, fontWeight: 400, margin: '12px 0 14px' }}>Selecciona un paciente</h2>
              <p style={{ color: '#9A9590', lineHeight: 1.7, margin: 0 }}>Desde aquí podrás revisar entrevista, notas de consulta, mensajes y seguimientos sin entrar al portal personal My AQSLIM del paciente.</p>
            </div>
          ) : (
            <div style={{ maxWidth: 980, margin: '0 auto' }}>
              <div style={{ border: '1px solid rgba(201,168,76,.25)', borderRadius: 18, padding: 26, background: 'linear-gradient(135deg, rgba(201,168,76,.07), rgba(255,255,255,.02))', marginBottom: 18 }}>
                <div style={{ color: '#C9A84C', fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase' }}>Expediente</div>
                <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: 38, margin: '8px 0 10px' }}>{selected.name}</h2>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', color: '#9A9590', fontSize: 13 }}>
                  {selected.phone && <span>{selected.phone}</span>}
                  {selected.email && <span>{selected.email}</span>}
                  {selected.status && <span>Estado: {selected.status}</span>}
                  {selected.language && <span>Idioma: {selected.language}</span>}
                </div>
              </div>

              <nav style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 8, marginBottom: 18 }}>
                {['Resumen','Perfil de Bienestar','Notas','Mensajes','Seguimiento'].map((label, index) => (
                  <div key={label} style={{ border: '1px solid rgba(201,168,76,.18)', borderRadius: 10, padding: '12px 10px', textAlign: 'center', color: index === 0 ? '#C9A84C' : '#8E8881', background: index === 0 ? 'rgba(201,168,76,.08)' : 'rgba(255,255,255,.02)', fontSize: 12 }}>{label}</div>
                ))}
              </nav>

              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 16 }}>
                <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 22, background: 'rgba(255,255,255,.02)' }}>
                  <h3 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 400 }}>Resumen del paciente</h3>
                  <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
                    <div><div style={{ color: '#6F6A64', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}>Meta</div><div style={{ marginTop: 5, color: '#D9D5CF' }}>{selected.goal || 'Sin meta registrada'}</div></div>
                    <div><div style={{ color: '#6F6A64', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}>Próxima cita</div><div style={{ marginTop: 5, color: '#D9D5CF' }}>{selected.nextAppointment || 'Sin cita registrada'}</div></div>
                  </div>
                </div>

                <div style={{ border: '1px solid rgba(201,168,76,.22)', borderRadius: 14, padding: 22, background: 'rgba(201,168,76,.035)' }}>
                  <div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.13em' }}>Acciones rápidas</div>
                  <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                    <button disabled style={{ padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(201,168,76,.25)', background: 'rgba(201,168,76,.08)', color: '#C9A84C', textAlign: 'left' }}>Abrir Perfil de Bienestar <span style={{ opacity: .55 }}>· siguiente paso</span></button>
                    <button disabled style={{ padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', color: '#9A9590', textAlign: 'left' }}>Agregar nota de consulta <span style={{ opacity: .55 }}>· siguiente paso</span></button>
                    <button disabled style={{ padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', color: '#9A9590', textAlign: 'left' }}>Ver mensajes del paciente <span style={{ opacity: .55 }}>· siguiente paso</span></button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
