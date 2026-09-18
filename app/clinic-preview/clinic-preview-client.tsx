'use client'

import { useEffect, useMemo, useState } from 'react'
import { resolveClinicCadence, sameClinicAppointment, suggestClinicAppointment, toClinicDateTimeLocal } from '@/lib/clinic-scheduling'

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
  followup?: {
    action: string
    priority: 'Normal' | 'Alta' | 'Urgente'
    status: 'Pendiente' | 'En progreso' | 'Completado'
  } | null
  messageDraft?: {
    channel: 'SMS' | 'Email' | 'WhatsApp'
    purpose: 'Seguimiento' | 'Recordatorio' | 'Plan' | 'General'
    status: 'Borrador' | 'Listo para revisar' | 'Archivado'
    subject: string
    body: string
  } | null
}

type ClinicConsultation = {
  id: string
  consultationAt: string | null
  consultationDate: string | null
  consultationType: string
  weight: number | null
  weightUnit: string
  bodyFat: number | null
  waistCm: number | null
  hipsCm: number | null
  armsCm: number | null
  thighsCm: number | null
  chestCm: number | null
  phase: string
  phaseWeek: number | null
  recommendations: string
  nextAppointment: string | null
  consultationFee: number | null
  amountCollected: number | null
  paymentMethod: string
  authorLabel: string
}

const tabs = ['Consultas','Notas','Plan','My AQSLIM','Mensajes','Seguimiento'] as const
type Tab = typeof tabs[number]
const SQUARE_BOOKING_URL = 'https://square.site/appointments/buyer/widget/46af1166-2cd2-4127-b94f-531a768d54c9/8PN49DRQ1C6TC'

