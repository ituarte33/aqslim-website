'use client'

import { FormEvent, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

type Message = { role: 'user' | 'assistant'; text: string }

export function ClinicAriosLauncher() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [available, setAvailable] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hola, Rom. Soy ARIOS en modo Clinic. Puedo ayudarte con seguimiento, preparación de consultas, notas, mensajes y decisiones operativas. Por ahora no leo automáticamente el expediente seleccionado.' },
  ])

  const supported = pathname?.startsWith('/clinic-preview') || pathname?.startsWith('/dashboard')
  useEffect(() => {
    setAvailable(false)
    if (!supported) return
    const controller = new AbortController()
    fetch('/api/preview/clinic-arios', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (response.ok && (await response.json()).ok && !controller.signal.aborted) setAvailable(true)
    }).catch(() => {})
    return () => controller.abort()
  }, [supported])
  if (!supported || !available) return null

  async function send(event: FormEvent) {
    event.preventDefault()
    const message = input.trim()
    if (!message || sending) return

    setMessages(current => [...current, { role: 'user', text: message }])
    setInput('')
    setSending(true)

    try {
      const response = await fetch('/api/preview/clinic-arios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const result = await response.json()
      if (!response.ok) {
        const messages: Record<string, string> = {
          sign_in_required: 'Tu sesión terminó. Vuelve a iniciar sesión.',
          not_authorized: 'ARIOS está disponible únicamente para la cuenta de Rom.',
          provider_unavailable: 'El asistente aún no tiene conexión configurada en esta versión.',
          provider_busy: 'El proveedor está ocupado. Espera un momento y vuelve a intentar.',
          provider_failed: 'No se pudo completar la respuesta del proveedor. La configuración requiere revisión.',
        }
        setMessages(current => [...current, { role: 'assistant', text: messages[result.error] || 'La conexión no respondió. Intenta nuevamente; no se modificó ningún expediente.' }])
        return
      }
      setMessages(current => [...current, { role: 'assistant', text: result.text || 'No pude generar una respuesta.' }])
    } catch {
      setMessages(current => [...current, { role: 'assistant', text: 'No pude responder en este momento. Intenta nuevamente.' }])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {open && (
        <section
          aria-label="ARIOS Clinic"
          style={{
            position: 'fixed', right: 24, bottom: 82, zIndex: 70,
            width: 'min(420px, calc(100vw - 32px))', height: 'min(620px, calc(100vh - 130px))',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 18,
            border: '1px solid rgba(201,168,76,.4)', background: 'rgba(10,10,10,.98)',
            boxShadow: '0 24px 60px rgba(0,0,0,.55)', backdropFilter: 'blur(18px)',
            fontFamily: 'Montserrat, Arial, sans-serif', color: '#FAFAF8',
          }}
        >
          <header style={{ padding: '16px 18px', borderBottom: '1px solid rgba(201,168,76,.18)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: '#E2C87A', fontWeight: 700, letterSpacing: '.1em', fontSize: 13 }}>ARIOS · CLINIC</div>
              <div style={{ color: '#7E7872', fontSize: 11, marginTop: 3 }}>Asistente operativo</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar ARIOS" style={{ border: 0, background: 'transparent', color: '#9A9590', cursor: 'pointer', fontSize: 20 }}>×</button>
          </header>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((message, index) => (
              <div key={index} style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', padding: '11px 13px', borderRadius: 12, lineHeight: 1.55, fontSize: 13, whiteSpace: 'pre-wrap', background: message.role === 'user' ? 'rgba(201,168,76,.14)' : 'rgba(255,255,255,.05)', border: message.role === 'user' ? '1px solid rgba(201,168,76,.28)' : '1px solid rgba(255,255,255,.07)', color: message.role === 'user' ? '#F2D57E' : '#D8D4CE' }}>
                {message.text}
              </div>
            ))}
            {sending && <div style={{ color: '#7E7872', fontSize: 12 }}>ARIOS está pensando…</div>}
          </div>

          <form onSubmit={send} style={{ borderTop: '1px solid rgba(201,168,76,.18)', padding: 14, display: 'flex', gap: 8 }}>
            <textarea
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
              placeholder="Pregúntale algo a ARIOS…"
              rows={2}
              style={{ flex: 1, resize: 'none', borderRadius: 10, border: '1px solid rgba(201,168,76,.25)', background: 'rgba(255,255,255,.04)', color: '#FAFAF8', padding: '10px 12px', outline: 'none', font: 'inherit', fontSize: 13 }}
            />
            <button type="submit" disabled={sending || !input.trim()} style={{ alignSelf: 'stretch', minWidth: 72, borderRadius: 10, border: '1px solid rgba(201,168,76,.4)', background: sending || !input.trim() ? 'rgba(201,168,76,.08)' : '#C9A84C', color: sending || !input.trim() ? '#7E7872' : '#0A0A0A', cursor: sending || !input.trim() ? 'not-allowed' : 'pointer', fontWeight: 700 }}>Enviar</button>
          </form>
        </section>
      )}

      <button
        onClick={() => setOpen(value => !value)}
        aria-label="Abrir ARIOS Clinic"
        aria-expanded={open}
        style={{
          position: 'fixed', right: 24, bottom: 24, zIndex: 71,
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 999,
          border: '1px solid rgba(201,168,76,.45)', background: 'rgba(10,10,10,.94)',
          color: '#E2C87A', fontFamily: 'Montserrat, Arial, sans-serif', fontSize: 12,
          fontWeight: 700, letterSpacing: '.08em', cursor: 'pointer',
          boxShadow: '0 10px 28px rgba(0,0,0,.35)', backdropFilter: 'blur(12px)',
        }}
      >
        <span style={{ fontSize: 15 }}>◉</span>
        ARIOS
      </button>
    </>
  )
}
