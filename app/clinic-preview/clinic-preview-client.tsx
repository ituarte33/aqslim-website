'use client'

import { useEffect, useMemo, useState } from 'react'

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

type ClinicNote = {
  id: string
  noteAt: string | null
  authorEmail: string
  authorLabel: string
  noteType: string
  note: string
  followupRequired: boolean
  followupDate: string | null
}

const tabs = ['Consultas','Notas','Plan','My AQSLIM','Mensajes','Seguimiento'] as const
type Tab = typeof tabs[number]

export function ClinicPreviewClient({ patients }: { patients: Patient[] }) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('Consultas')
  const [notes, setNotes] = useState<ClinicNote[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [noteType, setNoteType] = useState('Consulta')
  const [noteText, setNoteText] = useState('')
  const [followupRequired, setFollowupRequired] = useState(false)
  const [followupDate, setFollowupDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return patients
    return patients.filter(patient =>
      [patient.name, patient.email, patient.phone].some(value => value.toLowerCase().includes(q))
    )
  }, [patients, query])

  const selected = patients.find(patient => patient.id === selectedId) ?? null

  async function loadNotes(patientId: string) {
    setNotesLoading(true)
    setStatusMessage('')
    try {
      const response = await fetch(`/api/preview/clinic-notes?patientId=${encodeURIComponent(patientId)}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error('load_failed')
      setNotes(Array.isArray(data.notes) ? data.notes : [])
    } catch {
      setStatusMessage('No se pudieron cargar las notas Preview.')
    } finally {
      setNotesLoading(false)
    }
  }

  useEffect(() => {
    if (selectedId && activeTab === 'Notas') void loadNotes(selectedId)
  }, [selectedId, activeTab])

  async function saveNote() {
    if (!selected || !noteText.trim()) return
    setSaving(true)
    setStatusMessage('')
    try {
      const response = await fetch('/api/preview/clinic-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selected.id,
          noteType,
          note: noteText,
          followupRequired,
          followupDate,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error('save_failed')
      setNoteText('')
      setFollowupRequired(false)
      setFollowupDate('')
      setStatusMessage('✓ Nota guardada en AQSLIM Clinic Preview.')
      await loadNotes(selected.id)
    } catch {
      setStatusMessage('No se pudo guardar la nota. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  function choosePatient(id: string) {
    setSelectedId(id)
    setActiveTab('Consultas')
    setStatusMessage('')
  }

  function openNotes() {
    if (!selected) return
    setActiveTab('Notas')
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#FAFAF8', fontFamily: 'Montserrat, Arial, sans-serif' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(10,10,10,.96)', borderBottom: '1px solid rgba(201,168,76,.28)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, letterSpacing: '.08em' }}>AQ<span style={{ color: '#C9A84C' }}>SLIM</span> Clinic</div>
          <div style={{ color: '#8E8881', fontSize: 12, marginTop: 4 }}>MYAQ-001-CLINIC-001 · PREVIEW · Founder-only</div>
        </div>
        <a href="/my-aqslim" style={{ color: '#C9A84C', textDecoration: 'none', fontSize: 13 }}>Abrir mi My AQSLIM ↗</a>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', minHeight: 'calc(100vh - 80px)' }}>
        <aside style={{ borderRight: '1px solid rgba(201,168,76,.18)', padding: 20 }}>
          <div style={{ color: '#C9A84C', fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase' }}>Pacientes</div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: 30, margin: '6px 0 16px' }}>Atención clínica</h1>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar nombre, email o teléfono…" style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(201,168,76,.28)', color: '#FAFAF8', padding: '12px 14px', borderRadius: 10, outline: 'none', marginBottom: 14 }} />
          <div style={{ color: '#6F6A64', fontSize: 12, marginBottom: 10 }}>{filtered.length} pacientes</div>
          <div style={{ display: 'grid', gap: 8, maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingRight: 4 }}>
            {filtered.map(patient => {
              const active = selectedId === patient.id
              return <button key={patient.id} onClick={() => choosePatient(patient.id)} style={{ textAlign: 'left', cursor: 'pointer', borderRadius: 10, padding: '13px 14px', border: active ? '1px solid #C9A84C' : '1px solid rgba(255,255,255,.08)', background: active ? 'rgba(201,168,76,.11)' : 'rgba(255,255,255,.025)', color: '#FAFAF8' }}>
                <div style={{ fontSize: 14, marginBottom: 5 }}>{patient.name}</div>
                <div style={{ fontSize: 11, color: '#8E8881' }}>{patient.phone || patient.email || 'Sin contacto registrado'}</div>
              </button>
            })}
          </div>
        </aside>

        <section style={{ padding: 28 }}>
          {!selected ? (
            <div style={{ maxWidth: 760, margin: '70px auto', border: '1px solid rgba(201,168,76,.22)', background: 'rgba(255,255,255,.025)', borderRadius: 18, padding: 34 }}>
              <div style={{ color: '#C9A84C', fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase' }}>AQSLIM Clinic</div>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 40, fontWeight: 400, margin: '12px 0 14px' }}>Selecciona un paciente</h2>
              <p style={{ color: '#9A9590', lineHeight: 1.7, margin: 0 }}>Desde aquí podrás llevar consultas, notas, planes, acceso a My AQSLIM, mensajes y seguimientos sin entrar al portal personal del paciente.</p>
            </div>
          ) : (
            <div style={{ maxWidth: 1040, margin: '0 auto' }}>
              <div style={{ border: '1px solid rgba(201,168,76,.25)', borderRadius: 18, padding: 26, background: 'linear-gradient(135deg, rgba(201,168,76,.07), rgba(255,255,255,.02))', marginBottom: 18 }}>
                <div style={{ color: '#C9A84C', fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase' }}>Expediente</div>
                <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: 38, margin: '8px 0 10px' }}>{selected.name}</h2>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', color: '#9A9590', fontSize: 13 }}>
                  {selected.phone && <span>{selected.phone}</span>}{selected.email && <span>{selected.email}</span>}{selected.status && <span>Estado: {selected.status}</span>}{selected.language && <span>Idioma: {selected.language}</span>}
                </div>
              </div>

              <nav style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: 8, marginBottom: 18 }}>
                {tabs.map(label => <button key={label} onClick={() => setActiveTab(label)} style={{ cursor: 'pointer', border: '1px solid rgba(201,168,76,.18)', borderRadius: 10, padding: '12px 10px', textAlign: 'center', color: activeTab === label ? '#C9A84C' : '#8E8881', background: activeTab === label ? 'rgba(201,168,76,.08)' : 'rgba(255,255,255,.02)', fontSize: 12 }}>{label}</button>)}
              </nav>

              {activeTab === 'Notas' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(300px,.75fr)', gap: 16 }}>
                  <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 22, background: 'rgba(255,255,255,.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
                      <h3 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 400 }}>Historial de notas</h3>
                      <span style={{ color: '#6F6A64', fontSize: 12 }}>{notes.length} notas</span>
                    </div>
                    <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
                      {notesLoading ? <div style={{ color: '#9A9590' }}>Cargando…</div> : notes.length === 0 ? <div style={{ color: '#9A9590' }}>Todavía no hay notas para este paciente.</div> : notes.map(note => <div key={note.id} style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 16, background: 'rgba(255,255,255,.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                          <strong style={{ color: '#C9A84C', fontSize: 12 }}>{note.noteType}</strong>
                          <span style={{ color: '#6F6A64', fontSize: 11 }}>{note.noteAt ? new Date(note.noteAt).toLocaleString('es-US') : ''}</span>
                        </div>
                        <div style={{ color: '#D9D5CF', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{note.note}</div>
                        <div style={{ color: '#77716A', fontSize: 11, marginTop: 10 }}>{note.authorLabel || note.authorEmail}{note.followupRequired ? ` · Seguimiento${note.followupDate ? ` ${note.followupDate}` : ' requerido'}` : ''}</div>
                      </div>)}
                    </div>
                  </div>

                  <div style={{ border: '1px solid rgba(201,168,76,.22)', borderRadius: 14, padding: 22, background: 'rgba(201,168,76,.035)', alignSelf: 'start' }}>
                    <div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.13em' }}>Nueva nota / entrevista</div>
                    <select value={noteType} onChange={e => setNoteType(e.target.value)} style={{ width: '100%', marginTop: 14, padding: '11px 12px', borderRadius: 9, background: '#111', color: '#FAFAF8', border: '1px solid rgba(201,168,76,.25)' }}>
                      <option>Consulta</option><option>Entrevista</option><option>Seguimiento</option><option>General</option>
                    </select>
                    <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Escribe aquí lo relevante de la consulta…" rows={8} style={{ width: '100%', boxSizing: 'border-box', marginTop: 12, padding: 12, borderRadius: 9, resize: 'vertical', background: '#111', color: '#FAFAF8', border: '1px solid rgba(201,168,76,.25)' }} />
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#9A9590', fontSize: 12, marginTop: 12 }}><input type="checkbox" checked={followupRequired} onChange={e => setFollowupRequired(e.target.checked)} /> Seguimiento requerido</label>
                    {followupRequired && <input type="date" value={followupDate} onChange={e => setFollowupDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', marginTop: 10, padding: '10px 12px', borderRadius: 9, background: '#111', color: '#FAFAF8', border: '1px solid rgba(201,168,76,.25)' }} />}
                    <button onClick={saveNote} disabled={saving || !noteText.trim()} style={{ width: '100%', marginTop: 14, padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(201,168,76,.45)', background: saving || !noteText.trim() ? 'rgba(201,168,76,.08)' : '#C9A84C', color: saving || !noteText.trim() ? '#8E8881' : '#0A0A0A', cursor: saving || !noteText.trim() ? 'not-allowed' : 'pointer', fontWeight: 600 }}>{saving ? 'Guardando…' : 'Guardar nota'}</button>
                    {statusMessage && <div style={{ marginTop: 12, color: statusMessage.startsWith('✓') ? '#9ED4A8' : '#E0A0A0', fontSize: 12, lineHeight: 1.5 }}>{statusMessage}</div>}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 16 }}>
                  <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 22, background: 'rgba(255,255,255,.02)' }}>
                    <h3 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 400 }}>Resumen operativo</h3>
                    <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
                      <div><div style={{ color: '#6F6A64', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}>Meta</div><div style={{ marginTop: 5, color: '#D9D5CF' }}>{selected.goal || 'Sin meta registrada'}</div></div>
                      <div><div style={{ color: '#6F6A64', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}>Próxima cita</div><div style={{ marginTop: 5, color: '#D9D5CF' }}>{selected.nextAppointment || 'Sin cita registrada'}</div></div>
                      <div><div style={{ color: '#6F6A64', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}>Uso de alimentos</div><div style={{ marginTop: 5, color: '#8E8881' }}>Food Scanner y registro de comidas permanecen exclusivamente dentro de My AQSLIM.</div></div>
                    </div>
                  </div>

                  <div style={{ border: '1px solid rgba(201,168,76,.22)', borderRadius: 14, padding: 22, background: 'rgba(201,168,76,.035)' }}>
                    <div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.13em' }}>Acciones rápidas</div>
                    <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                      <button disabled style={{ padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(201,168,76,.25)', background: 'rgba(201,168,76,.08)', color: '#C9A84C', textAlign: 'left' }}>Registrar consulta · siguiente paso</button>
                      <button onClick={openNotes} style={{ cursor: 'pointer', padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(201,168,76,.35)', background: 'rgba(201,168,76,.08)', color: '#E2C87A', textAlign: 'left' }}>Agregar nota / entrevista →</button>
                      <button disabled style={{ padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', color: '#9A9590', textAlign: 'left' }}>Crear o actualizar plan alimentario · siguiente paso</button>
                      <button disabled style={{ padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', color: '#9A9590', textAlign: 'left' }}>Dar acceso / revisar My AQSLIM · siguiente paso</button>
                      <button disabled style={{ padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', color: '#9A9590', textAlign: 'left' }}>Ver mensajes del paciente · siguiente paso</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
