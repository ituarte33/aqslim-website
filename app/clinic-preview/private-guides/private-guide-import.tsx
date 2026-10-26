'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

type Guide = { slug: string; phase: string; sha256: string }
type GuideStatus = { slug: string; ready: boolean; available: boolean }

export function PrivateGuideImport({ guides, maxBytes }: { guides: Guide[]; maxBytes: number }) {
  const [state, setState] = useState<'loading' | 'connect' | 'upload' | 'ready' | 'error'>('loading')
  const [statuses, setStatuses] = useState<GuideStatus[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const uploadGuard = useRef(false)
  const file = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setState('loading')
    try {
      const response = await fetch('/api/preview/clinic-private-guide', { cache: 'no-store', signal })
      const data = await response.json()
      if (!response.ok || !data.ok || !Array.isArray(data.guides)) throw new Error()
      if (signal?.aborted) return
      const next: GuideStatus[] = guides.map(guide => {
        const status = data.guides.find((entry: GuideStatus) => entry.slug === guide.slug)
        return { slug: guide.slug, ready: status?.ready === true, available: status?.available === true }
      })
      setStatuses(next)
      setState(!data.connected ? 'connect' : next.every(guide => guide.ready) ? 'ready' : 'upload')
    } catch { if (!signal?.aborted) setState('error') }
  }, [guides])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    return () => controller.abort()
  }, [refresh])

  async function upload() {
    if (uploadGuard.current) return
    const selected = Array.from(file.current?.files ?? [])
    if (!selected.length || selected.length > guides.length || selected.some(pdf => pdf.size > maxBytes)) {
      setMessage('Selecciona los PDF originales de las fases, de menos de 1 MB cada uno.')
      return
    }
    uploadGuard.current = true
    setBusy(true)
    setMessage('Comprobando los archivos seleccionados…')
    let completed = 0
    try {
      const checked: Array<{ guide: Guide; pdf: File }> = []
      for (const pdf of selected) {
        const digest = await crypto.subtle.digest('SHA-256', await pdf.arrayBuffer())
        const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
        const guide = guides.find(entry => entry.sha256 === sha256)
        if (!guide || checked.some(entry => entry.guide.slug === guide.slug)) throw new Error('INVALID_GUIDE')
        checked.push({ guide, pdf })
      }
      for (const { guide, pdf } of checked) {
        setMessage(`Guardando y verificando la guía ${guide.phase}…`)
        const response = await fetch(`/api/preview/clinic-private-guide?phase=${encodeURIComponent(guide.slug)}`, {
          method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: pdf,
        })
        const data = await response.json()
        if (!response.ok || data.verified !== true) throw new Error()
        completed++
        setStatuses(previous => previous.map(entry => entry.slug === guide.slug ? { ...entry, ready: true, available: true } : entry))
      }
      await refresh()
      if (file.current) file.current.value = ''
      setMessage(`✓ ${completed === 1 ? 'Guía guardada' : `${completed} guías guardadas`} en privado y ${completed === 1 ? 'verificada' : 'verificadas'}.`)
    } catch (error) {
      setMessage(error instanceof Error && error.message === 'INVALID_GUIDE'
        ? 'Los archivos deben ser los PDF originales del catálogo, sin modificaciones ni duplicados. Jing debe ser la versión «Una vez por semana».'
        : `No se pudo completar la verificación.${completed ? ` Se conservaron ${completed} guías ya verificadas.` : ''} Vuelve a comprobar el estado antes de reintentar.`)
    } finally { uploadGuard.current = false; setBusy(false) }
  }

  return <main style={{ minHeight: '100vh', background: '#0A0A0A', color: '#FAFAF8', padding: '40px 24px', fontFamily: 'Arial, sans-serif' }}>
    <section style={{ maxWidth: 650, margin: '0 auto', padding: 28, border: '1px solid #6C5927', borderRadius: 16 }}>
      <Link href="/clinic" style={{ color: '#E2C87A' }}>← Volver a Clinic</Link>
      <h1 style={{ fontFamily: 'Georgia, serif', color: '#E2C87A' }}>Guías de alimentación · Acceso privado</h1>
      <p style={{ lineHeight: 1.6 }}>Cada guía se abre desde My AQSLIM después de comprobar la cuenta del cliente, su acceso vigente y la fase de su plan publicado.</p>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 10 }}>
        {guides.map(guide => {
          const status = statuses.find(entry => entry.slug === guide.slug)
          return <li key={guide.slug} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: 12, border: '1px solid #413823', borderRadius: 8 }}>
            <strong>{guide.phase}</strong>
            <span style={{ color: status?.ready ? '#9ED4A8' : '#C9C1B1' }}>{state === 'loading' ? 'Comprobando…' : status?.ready ? '✓ Disponible en privado' : status?.available ? 'Pendiente de cargar' : 'No se pudo verificar'}</span>
          </li>
        })}
      </ul>
      {state === 'loading' ? <p role="status">Comprobando almacenamiento privado…</p> : state === 'connect' ? <p role="status">No se pudo acceder al almacenamiento privado. Revisa su conexión al proyecto aqslim en Vercel para el entorno de prueba.</p> : state === 'upload' ? <>
        <label htmlFor="phase-pdfs">Selecciona uno o varios PDF originales de las fases</label>
        <input id="phase-pdfs" ref={file} type="file" multiple accept="application/pdf,.pdf" disabled={busy} style={{ display: 'block', margin: '20px 0', maxWidth: '100%' }} />
        <button type="button" disabled={busy} onClick={() => void upload()} style={{ padding: '13px 18px', borderRadius: 9, background: '#C9A84C', color: '#111', border: 0, cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Guardando y verificando…' : 'Guardar guías en privado'}</button>
      </> : state === 'ready' ? <p role="status" style={{ color: '#9ED4A8' }}>✓ Las cuatro guías están disponibles en privado. Su carga no cambia el plan de ningún cliente.</p> : <p role="alert">No se pudo comprobar el acceso privado.</p>}
      {message ? <p role="status">{message}</p> : null}
      <button type="button" disabled={busy || state === 'loading'} onClick={() => void refresh()} style={{ display: 'block', marginTop: 24, padding: 10, color: '#E2C87A', border: '1px solid #6C5927', borderRadius: 8, background: 'transparent' }}>Volver a comprobar</button>
      <p style={{ color: '#aaa', fontSize: 12, lineHeight: 1.6 }}>Las consultas, los planes y los permisos de pacientes se administran desde Clinic. Los permisos de los originales en Drive se revisan por separado.</p>
    </section>
  </main>
}
