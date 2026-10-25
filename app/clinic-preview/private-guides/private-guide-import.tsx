'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

export function PrivateGuideImport() {
  const [state, setState] = useState<'loading' | 'connect' | 'upload' | 'ready' | 'error'>('loading')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const uploadGuard = useRef(false)
  const file = useRef<HTMLInputElement>(null)
  async function refresh(signal?: AbortSignal) {
    try {
      const response = await fetch('/api/preview/clinic-private-guide', { cache: 'no-store', signal })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error()
      if (!signal?.aborted) setState(data.ready ? 'ready' : data.connected ? 'upload' : 'connect')
    } catch { if (!signal?.aborted) setState('error') }
  }
  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort() }, [])
  async function upload() {
    const selected = file.current?.files?.[0]
    if (uploadGuard.current) return
    if (!selected || selected.size > 1_048_576) {
      setMessage('Selecciona el PDF Jing corregido, de menos de 1 MB.')
      return
    }
    uploadGuard.current = true
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/preview/clinic-private-guide', { method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: selected })
      const data = await response.json()
      if (!response.ok || data.verified !== true) throw new Error()
      setState('ready')
      setMessage('Guía Jing guardada en privado y verificada.')
    } catch { setMessage('No se pudo verificar la guía. Selecciona el PDF Jing corregido «Una vez por semana» y revisa la conexión privada.') }
    finally { uploadGuard.current = false; setBusy(false) }
  }
  return <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#FAFAF8', padding: '40px 24px', fontFamily: 'Arial, sans-serif' }}>
    <section style={{ maxWidth: 650, margin: '0 auto', padding: 28, border: '1px solid #6C5927', borderRadius: 16 }}>
      <Link href="/clinic" style={{ color: '#E2C87A' }}>← Volver a Clinic</Link>
      <h1 style={{ fontFamily: 'Georgia, serif', color: '#E2C87A' }}>Guía Jing · Acceso privado</h1>
      <p style={{ lineHeight: 1.6 }}>La guía se abre desde My AQSLIM después de comprobar la cuenta del cliente, su acceso vigente y la fase de su plan publicado. El enlace de Drive permanece restringido.</p>
      {state === 'loading' ? <p role="status">Comprobando almacenamiento privado…</p> : state === 'connect' ? <p role="status">Falta conectar el almacén «aqslim-private-phase-guides» al proyecto aqslim en Vercel para el entorno Preview.</p> : state === 'upload' ? <>
        <label htmlFor="jing-pdf">Selecciona el PDF Jing corregido «Una vez por semana»</label>
        <input id="jing-pdf" ref={file} type="file" accept="application/pdf,.pdf" disabled={busy} style={{ display: 'block', margin: '20px 0', maxWidth: '100%' }} />
        <button type="button" disabled={busy} onClick={() => void upload()} style={{ padding: '13px 18px', borderRadius: 9, background: '#C9A84C', color: '#111', border: 0, cursor: 'pointer' }}>{busy ? 'Guardando y verificando…' : 'Guardar guía en privado'}</button>
      </> : state === 'ready' ? <p role="status" style={{ color: '#9ED4A8' }}>✓ Guía privada disponible. Falta comprobar su apertura desde Materiales.</p> : <p role="alert">No se pudo comprobar el acceso privado.</p>}
      {message && <p role="status">{message}</p>}
      <button type="button" disabled={busy} onClick={() => void refresh()} style={{ display: 'block', marginTop: 24, padding: 10, color: '#E2C87A', border: '1px solid #6C5927', borderRadius: 8, background: 'transparent' }}>Volver a comprobar</button>
      <p style={{ color: '#aaa', fontSize: 12, lineHeight: 1.6 }}>Este paso guarda únicamente la guía aprobada. Las consultas, los planes y los permisos de pacientes se administran desde Clinic.</p>
    </section>
  </main>
}