function todayLocal() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function feeForType(type: string) {
  if (type === 'Cliente Nuevo') return '40'
  if (type === 'Cliente Re-Inicio') return '35'
  if (type === 'Cliente subsecuente') return '30'
  return '0'
}

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
  const [followupAction, setFollowupAction] = useState('')
  const [followupPriority, setFollowupPriority] = useState<'Normal' | 'Alta' | 'Urgente'>('Normal')
  const [followupDueDate, setFollowupDueDate] = useState('')
  const [followupSaving, setFollowupSaving] = useState(false)
  const [followupUpdatingId, setFollowupUpdatingId] = useState('')
  const [followupMessage, setFollowupMessage] = useState('')
  const [messageChannel, setMessageChannel] = useState<'SMS' | 'Email' | 'WhatsApp'>('SMS')
  const [messagePurpose, setMessagePurpose] = useState<'Seguimiento' | 'Recordatorio' | 'Plan' | 'General'>('Seguimiento')
  const [messageSubject, setMessageSubject] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [messageSaving, setMessageSaving] = useState(false)
  const [messageUpdatingId, setMessageUpdatingId] = useState('')
  const [messageStatus, setMessageStatus] = useState('')

  const [consultations, setConsultations] = useState<ClinicConsultation[]>([])
  const [consultationsLoading, setConsultationsLoading] = useState(false)
  const [consultationType, setConsultationType] = useState('Cliente subsecuente')
  const [consultationDate, setConsultationDate] = useState(todayLocal())
  const [weight, setWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState('lb')
  const [bodyFat, setBodyFat] = useState('')
  const [waistCm, setWaistCm] = useState('')
  const [hipsCm, setHipsCm] = useState('')
  const [armsCm, setArmsCm] = useState('')
  const [thighsCm, setThighsCm] = useState('')
  const [chestCm, setChestCm] = useState('')
  const [phase, setPhase] = useState('Sin fase')
  const [phaseWeek, setPhaseWeek] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [nextAppointment, setNextAppointment] = useState('')
  const [consultationFee, setConsultationFee] = useState('30')
  const [amountCollected, setAmountCollected] = useState('30')
  const [paymentMethod, setPaymentMethod] = useState('Sin especificar')
  const [consultationSaving, setConsultationSaving] = useState(false)
  const [consultationMessage, setConsultationMessage] = useState('')
  const [visitCadenceDays, setVisitCadenceDays] = useState<number | null>(null)
  const [nextAppointmentEdited, setNextAppointmentEdited] = useState(false)

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
  const structuredFollowups = notes.filter(note => note.noteType === 'Seguimiento' && note.followup)
  const messageDrafts = notes.filter(note => note.messageDraft)
  const cadence = useMemo(() => resolveClinicCadence(visitCadenceDays), [visitCadenceDays])
  const cadenceOptions = useMemo(() => [...new Set([cadence.days, 10, 14])], [cadence.days])
  const latestScheduledAppointment = consultations.find(item => item.nextAppointment)?.nextAppointment ?? null

  async function loadNotes(patientId: string) {
    setNotesLoading(true)
    setStatusMessage('')
    try {
      const response = await fetch(`/api/preview/clinic-notes?patientId=${encodeURIComponent(patientId)}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error('load_failed')
      const loadedNotes = Array.isArray(data.notes) ? data.notes as ClinicNote[] : []
      setNotes(loadedNotes)
      return loadedNotes
    } catch {
      setStatusMessage('No se pudieron cargar las notas Preview.')
      return null
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
      const loadedConsultations = Array.isArray(data.consultations) ? data.consultations as ClinicConsultation[] : []
      setConsultations(loadedConsultations)
      return loadedConsultations
    } catch {
      setConsultationMessage('No se pudieron cargar las consultas Preview.')
      return null
    } finally {
      setConsultationsLoading(false)
    }
  }

  async function getSchedulingCadence(patientId: string) {
    try {
      const response = await fetch(`/api/preview/clinic-plans?patientId=${encodeURIComponent(patientId)}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error('load_failed')
      return data.draft?.visitCadenceDays ?? null
    } catch {
      return null
    }
  }

  useEffect(() => {
    let cancelled = false
    if (selectedId) {
      void loadNotes(selectedId)
      void loadConsultations(selectedId).then(loaded => {
        if (cancelled || !loaded) return
        const persistedAppointment = loaded.find(item => item.nextAppointment)?.nextAppointment
        const localAppointment = toClinicDateTimeLocal(persistedAppointment)
        if (localAppointment) {
          setNextAppointment(localAppointment)
          setNextAppointmentEdited(true)
        }
      })
      void getSchedulingCadence(selectedId).then(days => {
        if (!cancelled) setVisitCadenceDays(days)
      })
    } else {
      setNotes([])
      setConsultations([])
      setVisitCadenceDays(null)
    }
    return () => { cancelled = true }
  }, [selectedId])

  useEffect(() => {
    if (!selectedId || nextAppointmentEdited) return
    setNextAppointment(suggestClinicAppointment(consultationDate, cadence.days))
  }, [selectedId, consultationDate, cadence.days, nextAppointmentEdited])

  async function saveNote() {
    if (!selected || !noteText.trim()) return
    setSaving(true)
    setStatusMessage('')
    try {
      const response = await fetch('/api/preview/clinic-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: selected.id, noteType, note: noteText, followupRequired, followupDate }),
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

  async function saveFollowup() {
    if (!selected || !followupAction.trim()) return
    setFollowupSaving(true)
    setFollowupMessage('')
    try {
      const response = await fetch('/api/preview/clinic-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'followup',
          patientId: selected.id,
          action: followupAction,
          priority: followupPriority,
          status: 'Pendiente',
          followupDate: followupDueDate,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error('save_failed')
      setFollowupAction('')
      setFollowupPriority('Normal')
      setFollowupDueDate('')
      const refreshed = await loadNotes(selected.id)
      if (!refreshed?.some(note => note.followup?.action === followupAction.trim())) throw new Error('verify_failed')
      setFollowupMessage('✓ Seguimiento guardado y verificado en Clinic Preview.')
    } catch {
      setFollowupMessage('No se pudo guardar el seguimiento. Intenta de nuevo.')
    } finally {
      setFollowupSaving(false)
    }
  }

  async function updateFollowupStatus(note: ClinicNote, nextStatus: 'Pendiente' | 'En progreso' | 'Completado') {
    if (!selected || !note.followup) return
    setFollowupUpdatingId(note.id)
    setFollowupMessage('')
    try {
      const response = await fetch('/api/preview/clinic-notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selected.id,
          recordId: note.id,
          action: note.followup.action,
          priority: note.followup.priority,
          status: nextStatus,
          followupDate: note.followupDate,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error('update_failed')
      const refreshed = await loadNotes(selected.id)
      if (!refreshed?.some(item => item.id === note.id && item.followup?.status === nextStatus)) throw new Error('verify_failed')
      setFollowupMessage('✓ Estado actualizado y verificado en Clinic Preview.')
    } catch {
      setFollowupMessage('No se pudo actualizar el seguimiento. Intenta de nuevo.')
    } finally {
      setFollowupUpdatingId('')
    }
  }

  async function saveMessageDraft() {
    const draftBody = messageBody.trim()
    if (!selected || !draftBody) return
    setMessageSaving(true)
    setMessageStatus('')
    try {
      const response = await fetch('/api/preview/clinic-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'messageDraft',
          patientId: selected.id,
          channel: messageChannel,
          purpose: messagePurpose,
          messageStatus: 'Borrador',
          subject: messageSubject,
          messageBody: draftBody,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error('save_failed')
      const refreshed = await loadNotes(selected.id)
      if (!refreshed?.some(note => note.messageDraft?.body === draftBody && note.messageDraft.status === 'Borrador')) throw new Error('verify_failed')
      setMessageSubject('')
      setMessageBody('')
      setMessageStatus('✓ Borrador guardado y verificado en Clinic Preview. No fue enviado.')
    } catch {
      setMessageStatus('No se pudo guardar el borrador. Intenta de nuevo.')
    } finally {
      setMessageSaving(false)
    }
  }

  async function updateMessageDraftStatus(note: ClinicNote, nextStatus: 'Borrador' | 'Listo para revisar' | 'Archivado') {
    if (!selected || !note.messageDraft) return
    setMessageUpdatingId(note.id)
    setMessageStatus('')
    try {
      const response = await fetch('/api/preview/clinic-notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'messageDraft',
          patientId: selected.id,
          recordId: note.id,
          channel: note.messageDraft.channel,
          purpose: note.messageDraft.purpose,
          messageStatus: nextStatus,
          subject: note.messageDraft.subject,
          messageBody: note.messageDraft.body,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error('update_failed')
      const refreshed = await loadNotes(selected.id)
      if (!refreshed?.some(item => item.id === note.id && item.messageDraft?.status === nextStatus)) throw new Error('verify_failed')
      setMessageStatus('✓ Estado del borrador actualizado y verificado. No fue enviado.')
    } catch {
      setMessageStatus('No se pudo actualizar el borrador. Intenta de nuevo.')
    } finally {
      setMessageUpdatingId('')
    }
  }

  async function saveConsultation() {
    if (!selected) return
    const selectedAppointment = nextAppointment
    const appointmentIso = selectedAppointment ? new Date(selectedAppointment).toISOString() : ''
    setConsultationSaving(true)
    setConsultationMessage('')
    try {
      const response = await fetch('/api/preview/clinic-consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selected.id,
          consultationType,
          consultationDate,
          weight,
          weightUnit,
          bodyFat,
          waistCm,
          hipsCm,
          armsCm,
          thighsCm,
          chestCm,
          phase,
          phaseWeek,
          recommendations,
          nextAppointment: appointmentIso,
          consultationFee,
          amountCollected,
          paymentMethod,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error('save_failed')
      setConsultationDate(todayLocal())
      setWeight('')
      setBodyFat('')
      setWaistCm('')
      setHipsCm('')
      setArmsCm('')
      setThighsCm('')
      setChestCm('')
      setPhaseWeek('')
      setRecommendations('')
      const refreshed = await loadConsultations(selected.id)
      if (!refreshed || (appointmentIso && !refreshed.some(item => sameClinicAppointment(item.nextAppointment, appointmentIso)))) {
        throw new Error('verify_failed')
      }
      setConsultationMessage(selectedAppointment
        ? '✓ Consulta y próxima cita guardadas y verificadas en Clinic Preview.'
        : '✓ Consulta guardada y verificada en AQSLIM Clinic Preview.')
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
    setFollowupMessage('')
    setFollowupAction('')
    setFollowupPriority('Normal')
    setFollowupDueDate('')
    setMessageStatus('')
    setMessageSubject('')
    setMessageBody('')
    setNextAppointment('')
    setNextAppointmentEdited(false)
    setVisitCadenceDays(null)
  }

  function openNotes() { if (selected) setActiveTab('Notas') }
  function openConsultations() { if (selected) setActiveTab('Consultas') }

  function changeConsultationType(type: string) {
    setConsultationType(type)
    const fee = feeForType(type)
    setConsultationFee(fee)
    setAmountCollected(fee)
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const, padding: '11px 12px', borderRadius: 9, background: '#111', color: '#FAFAF8', border: '1px solid rgba(201,168,76,.25)' }
  const labelStyle = { display: 'block', color: '#8E8881', fontSize: 11, marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '.08em' }
  const sectionTitle = { color: '#C9A84C', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '.13em', marginTop: 18, marginBottom: 8 }

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
            <div style={{ maxWidth: 1180, margin: '0 auto' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}><h3 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 400 }}>Historial de notas</h3><span style={{ color: '#6F6A64', fontSize: 12 }}>{notes.length} notas</span></div>
                    <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
                      {notesLoading ? <div style={{ color: '#9A9590' }}>Cargando…</div> : notes.length === 0 ? <div style={{ color: '#9A9590' }}>Todavía no hay notas para este paciente.</div> : notes.map(note => <div key={note.id} style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 16, background: 'rgba(255,255,255,.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}><strong style={{ color: '#C9A84C', fontSize: 12 }}>{note.noteType}</strong><span style={{ color: '#6F6A64', fontSize: 11 }}>{note.noteAt ? new Date(note.noteAt).toLocaleString('es-US') : ''}</span></div>
                        <div style={{ color: '#D9D5CF', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{note.note}</div>
                        <div style={{ color: '#77716A', fontSize: 11, marginTop: 10 }}>{note.authorLabel || note.authorEmail}{note.followupRequired ? ` · Seguimiento${note.followupDate ? ` ${note.followupDate}` : ' requerido'}` : ''}</div>
                      </div>)}
                    </div>
                  </div>
                  <div style={{ border: '1px solid rgba(201,168,76,.22)', borderRadius: 14, padding: 22, background: 'rgba(201,168,76,.035)', alignSelf: 'start' }}>
                    <div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.13em' }}>Nueva nota / entrevista</div>
                    <select value={noteType} onChange={e => setNoteType(e.target.value)} style={{ ...inputStyle, marginTop: 14 }}><option>Consulta</option><option>Entrevista</option><option>Seguimiento</option><option>General</option></select>
                    <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Escribe aquí lo relevante de la consulta…" rows={8} style={{ ...inputStyle, marginTop: 12, resize: 'vertical' }} />
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#9A9590', fontSize: 12, marginTop: 12 }}><input type="checkbox" checked={followupRequired} onChange={e => setFollowupRequired(e.target.checked)} /> Seguimiento requerido</label>
                    {followupRequired && <input type="date" value={followupDate} onChange={e => setFollowupDate(e.target.value)} style={{ ...inputStyle, marginTop: 10 }} />}
                    <button onClick={saveNote} disabled={saving || !noteText.trim()} style={{ width: '100%', marginTop: 14, padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(201,168,76,.45)', background: saving || !noteText.trim() ? 'rgba(201,168,76,.08)' : '#C9A84C', color: saving || !noteText.trim() ? '#8E8881' : '#0A0A0A', cursor: saving || !noteText.trim() ? 'not-allowed' : 'pointer', fontWeight: 600 }}>{saving ? 'Guardando…' : 'Guardar nota'}</button>
                    {statusMessage && <div style={{ marginTop: 12, color: statusMessage.startsWith('✓') ? '#9ED4A8' : '#E0A0A0', fontSize: 12 }}>{statusMessage}</div>}
                  </div>
                </div>
              ) : activeTab === 'Consultas' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(390px,.9fr)', gap: 16, alignItems: 'start' }}>
                  <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 22, background: 'rgba(255,255,255,.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}><h3 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 400 }}>Historial de consultas</h3><span style={{ color: '#6F6A64', fontSize: 12 }}>{consultations.length} consultas</span></div>
                    <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
                      {!consultationsLoading && latestScheduledAppointment && <div style={{ border: '1px solid rgba(201,168,76,.28)', borderRadius: 12, padding: 14, background: 'rgba(201,168,76,.05)' }}><div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em' }}>Próxima consulta preliminar</div><div style={{ marginTop: 7, color: '#FAFAF8' }}>{new Date(latestScheduledAppointment).toLocaleString('es-US')}</div><div style={{ marginTop: 6, color: '#8E8881', fontSize: 11 }}>Guardada en Clinic Preview. No representa una cita confirmada en Square.</div></div>}
                      {consultationsLoading ? <div style={{ color: '#9A9590' }}>Cargando…</div> : consultations.length === 0 ? <div style={{ color: '#9A9590' }}>Todavía no hay consultas registradas en Clinic Preview.</div> : consultations.map(item => <div key={item.id} style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 16, background: 'rgba(255,255,255,.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><strong style={{ color: '#C9A84C', fontSize: 12 }}>{item.consultationType}</strong><span style={{ color: '#6F6A64', fontSize: 11 }}>{item.consultationDate || (item.consultationAt ? new Date(item.consultationAt).toLocaleDateString('es-US') : '')}</span></div>
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: '#D9D5CF', fontSize: 12, marginTop: 10 }}>
                          {item.weight !== null && <span>Peso: {item.weight} {item.weightUnit}</span>}{item.bodyFat !== null && <span>Grasa: {item.bodyFat}%</span>}{item.waistCm !== null && <span>Cintura: {item.waistCm} cm</span>}{item.hipsCm !== null && <span>Cadera: {item.hipsCm} cm</span>}
                        </div>
                        {item.phase && <div style={{ marginTop: 8, color: '#8E8881', fontSize: 11 }}>Fase: {item.phase}{item.phaseWeek !== null ? ` · semana ${item.phaseWeek}` : ''}</div>}
                        {item.recommendations && <div style={{ marginTop: 8, color: '#B8B3AD', fontSize: 12, lineHeight: 1.5 }}>{item.recommendations}</div>}
                        {item.nextAppointment && <div style={{ marginTop: 8, color: '#E2C87A', fontSize: 11 }}>Próxima consulta preliminar: {new Date(item.nextAppointment).toLocaleString('es-US')}</div>}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8, color: '#6F6A64', fontSize: 11 }}>
                          {item.amountCollected !== null && <span>Cobrado: ${Number(item.amountCollected).toFixed(2)}</span>}{item.paymentMethod && <span>{item.paymentMethod}</span>}{item.authorLabel && <span>{item.authorLabel}</span>}
                        </div>
                      </div>)}
                    </div>
                  </div>

                  <div style={{ border: '1px solid rgba(201,168,76,.22)', borderRadius: 14, padding: 22, background: 'rgba(201,168,76,.035)' }}>
                    <div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.13em' }}>Registrar consulta</div>

                    <div style={sectionTitle}>Tipo y fecha</div>
                    <select value={consultationType} onChange={e => changeConsultationType(e.target.value)} style={inputStyle}><option>Cliente Nuevo</option><option>Cliente subsecuente</option><option>Cliente Re-Inicio</option><option>Seguimiento</option></select>
                    <label style={{ ...labelStyle, marginTop: 10 }}>Fecha de consulta</label><input type="date" value={consultationDate} onChange={e => setConsultationDate(e.target.value)} style={inputStyle} />

                    <div style={sectionTitle}>Mediciones</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 95px', gap: 8 }}><input inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} placeholder="Peso" style={inputStyle} /><select value={weightUnit} onChange={e => setWeightUnit(e.target.value)} style={inputStyle}><option>lb</option><option>kg</option></select></div>
                    <input inputMode="decimal" value={bodyFat} onChange={e => setBodyFat(e.target.value)} placeholder="% Grasa corporal" style={{ ...inputStyle, marginTop: 8 }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                      <input inputMode="decimal" value={waistCm} onChange={e => setWaistCm(e.target.value)} placeholder="Cintura cm" style={inputStyle} /><input inputMode="decimal" value={hipsCm} onChange={e => setHipsCm(e.target.value)} placeholder="Cadera cm" style={inputStyle} />
                      <input inputMode="decimal" value={armsCm} onChange={e => setArmsCm(e.target.value)} placeholder="Brazos cm" style={inputStyle} /><input inputMode="decimal" value={thighsCm} onChange={e => setThighsCm(e.target.value)} placeholder="Muslos cm" style={inputStyle} />
                      <input inputMode="decimal" value={chestCm} onChange={e => setChestCm(e.target.value)} placeholder="Pecho/Busto cm" style={inputStyle} />
                    </div>

                    <div style={sectionTitle}>Plan actual</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 8 }}><select value={phase} onChange={e => setPhase(e.target.value)} style={inputStyle}><option>Sin fase</option><option>Jing</option><option>Qi</option><option>Xue</option><option>Yang Sheng</option></select><input inputMode="numeric" value={phaseWeek} onChange={e => setPhaseWeek(e.target.value)} placeholder="Semana" style={inputStyle} /></div>

                    <div style={sectionTitle}>Recomendaciones</div>
                    <textarea value={recommendations} onChange={e => setRecommendations(e.target.value)} placeholder="Instrucciones, observaciones o recomendaciones para esta consulta…" rows={4} style={{ ...inputStyle, resize: 'vertical' }} />

                    <div style={sectionTitle}>Próxima cita</div>
                    <input type="datetime-local" value={nextAppointment} onChange={e => { setNextAppointment(e.target.value); setNextAppointmentEdited(true) }} style={inputStyle} />
                    <div style={{ marginTop: 10, padding: 12, border: '1px solid rgba(201,168,76,.20)', borderRadius: 9, background: 'rgba(201,168,76,.04)' }}>
                      <div style={{ color: '#9A9590', fontSize: 11 }}>{nextAppointmentEdited ? `Fecha seleccionada o guardada · sugerencia del plan: ${cadence.days} días` : `Sugerencia activa · ${cadence.label}`}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>{cadenceOptions.map(days => <button key={days} type="button" onClick={() => { setNextAppointment(suggestClinicAppointment(consultationDate, days)); setNextAppointmentEdited(true) }} style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid rgba(201,168,76,.35)', background: days === cadence.days ? 'rgba(201,168,76,.15)' : 'rgba(201,168,76,.08)', color: '#E2C87A', cursor: 'pointer', fontSize: 11 }}>+ {days} días{days === cadence.days ? cadence.source === 'plan' ? ' · plan' : ' · estándar' : ''}</button>)}</div>
                      <div style={{ color: '#6F6A64', fontSize: 10, lineHeight: 1.5, marginTop: 8 }}>Puedes cambiar la fecha manualmente antes de guardar la consulta.</div>
                    </div>
                    <a href={SQUARE_BOOKING_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 8, color: '#C9A84C', textDecoration: 'none', border: '1px solid rgba(201,168,76,.35)', borderRadius: 8, padding: '9px 12px', fontSize: 12 }}>Abrir Square para agendar ↗</a>
                    <div style={{ marginTop: 7, color: '#E0A0A0', fontSize: 10, lineHeight: 1.5 }}>Abrir Square no crea ni confirma una cita desde Clinic Preview.</div>

                    <div style={sectionTitle}>Pago</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><div><label style={labelStyle}>Cargo ($)</label><input inputMode="decimal" value={consultationFee} onChange={e => setConsultationFee(e.target.value)} style={inputStyle} /></div><div><label style={labelStyle}>Monto cobrado ($)</label><input inputMode="decimal" value={amountCollected} onChange={e => setAmountCollected(e.target.value)} style={inputStyle} /></div></div>
                    <label style={{ ...labelStyle, marginTop: 10 }}>Método de pago</label><select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={inputStyle}><option>Sin especificar</option><option>Efectivo</option><option>Card</option><option>Venmo</option><option>Zelle</option><option>Transferencia</option></select>

                    {consultationType === 'Cliente Re-Inicio' && <div style={{ marginTop: 12, padding: 12, border: '1px solid rgba(201,168,76,.2)', borderRadius: 9, color: '#9A9590', fontSize: 12, lineHeight: 1.5 }}>El email de re-inicio anterior permanece desactivado aquí porque todavía apunta al cuestionario viejo. Lo reconectaremos al nuevo flujo de My AQSLIM/entrevista antes de habilitarlo.</div>}

                    <button onClick={saveConsultation} disabled={consultationSaving} style={{ width: '100%', marginTop: 16, padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(201,168,76,.45)', background: consultationSaving ? 'rgba(201,168,76,.08)' : '#C9A84C', color: consultationSaving ? '#8E8881' : '#0A0A0A', cursor: consultationSaving ? 'not-allowed' : 'pointer', fontWeight: 600 }}>{consultationSaving ? 'Guardando…' : 'Guardar consulta'}</button>
                    {consultationMessage && <div style={{ marginTop: 12, color: consultationMessage.startsWith('✓') ? '#9ED4A8' : '#E0A0A0', fontSize: 12 }}>{consultationMessage}</div>}
                  </div>
                </div>
              ) : activeTab === 'Mensajes' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(360px,.8fr)', gap: 16, alignItems: 'start' }}>
                  <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 22, background: 'rgba(255,255,255,.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 400 }}>Borradores de mensajes</h3>
                      <span style={{ color: '#6F6A64', fontSize: 12 }}>{messageDrafts.length} borradores</span>
                    </div>
                    <div style={{ marginTop: 10, padding: 12, border: '1px solid rgba(226,200,122,.28)', borderRadius: 10, background: 'rgba(201,168,76,.05)', color: '#E2C87A', fontSize: 12, lineHeight: 1.55 }}>Borradores internos del expediente. Esta pantalla no envía SMS, emails ni WhatsApp al paciente.</div>
                    <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
                      {notesLoading ? <div style={{ color: '#9A9590' }}>Cargando…</div> : messageDrafts.length === 0 ? <div style={{ color: '#9A9590' }}>Todavía no hay borradores para este paciente.</div> : messageDrafts.map(note => {
                        const draft = note.messageDraft!
                        return <div key={note.id} style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 16, background: draft.status === 'Archivado' ? 'rgba(255,255,255,.015)' : 'rgba(255,255,255,.025)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><span style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em' }}>{draft.channel}</span><span style={{ color: '#8E8881', fontSize: 11 }}>{draft.purpose}</span></div>
                            <select value={draft.status} disabled={messageUpdatingId === note.id} onChange={event => void updateMessageDraftStatus(note, event.target.value as 'Borrador' | 'Listo para revisar' | 'Archivado')} style={{ ...inputStyle, width: 175, padding: '8px 10px' }}><option>Borrador</option><option>Listo para revisar</option><option>Archivado</option></select>
                          </div>
                          {draft.subject && <div style={{ color: '#FAFAF8', fontWeight: 600, marginTop: 12 }}>{draft.subject}</div>}
                          <div style={{ color: '#D9D5CF', lineHeight: 1.6, marginTop: 10, whiteSpace: 'pre-wrap' }}>{draft.body}</div>
                          <div style={{ color: '#77716A', fontSize: 11, marginTop: 10 }}>{note.noteAt ? new Date(note.noteAt).toLocaleString('es-US') : ''}{note.authorLabel ? ` · ${note.authorLabel}` : ''}</div>
                        </div>
                      })}
                    </div>
                  </div>

                  <div style={{ border: '1px solid rgba(201,168,76,.22)', borderRadius: 14, padding: 22, background: 'rgba(201,168,76,.035)' }}>
                    <div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.13em' }}>Nuevo borrador interno</div>
                    <div style={{ color: '#9A9590', fontSize: 12, lineHeight: 1.55, marginTop: 9 }}>Contacto de referencia: {selected.phone || selected.email || 'sin contacto registrado'}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                      <div><label style={labelStyle}>Canal previsto</label><select value={messageChannel} onChange={event => setMessageChannel(event.target.value as 'SMS' | 'Email' | 'WhatsApp')} style={inputStyle}><option>SMS</option><option>Email</option><option>WhatsApp</option></select></div>
                      <div><label style={labelStyle}>Propósito</label><select value={messagePurpose} onChange={event => setMessagePurpose(event.target.value as 'Seguimiento' | 'Recordatorio' | 'Plan' | 'General')} style={inputStyle}><option>Seguimiento</option><option>Recordatorio</option><option>Plan</option><option>General</option></select></div>
                    </div>
                    <label style={{ ...labelStyle, marginTop: 12 }}>Asunto opcional</label>
                    <input value={messageSubject} onChange={event => setMessageSubject(event.target.value)} maxLength={500} placeholder="Ej. Seguimiento de tu plan" style={inputStyle} />
                    <label style={{ ...labelStyle, marginTop: 12 }}>Mensaje</label>
                    <textarea value={messageBody} onChange={event => setMessageBody(event.target.value)} placeholder="Escribe el borrador aquí…" rows={8} style={{ ...inputStyle, resize: 'vertical' }} />
                    <div style={{ marginTop: 12, padding: 11, border: '1px solid rgba(226,142,142,.22)', borderRadius: 9, color: '#E0A0A0', fontSize: 12, lineHeight: 1.5 }}>Sin envío: guardar sólo registra este texto dentro de Clinic Preview.</div>
                    <button onClick={saveMessageDraft} disabled={messageSaving || !messageBody.trim()} style={{ width: '100%', marginTop: 14, padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(201,168,76,.45)', background: messageSaving || !messageBody.trim() ? 'rgba(201,168,76,.08)' : '#C9A84C', color: messageSaving || !messageBody.trim() ? '#8E8881' : '#0A0A0A', cursor: messageSaving || !messageBody.trim() ? 'not-allowed' : 'pointer', fontWeight: 600 }}>{messageSaving ? 'Guardando…' : 'Guardar borrador Preview'}</button>
                    {messageStatus && <div style={{ marginTop: 12, color: messageStatus.startsWith('✓') ? '#9ED4A8' : '#E0A0A0', fontSize: 12, lineHeight: 1.5 }}>{messageStatus}</div>}
                  </div>
                </div>
              ) : activeTab === 'Seguimiento' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(340px,.75fr)', gap: 16, alignItems: 'start' }}>
                  <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 22, background: 'rgba(255,255,255,.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 400 }}>Seguimiento clínico</h3>
                      <span style={{ color: '#6F6A64', fontSize: 12 }}>{structuredFollowups.length} registros</span>
                    </div>
                    <div style={{ color: '#8E8881', fontSize: 12, lineHeight: 1.6, marginTop: 8 }}>Acciones internas del expediente. No envían mensajes ni modifican My AQSLIM.</div>
                    <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
                      {notesLoading ? <div style={{ color: '#9A9590' }}>Cargando…</div> : structuredFollowups.length === 0 ? <div style={{ color: '#9A9590' }}>Todavía no hay seguimientos estructurados para este paciente.</div> : structuredFollowups.map(note => {
                        const item = note.followup!
                        const priorityColor = item.priority === 'Urgente' ? '#E28E8E' : item.priority === 'Alta' ? '#E2C87A' : '#9A9590'
                        return <div key={note.id} style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 16, background: item.status === 'Completado' ? 'rgba(106,160,116,.05)' : 'rgba(255,255,255,.02)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ color: priorityColor, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em' }}>Prioridad {item.priority}</span>
                            <select value={item.status} disabled={followupUpdatingId === note.id} onChange={event => void updateFollowupStatus(note, event.target.value as 'Pendiente' | 'En progreso' | 'Completado')} style={{ ...inputStyle, width: 160, padding: '8px 10px' }}><option>Pendiente</option><option>En progreso</option><option>Completado</option></select>
                          </div>
                          <div style={{ color: '#D9D5CF', lineHeight: 1.6, marginTop: 10, textDecoration: item.status === 'Completado' ? 'line-through' : 'none' }}>{item.action}</div>
                          <div style={{ color: '#77716A', fontSize: 11, marginTop: 9 }}>{note.followupDate ? `Fecha objetivo: ${note.followupDate}` : 'Sin fecha objetivo'}{note.authorLabel ? ` · ${note.authorLabel}` : ''}</div>
                        </div>
                      })}
                    </div>
                  </div>

                  <div style={{ border: '1px solid rgba(201,168,76,.22)', borderRadius: 14, padding: 22, background: 'rgba(201,168,76,.035)' }}>
                    <div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.13em' }}>Nueva próxima acción</div>
                    <label style={{ ...labelStyle, marginTop: 14 }}>Acción pendiente</label>
                    <textarea value={followupAction} onChange={event => setFollowupAction(event.target.value)} placeholder="Ej. Confirmar progreso, revisar tolerancia o preparar próxima consulta…" rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                      <div><label style={labelStyle}>Prioridad</label><select value={followupPriority} onChange={event => setFollowupPriority(event.target.value as 'Normal' | 'Alta' | 'Urgente')} style={inputStyle}><option>Normal</option><option>Alta</option><option>Urgente</option></select></div>
                      <div><label style={labelStyle}>Fecha objetivo</label><input type="date" value={followupDueDate} onChange={event => setFollowupDueDate(event.target.value)} style={inputStyle} /></div>
                    </div>
                    <button onClick={saveFollowup} disabled={followupSaving || !followupAction.trim()} style={{ width: '100%', marginTop: 16, padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(201,168,76,.45)', background: followupSaving || !followupAction.trim() ? 'rgba(201,168,76,.08)' : '#C9A84C', color: followupSaving || !followupAction.trim() ? '#8E8881' : '#0A0A0A', cursor: followupSaving || !followupAction.trim() ? 'not-allowed' : 'pointer', fontWeight: 600 }}>{followupSaving ? 'Guardando…' : 'Guardar seguimiento Preview'}</button>
                    {followupMessage && <div style={{ marginTop: 12, color: followupMessage.startsWith('✓') ? '#9ED4A8' : '#E0A0A0', fontSize: 12, lineHeight: 1.5 }}>{followupMessage}</div>}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 16 }}>
                  <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 22, background: 'rgba(255,255,255,.02)' }}>
                    <h3 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 400 }}>Resumen operativo</h3>
                    <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
                      <div><div style={{ color: '#6F6A64', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}>Meta</div><div style={{ marginTop: 5, color: '#D9D5CF' }}>{selected.goal || 'Sin meta registrada'}</div></div>
                      <div><div style={{ color: '#6F6A64', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}>Próxima cita</div><div style={{ marginTop: 5, color: '#D9D5CF' }}>{selected.nextAppointment || 'Sin cita registrada'}</div></div>
                      <div><div style={{ color: '#6F6A64', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}>Última nota</div>{notesLoading ? <div style={{ marginTop: 5, color: '#8E8881' }}>Cargando notas…</div> : latestNote ? <><div style={{ marginTop: 6, color: '#D9D5CF', lineHeight: 1.55 }}>{latestNote.note}</div><div style={{ marginTop: 6, color: '#77716A', fontSize: 11 }}>{latestNote.noteType}{latestNote.noteAt ? ` · ${new Date(latestNote.noteAt).toLocaleString('es-US')}` : ''}</div>{latestNote.followupRequired && <div style={{ marginTop: 8, color: '#E2C87A', fontSize: 12 }}>Seguimiento pendiente{latestNote.followupDate ? ` · ${latestNote.followupDate}` : ''}</div>}<button onClick={openNotes} style={{ marginTop: 10, padding: 0, border: 0, background: 'transparent', color: '#C9A84C', cursor: 'pointer', fontSize: 12 }}>Ver historial / continuar seguimiento →</button></> : <div style={{ marginTop: 5, color: '#8E8881' }}>Sin notas registradas.</div>}</div>
                      {pendingFollowups.length > 0 && <div style={{ border: '1px solid rgba(201,168,76,.20)', borderRadius: 10, padding: 12, background: 'rgba(201,168,76,.04)' }}><div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}>Seguimiento</div><div style={{ marginTop: 5, color: '#D9D5CF' }}>{pendingFollowups.length} nota{pendingFollowups.length === 1 ? '' : 's'} marcada{pendingFollowups.length === 1 ? '' : 's'} para seguimiento.</div></div>}
                      <div><div style={{ color: '#6F6A64', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}>Uso de alimentos</div><div style={{ marginTop: 5, color: '#8E8881' }}>Food Scanner y registro de comidas permanecen exclusivamente dentro de My AQSLIM.</div></div>
                    </div>
                  </div>
                  <div style={{ border: '1px solid rgba(201,168,76,.22)', borderRadius: 14, padding: 22, background: 'rgba(201,168,76,.035)' }}><div style={{ color: '#C9A84C', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.13em' }}>Acciones rápidas</div><div style={{ display: 'grid', gap: 10, marginTop: 14 }}><button onClick={openConsultations} style={{ cursor: 'pointer', padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(201,168,76,.35)', background: 'rgba(201,168,76,.08)', color: '#E2C87A', textAlign: 'left' }}>Registrar consulta →</button><button onClick={openNotes} style={{ cursor: 'pointer', padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(201,168,76,.35)', background: 'rgba(201,168,76,.08)', color: '#E2C87A', textAlign: 'left' }}>Agregar nota / entrevista →</button><button disabled style={{ padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', color: '#9A9590', textAlign: 'left' }}>Crear o actualizar plan alimentario · siguiente paso</button><button disabled style={{ padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', color: '#9A9590', textAlign: 'left' }}>Dar acceso / revisar My AQSLIM · siguiente paso</button><button disabled style={{ padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', color: '#9A9590', textAlign: 'left' }}>Ver mensajes del paciente · siguiente paso</button></div></div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
