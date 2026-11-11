'use client'
import { useState } from 'react'
import { DashboardShell } from '../dashboard-shell'
import { PatientPlanEditor } from './patient-plan-editor'
export function PlansClient({ user, patients, initialPatientId }: { user: { firstName: string | null; lastName: string | null } | null; patients: { id: string; name: string; email: string }[]; initialPatientId: string }) {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [id, setId] = useState(patients.some(patient => patient.id === initialPatientId) ? initialPatientId : '')
  const [query, setQuery] = useState('')
  const filtered = patients.filter(patient => `${patient.name} ${patient.email}`.toLowerCase().includes(query.toLowerCase()))
  return <DashboardShell user={user} lang={lang} setLang={setLang}>
    <h1>Planes y guías</h1><p>Selecciona al paciente para revisar y publicar su plan en My AQSLIM.</p>
    <label>Buscar paciente <input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <label style={{ display: 'block', margin: '18px 0' }}>Paciente <select value={id} onChange={event => setId(event.target.value)}><option value="">Selecciona un paciente…</option>{(id && !filtered.some(patient => patient.id === id) ? [...filtered, patients.find(patient => patient.id === id)!] : filtered).map(patient => <option key={patient.id} value={patient.id}>{patient.name} · {patient.email}</option>)}</select></label>
    {id && <PatientPlanEditor key={id} patientId={id} />}
  </DashboardShell>
}
