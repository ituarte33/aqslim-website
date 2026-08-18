'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { PilotFeedback } from '@/app/pilot-feedback'
import styles from './restaurant.module.css'

type Recommendation = {
  item: string
  reason: string
  modification: string
}

type AdvisorResult = {
  best: Recommendation
  adjusted: Recommendation
  avoid: Recommendation
  confidenceNote: string
}

const MAX_IMAGE_EDGE = 1800

async function optimizeImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas unavailable')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', .84).split(',')[1]
}

export function RestaurantAdvisor({ phase, language }: { phase: string; language: 'es' | 'en' }) {
  const es = language === 'es'
  const fileRef = useRef<HTMLInputElement>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [restaurant, setRestaurant] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AdvisorResult | null>(null)
  const [feedbackTarget, setFeedbackTarget] = useState<{ id: string; context: unknown } | null>(null)

  const loadFile = useCallback(async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      setError(es ? 'Usa una imagen JPG, PNG o WEBP de máximo 10 MB.' : 'Use a JPG, PNG, or WEBP image up to 10 MB.')
      return
    }
    try {
      setError(null)
      setResult(null)
      setFeedbackTarget(null)
      setPreview(URL.createObjectURL(file))
      setImageBase64(await optimizeImage(file))
    } catch {
      setError(es ? 'No pudimos preparar esa imagen.' : 'We could not prepare that image.')
    }
  }, [es])

  async function analyze() {
    if (!imageBase64 || loading) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/restaurant-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg', restaurant, phase, language }),
      })
      const data = await response.json()
      if (!response.ok) {
        const errorCode = data.error || 'analysis_failed'
        setError(es ? 'No pudimos analizar el menú. Inténtalo con una foto más clara.' : 'We could not analyze the menu. Try a clearer photo.')
        setFeedbackTarget({
          id: crypto.randomUUID(),
          context: { restaurant, phase, errorCode, correlationId: data.correlationId ?? null },
        })
        return
      }
      setResult(data)
      setFeedbackTarget({ id: crypto.randomUUID(), context: { restaurant, phase, result: data } })
    } catch {
      const errorCode = 'network_error'
      setError(es ? 'No pudimos analizar el menú. Inténtalo con una foto más clara.' : 'We could not analyze the menu. Try a clearer photo.')
      setFeedbackTarget({ id: crypto.randomUUID(), context: { restaurant, phase, errorCode } })
    } finally {
      setLoading(false)
    }
  }

  const recommendations = result ? [
    { key: 'best', label: es ? 'Mejor opción' : 'Best option', data: result.best },
    { key: 'adjusted', label: es ? 'Buena opción con ajuste' : 'Good option with an adjustment', data: result.adjusted },
    { key: 'avoid', label: es ? 'Evitar por ahora' : 'Avoid for now', data: result.avoid },
  ] : []

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/my-aqslim/pilot" className={styles.brand}>AQ<span>SLIM</span></Link>
        <span>{es ? 'ACCESO PILOTO' : 'PILOT ACCESS'}</span>
      </header>

      <section className={styles.content}>
        <Link href="/my-aqslim/pilot" className={styles.back}>{es ? '← Volver al piloto' : '← Back to pilot'}</Link>
        <h1>{es ? '¿Qué puedo comer aquí?' : 'What can I eat here?'}</h1>
        <p className={styles.intro}>{es ? 'Fotografía o sube el menú del restaurante y AQ Buddy te mostrará opciones compatibles con tu fase.' : 'Photograph or upload the restaurant menu and AQ Buddy will show options compatible with your phase.'}</p>

        <section className={styles.formPanel}>
          <button type="button" className={styles.upload} onClick={() => fileRef.current?.click()}>
            {preview ? <img src={preview} alt={es ? 'Menú seleccionado' : 'Selected menu'} /> : <><b>▣</b><span>{es ? 'Fotografía o sube el menú' : 'Photograph or upload the menu'}</span><small>JPG, PNG, WEBP · {es ? 'máx.' : 'max'} 10 MB</small></>}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={event => void loadFile(event.target.files?.[0])} />

          <label className={styles.field}>
            <span>{es ? 'Nombre del restaurante (opcional)' : 'Restaurant name (optional)'}</span>
            <input value={restaurant} onChange={event => setRestaurant(event.target.value)} maxLength={100} />
          </label>

          <div className={styles.context}><span>{es ? 'Tu contexto' : 'Your context'}</span><strong>{es ? 'Fase' : 'Phase'} {phase}</strong></div>

          <button type="button" className={styles.analyze} disabled={!imageBase64 || loading} onClick={analyze}>
            {loading ? (es ? 'Analizando menú…' : 'Analyzing menu…') : (es ? 'Analizar menú con AQ Buddy' : 'Analyze menu with AQ Buddy')}
          </button>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          {error && feedbackTarget ? <PilotFeedback key={feedbackTarget.id} tool="Asesor de restaurantes" language={language} responseId={feedbackTarget.id} context={feedbackTarget.context} issueOnly /> : null}
          <p className={styles.disclosure}>{es ? 'La orientación es aproximada y no sustituye tu plan individual ni la orientación clínica.' : 'Guidance is approximate and does not replace your individual plan or clinical guidance.'}</p>
        </section>

        {result ? (
          <section className={styles.results} aria-live="polite">
            <h2>{es ? 'Opciones del menú' : 'Menu options'}</h2>
            {recommendations.map(({ key, label, data }, index) => (
              <article key={key} className={`${styles.result} ${styles[key]}`}>
                <span className={styles.rank}>{index + 1}</span>
                <div><h3>{label}</h3><strong>{data.item}</strong><p>{data.reason}</p><small>{es ? 'AJUSTE:' : 'ADJUSTMENT:'} {data.modification}</small></div>
              </article>
            ))}
            <p className={styles.confidence}>{result.confidenceNote}</p>
            {feedbackTarget ? <PilotFeedback key={feedbackTarget.id} tool="Asesor de restaurantes" language={language} responseId={feedbackTarget.id} context={feedbackTarget.context} /> : null}
          </section>
        ) : null}
      </section>
    </main>
  )
}
