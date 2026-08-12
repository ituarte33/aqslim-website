'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const LANG_KEY = 'aqslim-lang'

export function LanguageModal() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(LANG_KEY)) {
      setVisible(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimateIn(true)))
    }
  }, [])

  function pick(lang: 'es' | 'en') {
    localStorage.setItem(LANG_KEY, lang)
    document.body.classList.remove('lang-es', 'lang-en')
    document.body.classList.add('lang-' + lang)
    document.documentElement.lang = lang
    window.dispatchEvent(new CustomEvent('aqslim-lang', { detail: lang }))
    setAnimateIn(false)
    setTimeout(() => setVisible(false), 300)
  }

  if (!visible || pathname.startsWith('/my-aqslim')) return null

  return (
    <div
      className="lang-modal-overlay"
      style={{ opacity: animateIn ? 1 : 0, transition: 'opacity 0.3s ease' }}
    >
      <div
        className="lang-modal-card"
        style={{ transform: animateIn ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)', transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div className="lang-modal-logo">
          AQ<span>SLIM</span>
        </div>
        <div className="lang-modal-divider" />
        <p className="lang-modal-tagline">
          Wellness Center · El Cajon, CA
        </p>
        <p className="lang-modal-prompt">
          <span className="lang-modal-es">Selecciona tu idioma preferido</span>
          <span className="lang-modal-sep"> · </span>
          <span className="lang-modal-en">Select your preferred language</span>
        </p>
        <div className="lang-modal-btns">
          <button className="lang-modal-btn lang-modal-btn--primary" onClick={() => pick('es')}>
            ESPAÑOL
          </button>
          <button className="lang-modal-btn lang-modal-btn--secondary" onClick={() => pick('en')}>
            ENGLISH
          </button>
        </div>
      </div>
    </div>
  )
}
