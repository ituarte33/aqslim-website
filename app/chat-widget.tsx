'use client'

import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

const LABELS = {
  es: {
    title: 'Asistente AQSLIM',
    subtitle: 'Estamos aquí para ayudarte',
    placeholder: 'Escribe tu pregunta...',
    send: 'Enviar',
    welcome: '¡Hola! Soy el asistente virtual de AQSLIM. ¿En qué puedo ayudarte hoy?',
    thinking: 'Escribiendo...',
    error: 'Ocurrió un error. Intenta de nuevo.',
  },
  en: {
    title: 'AQSLIM Assistant',
    subtitle: 'We are here to help you',
    placeholder: 'Type your question...',
    send: 'Send',
    welcome: 'Hello! I\'m the AQSLIM virtual assistant. How can I help you today?',
    thinking: 'Typing...',
    error: 'An error occurred. Please try again.',
  },
}

function getLang(): 'es' | 'en' {
  if (typeof document === 'undefined') return 'es'
  return document.body.classList.contains('lang-en') ? 'en' : 'es'
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Sync language with body class
  useEffect(() => {
    function sync() { setLang(getLang()) }
    sync()
    window.addEventListener('aqslim-lang', sync)
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => { window.removeEventListener('aqslim-lang', sync); observer.disconnect() }
  }, [])

  // Init welcome message when opening for the first time
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'assistant', content: LABELS[lang].welcome }])
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  // Focus input when opening
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const t = LABELS[lang]

  async function send() {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')

    const userMsg: Message = { role: 'user', content: text }
    const history = [...messages, userMsg]
    setMessages(history)
    setStreaming(true)

    // Add empty assistant message to stream into
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok || !res.body) {
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: t.error }
          return next
        })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: full }
          return next
        })
      }
    } catch {
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: t.error }
        return next
      })
    } finally {
      setStreaming(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <div>
              <div className="chat-header-title">{t.title}</div>
              <div className="chat-header-subtitle">{t.subtitle}</div>
            </div>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble-row ${m.role}`}>
                <div className={`chat-bubble ${m.role}`}>
                  {m.content}
                  {streaming && i === messages.length - 1 && m.role === 'assistant' && !m.content && (
                    <span className="chat-cursor" />
                  )}
                </div>
              </div>
            ))}
            {streaming && messages[messages.length - 1]?.content === '' && (
              <div className="chat-bubble-row assistant">
                <div className="chat-bubble assistant chat-thinking">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-row">
            <textarea
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t.placeholder}
              rows={1}
              disabled={streaming}
            />
            <button
              className="chat-send"
              onClick={send}
              disabled={!input.trim() || streaming}
              aria-label={t.send}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 9h14M9 2l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        className={`chat-fab ${open ? 'chat-fab--open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M3 3l16 16M19 3L3 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M4 4h14a2 2 0 012 2v8a2 2 0 01-2 2H7l-4 3V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
    </>
  )
}
