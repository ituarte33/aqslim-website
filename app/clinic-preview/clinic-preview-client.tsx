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

type ClinicConsultation = {
  id: string
  consultationAt: string | null
  consultationType: string
  weight: number | null
  weightUnit: string
  waistCm: number | null
  phase: string
  phaseWeek: number | null
  nextAppointment: string | null
  authorLabel: string
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

  const [consultations, setConsultations] = useState<ClinicConsultation[]>([])
  const [consultationsLoading, setConsultationsLoading] = useState(false)
  const [consultationType, setConsultationType] = useState('Cliente subsecuente')
  const [weight, setWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState('lb')
  const [waistCm, setWaistCm] = useState('')
  const [phase, setPhase] = useState('Sin fase')
  const [phaseWeek, setPhaseWeek] = useState('')
  const [nextAppointment, setNextAppointment] = useState('')
  const [consultationSaving, setConsultationSaving] = useState(false)
  const [consultationMessage, setConsultationMessage] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return patients
    return patients.filter(patient =>
      [patient.name, patient.email, patient.phone].some(value => value.toLowerCase().includes(q))
    )
  }, [patients, query])

  const selected = patients.find(patient => patient.id === selectedId) ?? null
  const latestNote = notes[0] ?? null
  const pendingFollowups = notes.filter(note => note.followupRequired)

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

  async function loadConsultations(patientId: string) {
    setConsultationsLoading(true)
    setConsultationMessage('')
    try {
      const response = await fetch(`/api/preview/clinic-consultations?patientId=${encodeURIComponent(patientId)}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error('load_failed')
      setConsultations(Array.isArray(data.consultations) ? data.consultations : [])
    } catch {
      setConsultationMessage('No se pudieron cargar las consultas Preview.')
    } finally {
      setConsultationsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedId) {
      void loadNotes(selectedId)
      void loadConsultations(selectedId)
    } else {
      setNotes([])
      setConsultations([])
    }
  }, [selectedId])

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

  async function saveConsultation() {
    if (!selected) return
    setConsultationSaving(true)
    setConsultationMessage('')
    try {
      const response = await fetch('/api/preview/clinic-consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selected.id,
          consultationType,
          weight,
          weightUnit,
          waistCm,
          phase,
          phaseWeek,
          nextAppointment,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error('save_failed')
      setWeight('')
      setWaistCm('')
      setPhaseWeek('')
      setNextAppointment('')
      setConsultationMessage('✓ Consulta guardada en AQSLIM Clinic Preview.')
      await loadConsultations(selected.id)
    } catch {
      setConsultationMessage('No se pudo guardar la consulta. Intenta de nuevo.')
    } finally {
      setConsultationSaving(false)
    }
  }

  function choosePatient(id: string) {
    setSelectedId(id)
    setActiveTab('Consultas')
    setStatusMessage('')
    setConsultationMessage('')
  }

  function openNotes() {
    if (!selected) return
    setActiveTab('Notas')
  }

  function openConsultations() {
    if (!selected) return
    setActiveTab('Consultas')
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const, padding: '11px 12px', borderRadius: 9, background: '#111', color: '#FAFAF8', border: '1px solid rgba(201,168,76,.25)' }

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
                    <select value={noteType} onChange={e => setNoteType(e.target.value)} style={{ ...inputStyle, marginTop: 14 }}>
                      <option>Consulta</option><option>Entrevista</option><option>Seguimiento</option><option>General</option>
                    </select>
                    <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Escribe aquí lo relevante de la consulta…" rows={8} style={{ ...inputStyle, marginTop: 12, resize: 'vertical' }} />
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#9A9590', fontSize: 12, marginTop: 12 }}><input type="checkbox" checked={followupRequired} onChange={e => setFollowupRequired(e.target.checked)} /> Seguimiento requerido</label>
                    {followupRequired && <input type="date" value={followupDate} onChange={e => setFollowupDate(e.target.value)} style={{ ...inputStyle, marginTop: 10 }} />}
                    <button onClick={saveNote} disabled={saving || !noteText.trim()} style={{ width: '100%', marginTop: 14, padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(201,168,76,.45)', background: saving || !noteText.trim() ? 'rgba(201,168,76,.08)' : '#C9A84C', color: saving || !noteText.trim() ? '#8E8881' : '#0A0A0A', cursor: saving || !noteText.trim() ? 'not-allowed' : 'pointer', fontWeight: 600 }}>{saving ? 'Guardando…' : 'Guardar nota'}</button>
                    {statusMessage && <div style={{ marginTop: 12, color: statusMessage.startsWith('✓') ? '#9ED4A8' : '#E0A0A0', fontSize: 12, lineHeight: 1.5 }}>{statusMessage}</div>}
                  </div>
                </div>
              ) : activeTab === 'Consultas' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(320px,.8fr)', gap: 16 }}>
                  <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 22, background: 'rgba(255,255,255,.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
                      <h3 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 400 }}>Historial de consultas</h3>
                      <span style={{ color: '#6F6A64', fontSize: 12 }}>{consultations.length} consultas</span>
                    </div>
                    <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
                      {consultationsLoading ? <div style={{ color: '#9A9590' }}>Cargando…</div> : consultations.length === 0 ? <div style={{ color: '#9A9590' }}>Todavía no hay consultas registradas en Clinic Preview.</div> : consultations.map(item => <div key={item.id} style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 16, background: 'rgba(255,255,255,.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <strong style={{ color: '#C9A84C', fontSize: 12 }}>{item.consultationType}</strong>
                          <span style={{ color: '#6F6A64', fontSize: 11 }}>{item.consultationAt ? new Date(item.consultationAt).toLocaleString('es-US') : ''}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: '#D9D5CF', fontSize: 12, marginTop: 10 }}>
                          {item.weight !== null && <span>Peso: {item.weight} {item.weightUnit}</span>}
                          {item.waistCm !== null && <span>Cintura: {item.waistCm} cm</span>}
                          {item.phase && <span>Fase: {item.phase}{item.phaseWeek !== null ? ` · semana ${item.phaseWeek}` : ''}</span>}
                        </div>
                        {item.nextAppointment && <div style={{ marginTop: 8, color: '#8E8881', fontSize: 11 }}>Próxima cita: {new Date(item.nextAppointment).toLocaleString('es-US')}</div>}
                        {item.authorLabel && <div style={{ marginTop: 8, color: '#6F6A64', fontSize: 11 }}>{item.authorLabel}</div>}
                      </div>)}
                    </div>
                  </div>

                  <div style={{ border: '1px solid rgba(201,168,76,.22)', borderRadius: 14, padding: 22, background: 'rgba(201,168,76,.035)', alignSelf: 'start' }}>
                    <div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.13em' }}>Registrar consulta</div>
                    <select value={consultationType} onChange={e => setConsultationType(e.target.value)} style={{ ...inputStyle, marginTop: 14 }}>
                      <option>Cliente Nuevo</option><option>Cliente subsecuente</option><option>Cliente Re-Inicio</option><option>Seguimiento</option>
                    </select>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8, marginTop: 10 }}>
                      <input inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} placeholder="Peso" style={inputStyle} />
                      <select value={weightUnit} onChange={e => setWeightUnit(e.target.value)} style={inputStyle}><option>lb</option><option>kg</option></select>
                    </div>
                    <input inputMode="decimal" value={waistCm} onChange={e => setWaistCm(e.target.value)} placeholder="Cintura (cm)" style={{ ...inputStyle, marginTop: 10 }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8, marginTop: 10 }}>
                      <select value={phase} onChange={e => setPhase(e.target.value)} style={inputStyle}><option>Sin fase</option><option>Jing</option><option>Qi</option><option>Xue</option><option>Yang Sheng</option></select>
                      <input inputMode="numeric" value={phaseWeek} onChange={e => setPhaseWeek(e.target.value)} placeholder="Semana" style={inputStyle} />
                    </div>
                    <label style={{ display: 'block', color: '#8E8881', fontSize: 11, marginTop: 12, marginBottom: 5 }}>Próxima cita</label>
                    <input type="datetime-local" value={nextAppointment} onChange={e => setNextAppointment(e.target.value)} style={inputStyle} />
                    <button onClick={saveConsultation} disabled={consultationSaving} style={{ width: '100%', marginTop: 14, padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(201,168,76,.45)', background: consultationSaving ? 'rgba(201,168,76,.08)' : '#C9A84C', color: consultationSaving ? '#8E8881' : '#0A0A0A', cursor: consultationSaving ? 'not-allowed' : 'pointer', fontWeight: 600 }}>{consultationSaving ? 'Guardando…' : 'Guardar consulta'}</button>
                    {consultationMessage && <div style={{ marginTop: 12, color: consultationMessage.startsWith('✓') ? '#9ED4A8' : '#E0A0A0', fontSize: 12, lineHeight: 1.5 }}>{consultationMessage}</div>}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 16 }}>
                  <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 22, background: 'rgba(255,255,255,.02)' }}>
                    <h3 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 400 }}>Resumen operativo</h3>
                    <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
                      <div><div style={{ color: '#6F6A64', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}>Meta</div><div style={{ marginTop: 5, color: '#D9D5CF' }}>{selected.goal || 'Sin meta registrada'}</div></div>
                      <div><div style={{ color: '#6F6A64', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}>Próxima cita</div><div style={{ marginTop: 5, color: '#D9D5CF' }}>{selected.nextAppointment || 'Sin cita registrada'}</div></div>
                      <div>
                        <div style={{ color: '#6F6A64', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}>Última nota</div>
                        {notesLoading ? <div style={{ marginTop: 5, color: '#8E8881' }}>Cargando notas…</div> : latestNote ? <>
                          <div style={{ marginTop: 6, color: '#D9D5CF', lineHeight: 1.55 }}>{latestNote.note}</div>
                          <div style={{ marginTop: 6, color: '#77716A', fontSize: 11 }}>{latestNote.noteType}{latestNote.noteAt ? ` · ${new Date(latestNote.noteAt).toLocaleString('es-US')}` : ''}</div>
                          {latestNote.followupRequired && <div style={{ marginTop: 8, color: '#E2C87A', fontSize: 12 }}>Seguimiento pendiente{latestNote.followupDate ? ` · ${latestNote.followupDate}` : ''}</div>}
                          <button onClick={openNotes} style={{ marginTop: 10, padding: 0, border: 0, background: 'transparent', color: '#C9A84C', cursor: 'pointer', fontSize: 12 }}>Ver historial / continuar seguimiento →</button>
                        </> : <div style={{ marginTop: 5, color: '#8E8881' }}>Sin notas registradas.</div>}
                      </div>
                      {pendingFollowups.length > 0 && <div style={{ border: '1px solid rgba(201,168,76,.20)', borderRadius: 10, padding: 12, background: 'rgba(201,168,76,.04)' }}>
                        <div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}>Seguimiento</div>
                        <div style={{ marginTop: 5, color: '#D9D5CF' }}>{pendingFollowups.length} nota{pendingFollowups.length === 1 ? '' : 's'} marcada{pendingFollowups.length === 1 ? '' : 's'} para seguimiento.</div>
                      </div>}
                      <div><div style={{ color: '#6F6A64', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}>Uso de alimentos</div><div style={{ marginTop: 5, color: '#8E8881' }}>Food Scanner y registro de comidas permanecen exclusivamente dentro de My AQSLIM.</div></div>
                    </div>
                  </div>

                  <div style={{ border: '1px solid rgba(201,168,76,.22)', borderRadius: 14, padding: 22, background: 'rgba(201,168,76,.035)' }}>
                    <div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.13em' }}>Acciones rápidas</div>
                    <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                      <button onClick={openConsultations} style={{ cursor: 'pointer', padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(201,168,76,.35)', background: 'rgba(201,168,76,.08)', color: '#E2C87A', textAlign: 'left' }}>Registrar consulta →</button>
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
