'use client'

import { useEffect, useState } from 'react'
import type { ClinicMaterialEvent } from '@/lib/clinic-plan-materials'
import type { PlanMaterialAttachment } from '@/lib/materials-policy'

type MaterialsState = { revision: string; attachments: PlanMaterialAttachment[]; currentIds: string[]; history: ClinicMaterialEvent[] }
export function ClinicPlanMaterialsPanel({ patientId, readOnly = false }: { patientId: string; readOnly?: boolean }) {
  const [data, setData] = useState<MaterialsState | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setData(null)
    setSelected([])
    setMessage('')
    if (!patientId) return
    fetch(`/api/preview/clinic-plan-materials?patientId=${encodeURIComponent(patientId)}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json() })
      .then(result => { if (!controller.signal.aborted) { setData(result); setSelected(result.currentIds) } })
      .catch(() => { if (!controller.signal.aborted) setMessage('No se pudo cargar el historial de materiales. Recarga antes de asignar archivos.') })
    return () => controller.abort()
  }, [patientId])
  async function save() {
    if (readOnly || !data || saving) return
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/preview/clinic-plan-materials', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, revision: data.revision, attachmentIds: selected, confirmation: 'ASIGNAR MATERIALES PLAN ACTUAL' }),
      })
      if (!response.ok) throw new Error()
      const readback = await fetch(`/api/preview/clinic-plan-materials?patientId=${encodeURIComponent(patientId)}`, { cache: 'no-store' })
      if (!readback.ok) throw new Error()
      const result = await readback.json()
      if (!result.ok || result.revision !== data.revision || JSON.stringify([...result.currentIds].sort()) !== JSON.stringify([...selected].sort())) throw new Error()
      setData(result)
      setMessage('Asignación guardada y verificada. El cliente sólo verá los archivos seleccionados para su plan actual.')
    } catch { setMessage('No se pudo verificar la asignación. Recarga: el plan o los materiales pudieron cambiar.') }
    finally { setSaving(false) }
  }
  return <section aria-label="Materiales e historial del plan" style={{ gridColumn: '1 / -1', border: '1px solid rgba(201,168,76,.25)', borderRadius: 14, padding: 20, color: '#D9D5CF' }}>
    <h3 style={{ color: '#C9A84C', fontWeight: 500, marginTop: 0 }}>Materiales e historial del plan</h3>
    {readOnly && <p style={{ color: '#E2C87A', fontSize: 13 }}>Candidata de sólo lectura: la asignación de materiales permanece sin cambios.</p>}
    <p style={{ color: '#aaa', fontSize: 13, lineHeight: 1.6 }}>El cliente sólo ve materiales del plan vigente. Al publicar otro plan, los archivos anteriores quedan únicamente en Clinic. Las guías de fase se actualizan automáticamente.</p>
    {data ? <>
      <h4>Archivos del expediente</h4>
      <p style={{ color: '#aaa', fontSize: 12 }}>Selecciona únicamente los archivos que corresponden al plan actual publicado. Los demás permanecen en el historial de Clinic.</p>
      {data.attachments.length === 0 ? <p>Sin archivos adjuntos.</p> : data.attachments.map(item => <div key={item.id} style={{ padding: '10px 0', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', gap: 9, alignItems: 'center', flex: '1 1 240px' }}><input type="checkbox" disabled={readOnly || saving} checked={selected.includes(item.id)} onChange={event => setSelected(previous => event.target.checked ? [...previous, item.id] : previous.filter(id => id !== item.id))} />{item.filename}</label>
        <span style={{ color: '#aaa', fontSize: 12 }}>{data.currentIds.includes(item.id) ? 'Compartido · Plan vigente' : 'Sólo Clinic · Histórico / sin asignar'}</span>
        <a href={item.url} target="_blank" rel="noreferrer" style={{ color: '#C9A84C' }}>Consultar en Clinic</a>
      </div>)}
      {data.attachments.length > 0 ? <button type="button" disabled={readOnly || saving} onClick={() => void save()} style={{ marginTop: 12, padding: '11px 14px', border: '1px solid #C9A84C', borderRadius: 9, background: '#181611', color: '#E2C87A', cursor: 'pointer' }}>{saving ? 'Guardando y verificando…' : 'Confirmar archivos del plan vigente'}</button> : null}
      <h4>Historial de planes · Sólo Clinic</h4>
      {data.history.length === 0 ? <p style={{ color: '#aaa', fontSize: 12 }}>Los próximos cambios de plan conservarán aquí el plan anterior. Los archivos antiguos del expediente siguen disponibles arriba.</p> : data.history.map((event, index) => <details key={`${event.at}-${index}`} style={{ padding: '12px 0', borderTop: '1px solid #333' }}>
        <summary>{event.label} · {new Date(event.at).toLocaleDateString('es-US')} · Histórico</summary>
        <p style={{ whiteSpace: 'pre-wrap', color: '#aaa' }}>{String(event.planFields?.['Dieta en Nutrimind'] ?? '')}{'\n'}{String(event.planFields?.['Fase Actual'] ?? '')}{'\n'}{String(event.planFields?.['Instrucciones Especiales'] ?? '')}</p>
        {event.attachments.map(item => <p key={item.id}><a href={data.attachments.find(current => current.id === item.id)?.url ?? item.url} target="_blank" rel="noreferrer" style={{ color: '#C9A84C' }}>{item.filename}</a></p>)}
      </details>)}
    </> : !message ? <p>Cargando materiales…</p> : null}
    {message ? <p role="status" style={{ color: '#E2C87A', fontSize: 13 }}>{message}</p> : null}
  </section>
}
