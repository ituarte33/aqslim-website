'use client'
import { useRef, useState } from 'react'
import type { reviewClinicAccessRenewal } from '@/lib/clinic-access-renewal'
type Review = Awaited<ReturnType<typeof reviewClinicAccessRenewal>>['review']
const control = { padding: '10px 12px', border: '1px solid rgba(201,168,76,.35)', borderRadius: 8, background: '#15140f', color: '#E2C87A' }
export function ClinicConsultationAccess({ patientId, consultations, readOnly }: { patientId: string; consultations: { id: string; consultationDate: string | null; consultationType: string }[]; readOnly: boolean }) {
  const [consultationId, setConsultationId] = useState(''), [review, setReview] = useState<Review | null>(null)
  const [busy, setBusy] = useState(false), [confirmation, setConfirmation] = useState(''), [message, setMessage] = useState('')
  const guard = useRef(false)
  const visits = consultations.filter(v => ['Cliente Nuevo', 'Cliente subsecuente', 'Cliente Re-Inicio'].includes(v.consultationType))
  async function prepare() {
    if (guard.current || !consultationId) return
    guard.current = true; setBusy(true); setReview(null); setMessage(''); setConfirmation('')
    try {
      const params = new URLSearchParams({ patientId, consultationId })
      const response = await fetch(`/api/preview/clinic-consultation-access?${params}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error()
      setReview(data.review)
    } catch { setMessage('No se pudo verificar el acceso. Revisa la consulta antes de volver a intentarlo.') }
    finally { guard.current = false; setBusy(false) }
  }
  async function execute() {
    if (readOnly || !review?.executionEnabled || review.state !== 'update' || confirmation !== 'ACTUALIZAR ACCESO' || guard.current) return
    guard.current = true; setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/preview/clinic-consultation-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId, consultationId, fingerprint: review.fingerprint, confirmation }) })
      const data = await response.json()
      if (!response.ok || !data.ok || !data.result?.verified) throw new Error()
      setMessage('✓ Acceso actualizado y verificado. La consulta permanece registrada una sola vez.'); setReview(null); setConfirmation('')
    } catch { setReview(null); setConfirmation(''); setMessage('La consulta sigue registrada. El acceso requiere revisión; no vuelvas a publicar la consulta.') }
    finally { guard.current = false; setBusy(false) }
  }
  return <section aria-label="Vigencia del acceso por consulta" style={{ padding: 22, border: '1px solid rgba(201,168,76,.25)', borderRadius: 14, color: '#D9D5CF' }}>
    <h3 style={{ fontFamily: 'Georgia,serif', fontSize: 25, fontWeight: 400, margin: '0 0 12px' }}>Vigencia del acceso por consulta</h3>
    <p style={{ fontSize: 12, lineHeight: 1.7, color: '#9A9590' }}>Una consulta real actualiza la vigencia clínica. Las pruebas de IA conservan su fecha de inicio original y las restricciones manuales siguen vigentes.</p>
    <label htmlFor="access-visit">Consulta registrada</label><select id="access-visit" style={{ ...control, display: 'block', width: '100%', margin: '8px 0 12px' }} value={consultationId} disabled={busy} onChange={event => { setConsultationId(event.target.value); setReview(null); setConfirmation(''); setMessage('') }}>
      <option value="">Selecciona una consulta…</option>{visits.map(v => <option key={v.id} value={v.id}>{v.consultationDate || 'Fecha por verificar'} · {v.consultationType}</option>)}
    </select>
    {!visits.length ? <p>Primero registra y publica una consulta real en el expediente.</p> : null}
    <button type="button" style={control} disabled={busy || !consultationId} onClick={() => void prepare()}>{busy ? 'Verificando…' : 'Revisar vigencia'}</button>
    {review ? <div style={{ fontSize: 13, lineHeight: 1.7, marginTop: 14 }}>
      <p role="status">{review.message}</p><p>Última consulta: {review.lastCompletedVisit || 'Por verificar'}</p>
      {review.trialStarts || review.trialEnds ? <p>Prueba de IA: {review.trialStarts?.slice(0, 10) || 'Por verificar'} → {review.trialEnds?.slice(0, 10) || 'Por verificar'}</p> : null}
      {readOnly ? <p style={{ color: '#E2C87A' }}>Preview de revisión: no se modificará el acceso.</p> : review.state === 'update' ? <>
        <label htmlFor="access-visit-confirmation">Escribe ACTUALIZAR ACCESO</label><input id="access-visit-confirmation" style={{ ...control, display: 'block', width: '100%', boxSizing: 'border-box', margin: '8px 0' }} value={confirmation} disabled={busy} autoComplete="off" onChange={event => setConfirmation(event.target.value.toUpperCase())} />
        <button type="button" style={control} disabled={busy || confirmation !== 'ACTUALIZAR ACCESO'} onClick={() => void execute()}>Actualizar acceso sin repetir la consulta</button>
      </> : null}
    </div> : null}
    {message ? <p role="status" style={{ color: message.startsWith('✓') ? '#9ED4A8' : '#E0A0A0' }}>{message}</p> : null}
  </section>
}
