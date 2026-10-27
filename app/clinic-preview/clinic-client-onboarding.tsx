'use client'
import { useEffect, useRef, useState } from 'react'
import type { planClinicClientOnboarding } from '@/lib/clinic-client-onboarding-policy'

type Review = ReturnType<typeof planClinicClientOnboarding> & { email: string; fingerprint: string; executionEnabled: boolean }
const box = { border: '1px solid rgba(201,168,76,.28)', borderRadius: 14, padding: 22, background: 'rgba(255,255,255,.02)', color: '#D9D5CF' }
const button = { padding: '12px 14px', border: '1px solid #C9A84C', borderRadius: 9, background: '#211d12', color: '#E2C87A', cursor: 'pointer' }
export function ClinicClientOnboarding({ patientId, readOnly }: { patientId: string; readOnly: boolean }) {
  const [review, setReview] = useState<Review | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [revision, setRevision] = useState(0)
  const submitting = useRef(false)
  useEffect(() => {
    const controller = new AbortController()
    setReview(null); setConfirmation('')
    fetch(`/api/preview/clinic-client-onboarding?patientId=${encodeURIComponent(patientId)}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const data = await response.json()
        if (!response.ok || !data.ok) throw new Error('unavailable')
        if (!controller.signal.aborted) setReview(data.review)
      }).catch(() => { if (!controller.signal.aborted) setMessage('No se pudo verificar el alta. Pulsa Actualizar para volver a consultar.') })
    return () => controller.abort()
  }, [patientId, revision])
  async function execute(action: 'onboard' | 'suspend' | 'restore') {
    if (readOnly || !review?.executionEnabled || submitting.current) return
    const word = action === 'onboard' ? 'ALTA' : action === 'suspend' ? 'RESTRINGIR' : 'RESTAURAR'
    if (confirmation !== word) return
    submitting.current = true; setBusy(true); setMessage('')
    try {
      const response = await fetch(action === 'onboard' ? '/api/preview/clinic-client-onboarding' : '/api/preview/clinic-access-restriction', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, fingerprint: review.fingerprint, confirmation: word, action }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok || !data.result?.verified) throw new Error(data.error)
      setMessage(action === 'onboard' ? '✓ Cuenta vinculada y acceso verificado.' : action === 'suspend' ? '✓ Acceso restringido y verificado.' : '✓ Restricción retirada. Se mantienen las fechas y reglas del acceso existente.')
    } catch { setMessage('No se pudo confirmar la operación. Actualiza la revisión antes de volver a intentarlo.') }
    finally { submitting.current = false; setBusy(false); setConfirmation(''); setRevision(r => r + 1) }
  }
  const linked = review?.operation === 'already_linked'
  return <section style={box} aria-label="Alta de clientes My AQSLIM">
    <h3 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: 26, marginTop: 0 }}>Alta de clientes My AQSLIM</h3>
    <p style={{ fontSize: 12, color: '#9A9590', lineHeight: 1.6 }}>Vincula la cuenta del cliente con su expediente. El alta básica incluye su guía y seguimiento; las pruebas y suscripciones existentes conservan sus condiciones.</p>
    <button type="button" style={button} disabled={busy} onClick={() => { setMessage(''); setRevision(r => r + 1) }}>Actualizar revisión</button>
    {!review ? <p role="status">{message ? 'Revisión no disponible.' : 'Verificando cuenta, expediente y acceso…'}</p> : <>
      <dl style={{ fontSize: 13, lineHeight: 1.8 }}>
        <dt>Correo del expediente</dt><dd>{review.email || 'Pendiente'}</dd>
        <dt>Cuenta</dt><dd>{review.accountLabel}</dd>
        <dt>Acceso</dt><dd>{review.accessLabel}</dd>
        <dt>Última consulta registrada</dt><dd>{review.lastCompletedVisit || 'Sin consulta válida'}</dd>
        <dt>Vigencia clínica</dt><dd>{{ ACTIVE: 'Activo · 0–30 días', GRACE: 'Gracia · 31–60 días', INACTIVE: 'Inactivo · más de 60 días', UNRESOLVED: 'Por verificar' }[review.lifecycle]}</dd>
      </dl>
      {review.blockers.length > 0 ? <ul>{review.blockers.map(item => <li key={item}>{item}</li>)}</ul> : <p role="status">{linked ? '✓ Cuenta vinculada. El alta conserva el acceso actual.' : '✓ Verificación completa. Listo para el alta.'}</p>}
      {readOnly ? <p style={{ color: '#E2C87A' }}>Candidata de revisión: el alta y los cambios de acceso se habilitarán al publicar Clinic.</p> : !review.blockers.length ? <>
        <label style={{ display: 'block', fontSize: 12 }} htmlFor="client-onboarding-confirmation">{linked ? review.manuallyRestricted ? 'Escribe RESTAURAR para retirar la restricción manual.' : 'Escribe RESTRINGIR para pausar el portal.' : 'Escribe ALTA para vincular esta cuenta.'}</label>
        <input id="client-onboarding-confirmation" value={confirmation} onChange={e => setConfirmation(e.target.value.toUpperCase())} autoComplete="off" style={{ padding: 12, margin: '10px 0', width: '100%', background: '#121210', color: '#fff', border: '1px solid #66562b', borderRadius: 8 }} disabled={busy} />
        {linked ? <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {!review.manuallyRestricted ? <button style={button} type="button" disabled={busy || confirmation !== 'RESTRINGIR'} onClick={() => void execute('suspend')}>Restringir acceso</button> : <button style={button} type="button" disabled={busy || confirmation !== 'RESTAURAR'} onClick={() => void execute('restore')}>Restaurar acceso</button>}
        </div> : <button style={button} type="button" disabled={busy || confirmation !== 'ALTA'} onClick={() => void execute('onboard')}>{busy ? 'Verificando…' : 'Dar de alta y vincular cuenta'}</button>}
      </> : null}
    </>}
    {message && <p role="status" style={{ color: message.startsWith('✓') ? '#9ED4A8' : '#E0A0A0' }}>{message}</p>}
  </section>
}
