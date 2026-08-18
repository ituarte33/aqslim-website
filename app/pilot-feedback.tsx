'use client'

import { useEffect, useRef, useState } from 'react'
import type { FeedbackCategory, FeedbackTool } from '@/lib/pilot-feedback'
import styles from './pilot-feedback.module.css'

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024
const MAX_SCREENSHOT_EDGE = 1600

const CATEGORY_OPTIONS: Array<{ value: FeedbackCategory; es: string; en: string }> = [
  { value: 'Ingredientes incorrectos', es: 'Ingredientes incorrectos', en: 'Incorrect ingredients' },
  { value: 'Respuesta incorrecta', es: 'Respuesta incorrecta', en: 'Incorrect response' },
  { value: 'No respetó fase o restricción', es: 'No respetó mi fase o restricción', en: 'Did not respect my phase or restriction' },
  { value: 'Error técnico', es: 'Apareció un error técnico', en: 'A technical error appeared' },
  { value: 'Difícil de usar', es: 'Fue difícil de usar', en: 'It was difficult to use' },
  { value: 'Otro', es: 'Otro', en: 'Other' },
]

async function optimizeScreenshot(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SCREENSHOT_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('Canvas unavailable')
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', .78))
  if (!blob) throw new Error('Image conversion failed')
  return new File([blob], 'captura.jpg', { type: 'image/jpeg' })
}

function technicalContext(value: unknown): string {
  try {
    return JSON.stringify({
      schemaVersion: 1,
      path: window.location.pathname,
      userAgent: navigator.userAgent.slice(0, 400),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      response: value,
    })
  } catch {
    return JSON.stringify({ schemaVersion: 1, path: window.location.pathname })
  }
}

export function PilotFeedback({
  tool,
  language,
  responseId,
  context,
  issueOnly = false,
}: {
  tool: FeedbackTool
  language: 'es' | 'en'
  responseId: string
  context: unknown
  issueOnly?: boolean
}) {
  const es = language === 'es'
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [category, setCategory] = useState<FeedbackCategory | ''>('')
  const [comment, setComment] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attachmentWarning, setAttachmentWarning] = useState(false)

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  async function send(rating: 'Funcionó' | 'Problema') {
    if (sending || sent || (rating === 'Problema' && !category)) return
    setSending(true)
    setError(null)
    try {
      const form = new FormData()
      form.set('tool', tool)
      form.set('rating', rating)
      form.set('category', rating === 'Problema' ? category : '')
      form.set('comment', rating === 'Problema' ? comment : '')
      form.set('context', technicalContext(context))
      form.set('responseId', responseId)
      form.set('language', es ? 'ES' : 'EN')
      if (rating === 'Problema' && screenshot) form.set('screenshot', screenshot)

      const response = await fetch('/api/pilot-feedback', { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'feedback_failed')
      setAttachmentWarning(rating === 'Problema' && Boolean(screenshot) && !data.screenshotAttached)
      setSent(true)
      setOpen(false)
    } catch {
      setError(es ? 'No pudimos enviar el reporte. Inténtalo nuevamente.' : 'We could not send the report. Please try again.')
    } finally {
      setSending(false)
    }
  }

  async function selectScreenshot(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > MAX_SCREENSHOT_BYTES) {
      setError(es ? 'Usa una captura JPG o PNG de máximo 5 MB.' : 'Use a JPG or PNG screenshot up to 5 MB.')
      return
    }
    try {
      const optimized = await optimizeScreenshot(file)
      if (preview) URL.revokeObjectURL(preview)
      setScreenshot(optimized)
      setPreview(URL.createObjectURL(optimized))
      setError(null)
    } catch {
      setError(es ? 'No pudimos preparar esa captura.' : 'We could not prepare that screenshot.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function removeScreenshot() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setScreenshot(null)
  }

  if (sent) {
    return (
      <div className={styles.thanks} role="status">
        <strong>{es ? 'Gracias, recibimos tu opinión.' : 'Thank you, we received your feedback.'}</strong>
        {attachmentWarning ? <small>{es ? 'El reporte se guardó, pero la captura no pudo adjuntarse.' : 'The report was saved, but the screenshot could not be attached.'}</small> : null}
      </div>
    )
  }

  return (
    <section className={styles.feedback} aria-label={es ? 'Retroalimentación del piloto' : 'Pilot feedback'}>
      <div className={styles.question}>
        <span>{issueOnly ? (es ? '¿Quieres reportar este error?' : 'Would you like to report this error?') : (es ? '¿Te sirvió esta respuesta?' : 'Was this response helpful?')}</span>
        <div>
          {!issueOnly ? <button type="button" disabled={sending} onClick={() => void send('Funcionó')}>👍 {es ? 'Sí' : 'Yes'}</button> : null}
          <button type="button" disabled={sending} onClick={() => { setOpen(true); setError(null) }}>👎 {es ? 'Reportar' : 'Report'}</button>
        </div>
      </div>

      {open ? (
        <div className={styles.form}>
          <div className={styles.formHeader}>
            <div><strong>{es ? '¿Qué ocurrió?' : 'What happened?'}</strong><small>{es ? 'Tu reporte se vinculará automáticamente con esta respuesta.' : 'Your report will automatically link to this response.'}</small></div>
            <button type="button" onClick={() => setOpen(false)} aria-label={es ? 'Cerrar reporte' : 'Close report'}>×</button>
          </div>

          <div className={styles.categories}>
            {CATEGORY_OPTIONS.map(option => (
              <button
                type="button"
                key={option.value}
                className={category === option.value ? styles.selected : ''}
                onClick={() => setCategory(option.value)}
              >
                {es ? option.es : option.en}
              </button>
            ))}
          </div>

          <label className={styles.field}>
            <span>{es ? 'Cuéntanos un poco más (opcional)' : 'Tell us a little more (optional)'}</span>
            <textarea value={comment} onChange={event => setComment(event.target.value)} maxLength={1200} />
          </label>

          <div className={styles.attachment}>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" hidden onChange={event => void selectScreenshot(event.target.files?.[0])} />
            {preview ? (
              <div className={styles.preview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt={es ? 'Vista previa de la captura' : 'Screenshot preview'} />
                <button type="button" onClick={removeScreenshot}>{es ? 'Eliminar captura' : 'Remove screenshot'}</button>
              </div>
            ) : (
              <button type="button" className={styles.attachButton} onClick={() => fileRef.current?.click()}>＋ {es ? 'Adjuntar captura (opcional)' : 'Attach screenshot (optional)'}</button>
            )}
            <small>{es ? 'Revisa que no contenga información personal que no quieras compartir. JPG o PNG, máximo 5 MB.' : 'Check that it contains no personal information you do not want to share. JPG or PNG, 5 MB maximum.'}</small>
          </div>

          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <button type="button" className={styles.submit} disabled={!category || sending} onClick={() => void send('Problema')}>
            {sending ? (es ? 'Enviando…' : 'Sending…') : (es ? 'Enviar reporte' : 'Send report')}
          </button>
        </div>
      ) : null}
      {!open && error ? <p className={styles.error} role="alert">{error}</p> : null}
    </section>
  )
}
