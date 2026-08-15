'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChatMessage } from './chat-message'

type BuddyState = 'idle' | 'thinking' | 'happy' | 'love' | 'warning'
type Message = { role: 'user' | 'assistant'; content: string }

const STATE_IMAGES: Record<BuddyState, string> = {
  idle:     '/Aqslim_Buddy_Pics/aqslim_buddy_open_arms.png',
  thinking: '/Aqslim_Buddy_Pics/aqslim_buddy_thinking.png',
  happy:    '/Aqslim_Buddy_Pics/aqslim_buddy_thumbs_up.png',
  love:     '/Aqslim_Buddy_Pics/aqslim_buddy_heart_eyes.png',
  warning:  '/Aqslim_Buddy_Pics/aqslim_buddy_inspecting.png',
}

const IDLE_BUBBLES = {
  es: ['¡Hola! Soy AQ Buddy 👋', '¿En qué te puedo ayudar?', '¡Tócame para chatear!', '¿Listo para cuidar tu salud? 🌿'],
  en: ["Hi! I'm AQ Buddy 👋", 'How can I help you?', 'Tap me to chat!', 'Ready to support your wellness? 🌿'],
}

const LABELS = {
  es: {
    title: 'AQ Buddy',
    subtitle: 'Tu asistente de bienestar',
    placeholder: 'Escribe tu pregunta...',
    send: 'Enviar',
    welcome: '¡Hola! Soy AQ Buddy, tu asistente de bienestar AQSLIM. ¿En qué te puedo ayudar hoy?',
    starter: 'Hola, ¿qué puedes hacer por mí?',
    thinking: 'Pensando...',
    error: 'Ocurrió un error. Intenta de nuevo.',
  },
  en: {
    title: 'AQ Buddy',
    subtitle: 'Your wellness assistant',
    placeholder: 'Type your question...',
    send: 'Send',
    welcome: "Hi! I'm AQ Buddy, your AQSLIM wellness assistant. How can I help you today?",
    starter: 'Hi, what can you help me with?',
    thinking: 'Thinking...',
    error: 'An error occurred. Please try again.',
  },
}

function getLang(): 'es' | 'en' {
  if (typeof document === 'undefined') return 'es'
  return document.body.classList.contains('lang-en') ? 'en' : 'es'
}

function detectState(text: string): BuddyState {
  const lower = text.toLowerCase()
  const warnWords = ['careful', 'cuidado', 'high in carb', 'high calorie', 'watch out', 'limit', 'avoid', 'too much', 'demasiado', 'exceso', 'high carb', 'caution', 'alto en', 'reduce', 'be careful']
  const loveWords = ['great job', 'excellent', 'amazing', 'fantastic', 'wonderful', 'proud', 'congratulat', 'well done', 'progress', 'keep it up', 'excelente', 'increíble', 'fantástico', 'orgulloso', 'felicit', 'progreso', 'sigue así', 'bravo', "you're doing", 'lo estás haciendo']
  if (warnWords.some(w => lower.includes(w))) return 'warning'
  if (loveWords.some(w => lower.includes(w))) return 'love'
  return 'happy'
}

