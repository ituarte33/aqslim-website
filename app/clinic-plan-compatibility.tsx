'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'

type PlanData = {
  status?: string
  planLabel?: string
  treatmentStart?: string
  phase?: string
  phaseWeek?: number | null
  phaseStart?: string
  calorieTarget?: number | null
  dietName?: string
  specialInstructions?: string
  kenkhoTier?: string
  visitCadenceDays?: number | null
  startingWeightKg?: number | null
  currentWeightKg?: number | null
  goalWeightKg?: number | null
  updatedAt?: string | null
}

type PatientIdentity = { name: string; email: string; phone: string }

type PlanPrepareDetail = {
  livePlan?: PlanData | null
  phase?: string
  phaseWeek?: number | null
}

const emptyPlan: PlanData = {
  status: 'Draft',
  planLabel: '',
  treatmentStart: '',
  phase: 'Sin fase',
  phaseWeek: null,
  phaseStart: '',
  calorieTarget: null,
  dietName: '',
  specialInstructions: '',
  kenkhoTier: 'Clinic',
  visitCadenceDays: 7,
  startingWeightKg: null,
  currentWeightKg: null,
  goalWeightKg: null,
}

function inputStyle(): React.CSSProperties {
  return { width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 9, background: '#111', color: '#FAFAF8', border: '1px solid rgba(201,168,76,.25)' }
}

