'use client'

import { useEffect, useRef, useState } from 'react'
import { buildClinicFast36, type ClinicFast36Session } from '@/lib/clinic-fast36'

const field = { width: '100%', padding: 11, border: '1px solid rgba(201,168,76,.3)', borderRadius: 8, background: '#111', color: '#FAFAF8', boxSizing: 'border-box' as const }
const button = { padding: '11px 15px', border: '1px solid #C9A84C', borderRadius: 8, background: '#C9A84C', color: '#111', cursor: 'pointer' }
function dateLabel(iso: string, timeZone: string) { return new Intl.DateTimeFormat('es-MX', { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) }
export function ClinicFast36Panel({ patientId, planStatus, readOnly = false, previewOnly = true }: { patientId: string; planStatus: 'loading' | 'active' | 'inactive' | 'unavailable'; readOnly?: boolean; previewOnly?: boolean }) {
  const [sessions, setSessions] = useState<ClinicFast36Session[]>([])
  const [week, setWeek] = useState(1)
  const [localStart, setLocalStart] = useState('')
  const [timeZone, setTimeZone] = useState('America/Los_Angeles')
  const [provisional, setProvisional] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [loaded, setLoaded] = useState(false)
  const guard = useRef(false)
  const current = sessions.find(item => item.week === week)
  const intended = buildClinicFast36({ week, localStart, timeZone, provisional })
  const hasOutcome = current && !['pending', 'active'].includes(current.status)
  useEffect(() => {
    if (planStatus !== 'active') return
    const controller = new AbortController()
    fetch(`/api/preview/clinic-fast36?patientId=${encodeURIComponent(patientId)}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok || !data.ok) throw new Error(); return data.sessions as ClinicFast36Session[] })
      .then(items => { if (controller.signal.aborted) return; setSessions(items); setLoaded(true); const item = items.find(s => s.week === 1); if (item) { setLocalStart(item.localStart); setTimeZone(item.timeZone); setProvisional(item.provisional) } })
      .catch(() => { if (!controller.signal.aborted) setMessage('No se pudo cargar FAST 36. Recarga antes de guardar.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [patientId, planStatus])
  function chooseWeek(value: number) {
    setWeek(value); setMessage('')
    const item = sessions.find(s => s.week === value)
    setLocalStart(item?.localStart ?? ''); setTimeZone(item?.timeZone ?? 'America/Los_Angeles'); setProvisional(item?.provisional ?? true)
  }
  async function save() {
    if (readOnly || planStatus !== 'active' || !intended || !loaded || hasOutcome || guard.current) return
    guard.current = true; setSaving(true); setMessage('')
    try {
      const response = await fetch('/api/preview/clinic-fast36', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ week, localStart, timeZone, provisional, patientId, expectedId: current?.id ?? '' }) })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error()
      const verifyResponse = await fetch(`/api/preview/clinic-fast36?patientId=${encodeURIComponent(patientId)}`, { cache: 'no-store' })
      const verify = await verifyResponse.json()
      if (!verifyResponse.ok || !verify.ok || !verify.sessions.some((s: ClinicFast36Session) => s.id === data.session.id && s.startAt === intended.startAt && s.provisional === provisional)) throw new Error()
      setSessions(verify.sessions); setMessage(previewOnly ? '✓ Horario guardado y verificado en Preview.' : '✓ Horario guardado y verificado.')
    } catch { setLoaded(false); setMessage('No se pudo verificar el guardado. Recarga y revisa el horario antes de intentar otra vez.') }
    finally { guard.current = false; setSaving(false) }
  }
  if (planStatus !== 'active') return <section aria-label="Estado de FAST 36" style={{ gridColumn: '1 / -1', border: '1px solid rgba(201,168,76,.3)', borderRadius: 14, padding: 22 }}>
    <h3 style={{ marginTop: 0, fontFamily: 'Georgia, serif', fontSize: 25 }}>FAST 36</h3>
    <p role="status" style={{ color: '#9A9590', fontSize: 13 }}>{planStatus === 'inactive' ? 'El plan vigente no incluye FAST 36.' : planStatus === 'loading' ? 'Verificando el plan vigente…' : 'No se pudo verificar el plan vigente. Actualiza el expediente para revisar FAST 36.'}</p>
  </section>
  return <section style={{ gridColumn: '1 / -1', border: '1px solid rgba(201,168,76,.3)', borderRadius: 14, padding: 22, display: 'grid', gap: 14 }}>
    <h3 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 25 }}>FAST 36 · horario y seguimiento{previewOnly ? ' Preview' : ''}</h3>
    <p style={{ margin: 0, color: '#9A9590', fontSize: 13 }}>{readOnly ? 'Candidata de sólo lectura: consulta los horarios registrados. No se guardan cambios.' : 'Configura cada semana por separado. El resultado del ayuno requiere confirmación del paciente.'}{previewOnly ? ' Estos horarios sólo se muestran en Preview.' : ''}</p>
    {loading ? <p>Cargando FAST 36…</p> : <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14 }}>
        <label>Semana<select style={field} value={week} disabled={saving} onChange={e => chooseWeek(Number(e.target.value))}>{[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
        <label>Inicio local<input style={field} type="datetime-local" value={localStart} disabled={readOnly || saving || Boolean(hasOutcome)} onChange={e => setLocalStart(e.target.value)} /></label>
        <label>Zona horaria<select style={field} value={timeZone} disabled={readOnly || saving || Boolean(hasOutcome)} onChange={e => setTimeZone(e.target.value)}><option value="America/Los_Angeles">Seattle / Los Ángeles</option><option value="America/Denver">Denver</option><option value="America/Chicago">Chicago</option><option value="America/New_York">Nueva York</option><option value="America/Mexico_City">Ciudad de México</option></select></label>
      </div>
      <label><input type="checkbox" checked={provisional} disabled={readOnly || saving || Boolean(hasOutcome)} onChange={e => setProvisional(e.target.checked)} /> Horario provisional, pendiente de confirmar por el paciente</label>
      {intended && <p style={{ color: '#E2C87A', margin: 0 }}>Fin programado: {dateLabel(intended.plannedEndAt, timeZone)} · 36 horas</p>}
      {localStart && !intended && <p role="alert">Revisa la fecha, hora y zona. Las horas inexistentes o ambiguas por cambio de horario requieren otra hora.</p>}
      {current && <div style={{ border: '1px solid rgba(201,168,76,.2)', padding: 14, borderRadius: 8 }}>
        <strong>Horario guardado · semana {current.week}</strong>
        <p>{dateLabel(current.startAt, current.timeZone)} → {dateLabel(current.plannedEndAt, current.timeZone)}</p>
        <p>{current.provisional ? 'Horario provisional; pendiente de confirmación.' : 'Horario confirmado.'} Resultado: {current.status === 'completed' ? 'Completado por el paciente' : current.status === 'ended_early' ? 'Terminado antes' : current.status === 'stopped_for_safety' ? 'Interrumpido por seguridad' : 'Sin confirmar por el paciente'}.</p>
        <a href={`/clinic-preview/fast-36?patient=${encodeURIComponent(patientId)}`} style={{ color: '#E2C87A' }}>Ver contador y seguimiento Preview →</a>
      </div>}
      <button type="button" style={button} disabled={readOnly || !intended || !loaded || saving || Boolean(hasOutcome)} onClick={() => void save()}>{readOnly ? 'Sólo lectura' : saving ? 'Guardando y verificando…' : `Guardar horario FAST 36${previewOnly ? ' Preview' : ''}`}</button>
      {hasOutcome && <p>Esta semana ya tiene un resultado confirmado; su horario se conserva.</p>}
    </>}
    {message && <p role="status" style={{ color: '#E2C87A' }}>{message}</p>}
  </section>
}