export function ChatWidget() {
  const pathname                  = usePathname()
  const router                    = useRouter()
  const inPatientPortal           = pathname.startsWith('/my-aqslim')
  const inDashboard               = pathname.startsWith('/dashboard')
  const fullScreen                = inPatientPortal && pathname.endsWith('/buddy')
  const demo                      = pathname.startsWith('/my-aqslim/demo/')
  const [open, setOpen]           = useState(fullScreen)
  const [lang, setLang]           = useState<'es' | 'en'>('es')
  const [buddyState, setBuddyState] = useState<BuddyState>('idle')
  const [bubble, setBubble]       = useState('')
  const [talking, setTalking]     = useState(false)
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [streaming, setStreaming] = useState(false)
  const [fontSize, setFontSize]   = useState(16)

  const MIN_FONT = 13
  const MAX_FONT = 25
  function increaseFontSize() { setFontSize(prev => Math.min(MAX_FONT, prev + 3)) }
  function decreaseFontSize() { setFontSize(prev => Math.max(MIN_FONT, prev - 3)) }

  const messagesRef    = useRef<HTMLDivElement>(null)
  const latestUserRef  = useRef<HTMLDivElement>(null)
  const pendingUserScrollRef = useRef(false)
  const inputRef       = useRef<HTMLTextAreaElement>(null)
  const idleTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const buddyStateRef  = useRef<BuddyState>('idle')
  const idleBubbleIdx  = useRef(0)

  // Keep ref in sync for use in intervals/timeouts
  useEffect(() => { buddyStateRef.current = buddyState }, [buddyState])

  // Set state with auto-return to idle
  const setStateWithTimeout = useCallback((state: BuddyState, message: string, duration = 5000) => {
    setBuddyState(state)
    setBubble(message)
    if (state !== 'idle' && state !== 'thinking') {
      setTalking(true)
      setTimeout(() => setTalking(false), 1400)
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (state !== 'idle' && state !== 'thinking') {
      idleTimerRef.current = setTimeout(() => {
        setBuddyState('idle')
        setBubble('')
      }, duration)
    }
  }, [])

  // Expose global setAQBuddyState + custom event
  useEffect(() => {
    // @ts-expect-error window extension
    window.setAQBuddyState = (state: BuddyState, message: string) => setStateWithTimeout(state, message)
    function onEvent(e: Event) {
      const { state, message } = (e as CustomEvent).detail
      setStateWithTimeout(state, message)
    }
    window.addEventListener('aq-buddy', onEvent)
    return () => {
      // @ts-expect-error window extension
      delete window.setAQBuddyState
      window.removeEventListener('aq-buddy', onEvent)
    }
  }, [setStateWithTimeout])

  // Allow prominent portal actions to open the existing governed chat surface.
  useEffect(() => {
    function openChat() { setOpen(true) }
    window.addEventListener('aq-buddy-open', openChat)
    return () => window.removeEventListener('aq-buddy-open', openChat)
  }, [])

  useEffect(() => {
    if (fullScreen) setOpen(true)
  }, [fullScreen])

  // The full-screen patient chat owns the mobile viewport. Locking the page
  // underneath prevents iOS from scrolling the portal header away when the
  // text area receives focus.
  useEffect(() => {
    if (!fullScreen) return

    window.scrollTo(0, 0)
    document.body.classList.add('aqb-fullscreen-active')
    return () => document.body.classList.remove('aqb-fullscreen-active')
  }, [fullScreen])

  // Sync language with body class
  useEffect(() => {
    function sync() { setLang(getLang()) }
    sync()
    window.addEventListener('aqslim-lang', sync)
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => { window.removeEventListener('aqslim-lang', sync); observer.disconnect() }
  }, [])

  // Idle bubble rotation — only when chat is closed and buddy is idle
  useEffect(() => {
    if (open || inDashboard) { setBubble(''); return }
    function showBubble() {
      if (buddyStateRef.current !== 'idle') return
      const bubbles = IDLE_BUBBLES[lang]
      setBubble(bubbles[idleBubbleIdx.current % bubbles.length])
      idleBubbleIdx.current++
      setTimeout(() => { if (buddyStateRef.current === 'idle') setBubble('') }, 3500)
    }
    const first    = setTimeout(showBubble, 1200)
    const interval = setInterval(showBubble, 10000)
    return () => { clearTimeout(first); clearInterval(interval) }
  }, [open, lang, inDashboard])

  // Welcome message on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      const welcome = LABELS[lang].welcome
      setMessages([{ role: 'assistant', content: welcome }])
      setStateWithTimeout('love', '¡Hola! 👋', 3500)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep a new question visible while a long streamed answer grows below it.
  // Scrolling the message container directly also prevents the page-level demo
  // banner from being pushed out of view by Element.scrollIntoView().
  useEffect(() => {
    const container = messagesRef.current
    if (!container) return

    if (pendingUserScrollRef.current && latestUserRef.current) {
      const top = latestUserRef.current.offsetTop - container.offsetTop - 12
      container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
      pendingUserScrollRef.current = false
      return
    }

    if (messages.length === 1) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages.length])

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  const t = LABELS[lang]

  async function send() {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')

    const userMsg: Message = { role: 'user', content: text }
    const history = [...messages, userMsg]
    pendingUserScrollRef.current = true
    setMessages(history)
    setStreaming(true)
    setBuddyState('thinking')
    setBubble(t.thinking)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)

    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })) }),
      })

      if (!res.ok || !res.body) {
        setMessages(prev => { const n = [...prev]; n[n.length - 1] = { role: 'assistant', content: t.error }; return n })
        setStateWithTimeout('warning', t.error)
        return
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setMessages(prev => { const n = [...prev]; n[n.length - 1] = { role: 'assistant', content: full }; return n })
      }

      const finalState = detectState(full)
      const preview = full.slice(0, 70).trim() + (full.length > 70 ? '…' : '')
      setStateWithTimeout(finalState, preview, 5000)
    } catch {
      setMessages(prev => { const n = [...prev]; n[n.length - 1] = { role: 'assistant', content: t.error }; return n })
      setStateWithTimeout('warning', t.error)
    } finally {
      setStreaming(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function closeChat() {
    if (fullScreen) router.back()
    else setOpen(false)
  }

  return (
    <div className={`aqb-wrap${inPatientPortal ? ' aqb-wrap--portal' : ''}${inDashboard ? ' aqb-wrap--dashboard' : ''}${fullScreen ? ' aqb-wrap--fullscreen' : ''}${demo ? ' aqb-wrap--demo' : ''}${open ? ' aqb-wrap--open' : ''}`}>

      {/* Admin pages use a compact launcher so patient and finance controls stay clear. */}
      {inDashboard && !open ? (
        <button
          className="aqb-dashboard-launcher"
          onClick={() => setOpen(true)}
          aria-label={lang === 'es' ? 'Abrir AQ Buddy' : 'Open AQ Buddy'}
          title="AQ Buddy"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5.4 17.2 4 21l4.2-1.7c1.1.5 2.4.7 3.8.7 4.9 0 8.8-3.6 8.8-8s-3.9-8-8.8-8-8.8 3.6-8.8 8c0 2 .8 3.8 2.2 5.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx="8.5" cy="12" r="1" fill="currentColor" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
            <circle cx="15.5" cy="12" r="1" fill="currentColor" />
          </svg>
        </button>
      ) : (
        <>
          {!open && !fullScreen ? (
            <button
              className="aqb-mobile-launcher"
              onClick={() => setOpen(true)}
              aria-label={lang === 'es' ? 'Abrir AQ Buddy' : 'Open AQ Buddy'}
              title="AQ Buddy"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5.4 17.2 4 21l4.2-1.7c1.1.5 2.4.7 3.8.7 4.9 0 8.8-3.6 8.8-8s-3.9-8-8.8-8-8.8 3.6-8.8 8c0 2 .8 3.8 2.2 5.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <circle cx="8.5" cy="12" r="1" fill="currentColor" />
                <circle cx="12" cy="12" r="1" fill="currentColor" />
                <circle cx="15.5" cy="12" r="1" fill="currentColor" />
              </svg>
            </button>
          ) : null}
          <button
            className={`aqb-mascot${talking ? ' aqb-mascot--talking' : ''}`}
            onClick={() => fullScreen ? undefined : setOpen(v => !v)}
            aria-label={open ? 'Close AQ Buddy' : 'Open AQ Buddy'}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={STATE_IMAGES[buddyState]}
              alt="AQ Buddy"
              className="aqb-img"
            />
            {!open && (
              <div className="aqb-cta-label">
                💬 {lang === 'es' ? '¡Habla conmigo!' : 'Chat with me!'}
              </div>
            )}
          </button>
        </>
      )}

      {/* Speech bubble — only when chat is closed */}
      {bubble && !open && (
        <div className="aqb-bubble">
          <div className="aqb-bubble-text">{bubble}</div>
          <div className="aqb-bubble-tail" />
        </div>
      )}

      {/* Chat panel — opens below mascot */}
      {open && (
        <div className="aqb-panel">
          <div className="aqb-panel-header">
            <div className="aqb-panel-identity">
              {fullScreen ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={STATE_IMAGES[buddyState]} alt="AQ Buddy" className="aqb-header-avatar" />
              ) : null}
              <div>
                <div className="aqb-panel-title">{t.title}</div>
                <div className="aqb-panel-subtitle">{t.subtitle}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                className="aqb-font-btn"
                onClick={decreaseFontSize}
                disabled={fontSize <= MIN_FONT}
                aria-label="Decrease font size"
              >
                A−
              </button>
              <button
                className="aqb-font-btn"
                onClick={increaseFontSize}
                disabled={fontSize >= MAX_FONT}
                aria-label="Increase font size"
              >
                A+
              </button>
              <button className="aqb-panel-close" onClick={closeChat} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          <div ref={messagesRef} className="aqb-messages">
            {messages.map((m, i) => (
              <div
                key={i}
                ref={m.role === 'user' ? latestUserRef : undefined}
                className={`aqb-msg-row ${m.role}`}
              >
                <div className={`aqb-msg ${m.role}`} style={{ fontSize }}>
                  {m.content
                    ? m.role === 'assistant' ? <ChatMessage content={m.content} /> : m.content
                    : (streaming && i === messages.length - 1)
                      ? <><span className="aqb-dot" /><span className="aqb-dot" /><span className="aqb-dot" /></>
                      : null}
                </div>
              </div>
            ))}
            {messages.length === 1 && !streaming ? (
              <button
                type="button"
                className="aqb-starter"
                onClick={() => {
                  setInput(t.starter)
                  inputRef.current?.focus()
                }}
              >
                {t.starter}
              </button>
            ) : null}
          </div>

          <div className="aqb-input-row">
            <textarea
              ref={inputRef}
              className="aqb-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t.placeholder}
              rows={1}
              disabled={streaming}
              style={{ fontSize }}
            />
            <button className="aqb-send" onClick={send} disabled={!input.trim() || streaming} aria-label={t.send}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 9h14M9 2l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