function fieldLabel(text: string) {
  return <div style={{ color: '#8E8881', fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', marginBottom: 5 }}>{text}</div>
}

function numeric(value: number | null | undefined) {
  return value === null || value === undefined || Number.isNaN(value) ? '' : String(value)
}

export function ClinicPlanCompatibility() {
  const pathname = usePathname()
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [active, setActive] = useState(false)
  const [identity, setIdentity] = useState<PatientIdentity | null>(null)
  const [patientId, setPatientId] = useState('')
  const [draft, setDraft] = useState<PlanData>(emptyPlan)
  const [livePlan, setLivePlan] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (pathname !== '/clinic-preview') return

    let hiddenContent: HTMLElement | null = null

    const scrapeIdentity = (): PatientIdentity | null => {
      const heading = [...document.querySelectorAll('h2')].find(el => {
        const text = el.textContent?.trim() ?? ''
        return text && text !== 'Selecciona un paciente'
      })
      if (!heading) return null
      const name = heading.textContent?.trim() ?? ''
      const card = heading.parentElement
      const text = card?.textContent ?? ''
      const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? ''
      const phone = text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/)?.[0] ?? ''
      return name ? { name, email, phone } : null
    }

    const activatePlan = () => {
      const navButtons = [...document.querySelectorAll('nav button')]
      const planButton = navButtons.find(button => button.textContent?.trim() === 'Plan') as HTMLButtonElement | undefined
      if (!planButton) return
      const nav = planButton.parentElement as HTMLElement | null
      if (!nav) return

      let planHost = document.querySelector('[data-clinic-plan-host]') as HTMLElement | null
      if (!planHost) {
        planHost = document.createElement('div')
        planHost.dataset.clinicPlanHost = 'true'
        nav.insertAdjacentElement('afterend', planHost)
      }
      setHost(planHost)

      const next = planHost.nextElementSibling as HTMLElement | null
      if (next && !next.dataset.clinicPlanHost) {
        hiddenContent = next
        hiddenContent.style.display = 'none'
      }
      const nextIdentity = scrapeIdentity()
      setIdentity(nextIdentity)
      setActive(true)
    }

    const deactivate = () => {
      if (hiddenContent) hiddenContent.style.display = ''
      setActive(false)
    }

    const handleClick = (event: MouseEvent) => {
      const button = (event.target as Element | null)?.closest('button')
      const label = button?.textContent?.trim()
      if (label === 'Plan') setTimeout(activatePlan, 0)
      else if (label && ['Consultas', 'Notas', 'My AQSLIM', 'Mensajes', 'Seguimiento'].includes(label)) setTimeout(deactivate, 0)
      else if (button && button.closest('aside')) setTimeout(deactivate, 0)
    }

    document.addEventListener('click', handleClick, true)
    return () => {
      document.removeEventListener('click', handleClick, true)
      if (hiddenContent) hiddenContent.style.display = ''
      document.querySelector('[data-clinic-plan-host]')?.remove()
    }
  }, [pathname])

  useEffect(() => {
    if (pathname !== '/clinic-preview') return
    const handlePrepare = (event: Event) => {
      const detail = (event as CustomEvent<PlanPrepareDetail>).detail
      if (!detail?.livePlan) return
      setDraft(prev => ({
        ...emptyPlan,
        ...detail.livePlan,
        status: 'Draft',
        phase: detail.phase && detail.phase !== 'Sin fase' ? detail.phase : (detail.livePlan?.phase || 'Sin fase'),
        phaseWeek: detail.phaseWeek && detail.phaseWeek > 0 ? detail.phaseWeek : (detail.livePlan?.phaseWeek ?? null),
        visitCadenceDays: prev.visitCadenceDays ?? detail.livePlan?.visitCadenceDays ?? 7,
      }))
      setMessage('Actualización preparada desde la última consulta. Revisa y guarda el borrador Preview.')
    }
    window.addEventListener('clinic-plan-prepare-update', handlePrepare as EventListener)
    return () => window.removeEventListener('clinic-plan-prepare-update', handlePrepare as EventListener)
  }, [pathname])

  useEffect(() => {
    if (!active || !identity) return
    let cancelled = false
    setLoading(true)
    setMessage('')
    const params = new URLSearchParams({ patientName: identity.name })
    if (identity.email) params.set('patientEmail', identity.email)
    else if (identity.phone) params.set('patientPhone', identity.phone)

    fetch(`/api/preview/clinic-plans?${params}`, { cache: 'no-store' })
      .then(async response => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (cancelled) return
        if (!response.ok || !data.ok) throw new Error('load_failed')
        setPatientId(data.patient?.id ?? '')
        setLivePlan(data.livePlan ?? null)
        setDraft(data.draft ? { ...emptyPlan, ...data.draft } : emptyPlan)
      })
      .catch(() => { if (!cancelled) setMessage('No se pudo cargar el plan Preview de este paciente.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [active, identity?.name, identity?.email, identity?.phone])

  const cadenceNote = useMemo(() => {
    const tier = draft.kenkhoTier || 'Clinic'
    if (tier === 'Clinic') return 'Presencial: 7 días es la sugerencia estándar; puedes cambiarla.'
    return `${tier}: la frecuencia automática del tier todavía no está fijada. Define los días manualmente por ahora.`
  }, [draft.kenkhoTier])

  async function saveDraft() {
    if (!patientId || !identity) return
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/preview/clinic-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, ...draft }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error('save_failed')

      const verifyResponse = await fetch(`/api/preview/clinic-plans?patientId=${encodeURIComponent(patientId)}`, { cache: 'no-store' })
      const verifyData = await verifyResponse.json()
      if (!verifyResponse.ok || !verifyData.ok || !verifyData.draft) throw new Error('verify_failed')

      setDraft({ ...emptyPlan, ...verifyData.draft })
      setLivePlan(verifyData.livePlan ?? livePlan)
      setMessage('✓ Borrador de plan guardado y verificado en Clinic Preview. Todavía no modifica My AQSLIM.')
    } catch {
      setMessage('No se pudo guardar y verificar el borrador. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  function copyLivePlan() {
    if (!livePlan) return
    setDraft({ ...emptyPlan, ...livePlan, status: 'Draft', visitCadenceDays: draft.visitCadenceDays ?? 7 })
    setMessage('Plan actual copiado al borrador. Revisa y guarda antes de continuar.')
  }

  if (!active || !host || !identity) return null

  const set = (key: keyof PlanData, value: any) => setDraft(prev => ({ ...prev, [key]: value }))
  const field = inputStyle()

  return createPortal(
    <div style={{ maxWidth: 1040, margin: '0 auto 24px', display: 'grid', gap: 16 }}>
      <div style={{ border: '1px solid rgba(201,168,76,.25)', borderRadius: 16, padding: 22, background: 'rgba(201,168,76,.035)' }}>
        <div style={{ color: '#C9A84C', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase' }}>Plan del paciente · Preview</div>
        <h3 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: 30, margin: '8px 0 6px' }}>{identity.name}</h3>
        <div style={{ color: '#8E8881', fontSize: 12 }}>Trabaja aquí el borrador. El plan real de My AQSLIM permanece sin cambios hasta una publicación explícita.</div>
      </div>

      {loading ? <div style={{ color: '#9A9590', padding: 20 }}>Cargando plan…</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,.8fr) minmax(420px,1.2fr)', gap: 16, alignItems: 'start' }}>
          <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 20, background: 'rgba(255,255,255,.02)' }}>
            <div style={{ color: '#C9A84C', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase' }}>Plan actual · sólo lectura</div>
            {!livePlan ? <div style={{ marginTop: 16, color: '#8E8881', lineHeight: 1.6 }}>No encontré un Plan AQSLIM actual vinculado a este paciente.</div> : <>
              <div style={{ marginTop: 16, display: 'grid', gap: 12, color: '#D9D5CF', fontSize: 13 }}>
                <div><strong>Fase:</strong> {livePlan.phase || 'Sin fase'}{livePlan.phaseWeek ? ` · semana ${livePlan.phaseWeek}` : ''}</div>
                <div><strong>Dieta/plan:</strong> {livePlan.dietName || '—'}</div>
                <div><strong>Calorías:</strong> {livePlan.calorieTarget ?? '—'}</div>
                <div><strong>Kenkho:</strong> {livePlan.kenkhoTier || 'Clinic'}</div>
                <div><strong>Instrucciones:</strong><div style={{ marginTop: 5, whiteSpace: 'pre-wrap', color: '#A9A49E' }}>{livePlan.specialInstructions || '—'}</div></div>
              </div>
              <button onClick={copyLivePlan} style={{ marginTop: 16, width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(201,168,76,.35)', background: 'rgba(201,168,76,.08)', color: '#E2C87A', cursor: 'pointer' }}>Copiar al borrador →</button>
            </>}
          </div>

          <div style={{ border: '1px solid rgba(201,168,76,.22)', borderRadius: 14, padding: 22, background: '#0E0E0E' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ color: '#C9A84C', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase' }}>Borrador Clinic</div>
              <select value={draft.status || 'Draft'} onChange={e => set('status', e.target.value)} style={{ ...field, width: 180 }}><option>Draft</option><option>Ready for Review</option></select>
            </div>

            <div style={{ marginTop: 14 }}>{fieldLabel('Nombre / etiqueta del plan')}<input value={draft.planLabel || ''} onChange={e => set('planLabel', e.target.value)} placeholder="Ej. FAST 36 + Plan Hipocalórico" style={field} /></div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <div>{fieldLabel('Inicio tratamiento')}<input type="date" value={draft.treatmentStart || ''} onChange={e => set('treatmentStart', e.target.value)} style={field} /></div>
              <div>{fieldLabel('Inicio fase')}<input type="date" value={draft.phaseStart || ''} onChange={e => set('phaseStart', e.target.value)} style={field} /></div>
              <div>{fieldLabel('Fase')}<select value={draft.phase || 'Sin fase'} onChange={e => set('phase', e.target.value)} style={field}><option>Sin fase</option><option>Jing</option><option>Qi</option><option>Xue</option><option>Yang Sheng</option></select></div>
              <div>{fieldLabel('Semana en fase')}<input type="number" min="0" value={numeric(draft.phaseWeek)} onChange={e => set('phaseWeek', e.target.value ? Number(e.target.value) : null)} style={field} /></div>
            </div>

            <div style={{ marginTop: 12 }}>{fieldLabel('Dieta / nombre del plan')}<textarea rows={3} value={draft.dietName || ''} onChange={e => set('dietName', e.target.value)} placeholder="Nombre o descripción del plan alimentario" style={{ ...field, resize: 'vertical' }} /></div>
            <div style={{ marginTop: 12 }}>{fieldLabel('Calorías objetivo')}<input type="number" min="0" value={numeric(draft.calorieTarget)} onChange={e => set('calorieTarget', e.target.value ? Number(e.target.value) : null)} style={field} /></div>
            <div style={{ marginTop: 12 }}>{fieldLabel('Instrucciones especiales')}<textarea rows={5} value={draft.specialInstructions || ''} onChange={e => set('specialInstructions', e.target.value)} placeholder="Indicaciones importantes que debe ver el paciente y AQSLIM" style={{ ...field, resize: 'vertical' }} /></div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <div>{fieldLabel('Modalidad / Kenkho Tier')}<select value={draft.kenkhoTier || 'Clinic'} onChange={e => set('kenkhoTier', e.target.value)} style={field}><option>Clinic</option><option>Start</option><option>Plus</option><option>Elite</option></select></div>
              <div>{fieldLabel('Cadencia de citas (días)')}<input type="number" min="1" value={numeric(draft.visitCadenceDays)} onChange={e => set('visitCadenceDays', e.target.value ? Number(e.target.value) : null)} style={field} /></div>
            </div>
            <div style={{ color: '#6F6A64', fontSize: 11, marginTop: 7, lineHeight: 1.5 }}>{cadenceNote}</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 12 }}>
              <div>{fieldLabel('Peso inicio kg')}<input type="number" step="0.1" value={numeric(draft.startingWeightKg)} onChange={e => set('startingWeightKg', e.target.value ? Number(e.target.value) : null)} style={field} /></div>
              <div>{fieldLabel('Peso actual kg')}<input type="number" step="0.1" value={numeric(draft.currentWeightKg)} onChange={e => set('currentWeightKg', e.target.value ? Number(e.target.value) : null)} style={field} /></div>
              <div>{fieldLabel('Peso meta kg')}<input type="number" step="0.1" value={numeric(draft.goalWeightKg)} onChange={e => set('goalWeightKg', e.target.value ? Number(e.target.value) : null)} style={field} /></div>
            </div>

            <button onClick={saveDraft} disabled={saving || !patientId} style={{ width: '100%', marginTop: 18, padding: '12px 14px', borderRadius: 9, border: '1px solid rgba(201,168,76,.45)', background: saving || !patientId ? 'rgba(201,168,76,.08)' : '#C9A84C', color: saving || !patientId ? '#8E8881' : '#0A0A0A', cursor: saving || !patientId ? 'not-allowed' : 'pointer', fontWeight: 600 }}>{saving ? 'Guardando…' : 'Guardar borrador Preview'}</button>
            {message && <div style={{ marginTop: 12, color: message.startsWith('✓') ? '#9ED4A8' : '#CDBE8B', fontSize: 12, lineHeight: 1.5 }}>{message}</div>}
          </div>
        </div>
      )}
    </div>,
    host,
  )
}