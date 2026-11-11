'use client'

import { useEffect, useRef, useState } from 'react'
import { getClinicPlanReadiness, type ClinicPlanReadinessData } from '@/lib/clinic-plan-readiness'
import { ClinicPlanMaterialsPanel } from '@/app/clinic-preview/clinic-plan-materials-panel'
import styles from './plans.module.css'

type Plan = ClinicPlanReadinessData & { id?: string; updatedAt?: string; status?: string }
const empty: Plan = { planLabel: '', dietName: '', phase: 'Sin fase', phaseWeek: 1, treatmentStart: '', phaseStart: '', specialInstructions: '', kenkhoTier: 'Clinic', visitCadenceDays: 7, calorieTarget: null, startingWeightKg: null, currentWeightKg: null, goalWeightKg: null }
const phases = ['Jing', 'Qi', 'Xue', 'Yang Sheng']

export function PatientPlanEditor({ patientId, readOnly = false }: { patientId: string; readOnly?: boolean }) {
  const [draft, setDraft] = useState<Plan>(empty)
  const [live, setLive] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [weightUnit, setWeightUnit] = useState<'lb' | 'kg'>('lb')
  const [message, setMessage] = useState('')
  const [review, setReview] = useState<Plan | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [materialsVersion, setMaterialsVersion] = useState(0)
  const working = useRef(false)
  const currentPatient = useRef(patientId)
  currentPatient.current = patientId
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setMessage(''); setReview(null); setConfirmed(false); setLive(null); setDraft(empty)
    fetch(`/api/preview/clinic-plans?patientId=${encodeURIComponent(patientId)}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json() })
      .then(data => {
        if (controller.signal.aborted) return
        if (!data.ok || data.patient?.id !== patientId) throw new Error()
        setLive(data.livePlan)
        setDraft({ ...empty, ...(data.draft?.status !== 'Published' ? data.livePlan : {}), ...(data.draft ?? data.livePlan ?? {}) })
        setLoading(false)
      }).catch(() => { if (!controller.signal.aborted) { setMessage('No se pudo cargar el plan. Recarga antes de hacer cambios.'); setLoading(true) } })
    return () => controller.abort()
  }, [patientId])

  function change(key: keyof Plan, value: unknown) {
    setDraft(previous => ({ ...previous, [key]: value })); setReview(null); setConfirmed(false); setMessage('')
  }
  async function save(prepare: boolean) {
    if (working.current || loading || readOnly) return
    if (prepare && !getClinicPlanReadiness(draft).ready) { setMessage('Completa los datos indicados antes de revisar el plan.'); return }
    working.current = true; setBusy(true); setMessage('')
    const id = patientId
    try {
      const response = await fetch('/api/preview/clinic-plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, patientId: id, status: prepare ? 'Ready for Review' : 'Draft' }) })
      const data = await response.json()
      if (!response.ok || !data.ok || !data.draft?.id) throw new Error()
      if (currentPatient.current !== id) return
      setDraft(data.draft); setReview(prepare ? data.draft : null); setConfirmed(false)
      setMessage(prepare ? 'Revisa este resumen. El paciente todavía ve su plan anterior.' : 'Borrador guardado. El paciente todavía no ve estos cambios.')
    } catch { if (currentPatient.current === id) setMessage('No se pudo verificar el borrador. Recarga antes de volver a guardarlo.') }
    finally { working.current = false; setBusy(false) }
  }
  async function publish() {
    if (!review || !confirmed || working.current || readOnly) return
    working.current = true; setBusy(true); setMessage('')
    const id = patientId
    try {
      const response = await fetch('/api/preview/clinic-plans', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: id, confirmation: 'PUBLICAR PLAN PREVIEW', expectedDraftId: review.id, expectedDraftUpdatedAt: review.updatedAt }) })
      const data = await response.json()
      if (!response.ok || !data.ok || !data.livePlan?.id) throw new Error()
      if (currentPatient.current !== id) return
      setLive(data.livePlan); setDraft({ ...review, status: 'Published' }); setReview(null); setConfirmed(false); setMaterialsVersion(value => value + 1)
      setMessage(data.auditVerified === false ? 'Plan publicado y verificado. Su auditoría requiere revisión; no vuelvas a publicarlo.' : 'Plan publicado y verificado. My AQSLIM mostrará este plan y su guía de fase al cliente con cuenta vinculada y acceso vigente. El anterior permanece en el historial.')
    } catch { if (currentPatient.current === id) { setReview(null); setConfirmed(false); setMessage('No se pudo confirmar la publicación. Recarga y revisa el plan vigente antes de repetir: pudo haberse guardado.') } }
    finally { working.current = false; setBusy(false) }
  }
  const readiness = getClinicPlanReadiness(draft)
  const field = (label: string, key: keyof Plan, type = 'text') => {
    const isWeight = ['startingWeightKg', 'currentWeightKg', 'goalWeightKg'].includes(key)
    const value = isWeight && weightUnit === 'lb' && draft[key] !== null && draft[key] !== undefined
      ? Math.round(Number(draft[key]) * 2.2046226218 * 100) / 100 : draft[key]
    return <label>{isWeight ? label.replace('(kg)', `(${weightUnit})`) : label}<input type={type} value={String(value ?? '')} step={type === 'number' ? 'any' : undefined} onChange={event => {
      const numeric = event.target.value === '' ? null : Number(event.target.value)
      change(key, type === 'number' ? isWeight && weightUnit === 'lb' && numeric !== null ? numeric / 2.2046226218 : numeric : event.target.value)
    }} /></label>
  }
  return <section className={styles.editor} aria-label="Plan y guía de alimentación" onKeyDown={event => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault() }}>
    <h2>Plan y guía de alimentación</h2>
    {live && <p className={styles.current}>Plan vigente: <strong>{live.planLabel || live.dietName}</strong> · {live.phase || 'Sin fase'} · semana {live.phaseWeek ?? '—'}</p>}
    <p>Selecciona la fase y revisa las indicaciones. Guardar un borrador no cambia lo que ve el cliente; publicar sí.</p>
    {loading && !message && <p role="status">Cargando el plan del paciente…</p>}
    {readOnly && <p role="status">Expediente de sólo lectura. Reactívalo antes de cambiar su plan.</p>}
    <fieldset disabled={loading || busy || readOnly}>
      <div className={styles.grid}>
        <label>Guía de alimentación<select value={draft.phase ?? 'Sin fase'} onChange={event => { const phase = event.target.value; setDraft(previous => ({ ...previous, phase, planLabel: phase === 'Sin fase' ? '' : `Kenkho Path — ${phase}`, dietName: phase === 'Sin fase' ? '' : phase })); setReview(null); setConfirmed(false) }}><option value="Sin fase">Selecciona una fase…</option>{phases.map(phase => <option key={phase}>{phase}</option>)}</select></label>
        {field('Nombre del plan', 'planLabel')}
        {field('Inicio del tratamiento', 'treatmentStart', 'date')}
        {field('Inicio de esta fase', 'phaseStart', 'date')}
        {field('Semana de la fase', 'phaseWeek', 'number')}
        <label>Modalidad<select value={draft.kenkhoTier ?? 'Clinic'} onChange={event => change('kenkhoTier', event.target.value)}><option value="Clinic">Atención en clínica</option>{['Start','Plus','Elite'].map(tier => <option key={tier}>{tier}</option>)}</select></label>
      </div>
      <label>Indicaciones que verá el cliente<textarea rows={4} value={draft.specialInstructions ?? ''} onChange={event => change('specialInstructions', event.target.value)} /></label>
      <details><summary>Pesos y ajustes del plan</summary><label>Unidad de peso<select value={weightUnit} onChange={event => setWeightUnit(event.target.value as 'lb' | 'kg')}><option value="lb">Libras (lb)</option><option value="kg">Kilogramos (kg)</option></select></label><div className={styles.grid}>
        {field('Peso inicial (kg)', 'startingWeightKg', 'number')}{field('Peso actual (kg)', 'currentWeightKg', 'number')}{field('Peso meta (kg)', 'goalWeightKg', 'number')}
        {field('Días entre consultas', 'visitCadenceDays', 'number')}{field('Calorías al día · opcional', 'calorieTarget', 'number')}{field('Dieta / plan', 'dietName')}
      </div></details>
      <p>La guía privada corresponde a la fase publicada. Los archivos e instrucciones anteriores se conservan en el historial.</p>
      <div className={styles.buttons}><button type="button" onClick={() => void save(false)}>Guardar borrador</button><button type="button" onClick={() => void save(true)}>Revisar y publicar</button></div>
      {!readiness.ready && <details><summary>Datos pendientes ({readiness.checks.filter(check => !check.passed).length})</summary><ul>{readiness.checks.filter(check => !check.passed).map(check => <li key={check.key}>{check.label}</li>)}</ul></details>}
      {review && <div className={styles.review}>
        <h3>Revisar antes de publicar</h3><p><strong>{review.planLabel}</strong> · {review.phase} · semana {review.phaseWeek}</p><p>Inicio: {review.phaseStart} · Modalidad: {review.kenkhoTier}</p><p style={{ whiteSpace: 'pre-wrap' }}>{review.specialInstructions}</p>
        <label className={styles.confirm}><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Confirmo que revisé el plan y deseo que el cliente vea esta versión.</label>
        <button type="button" disabled={!confirmed} onClick={() => void publish()}>Publicar en My AQSLIM</button>
      </div>}
    </fieldset>
    {message && <p role="status">{message}</p>}
    {live?.id && <details><summary>Archivos e historial del plan</summary><ClinicPlanMaterialsPanel key={`${patientId}-${materialsVersion}`} patientId={patientId} readOnly={readOnly} /></details>}
  </section>
}
