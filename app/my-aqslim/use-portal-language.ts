'use client'

import { useCallback, useEffect, useState } from 'react'

export type PortalLanguage = 'es' | 'en'

const STORAGE_KEY = 'myaq-language'
const LANGUAGE_EVENT = 'aqslim-lang'

function isPortalLanguage(value: unknown): value is PortalLanguage {
  return value === 'es' || value === 'en'
}

function applyDocumentLanguage(language: PortalLanguage) {
  document.body.classList.remove('marketing')
  document.body.classList.toggle('lang-es', language === 'es')
  document.body.classList.toggle('lang-en', language === 'en')
  document.documentElement.lang = language
}

export function usePortalLanguage(initialLanguage: PortalLanguage) {
  const [language, setLanguageState] = useState<PortalLanguage>(initialLanguage)

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(STORAGE_KEY)
    if (isPortalLanguage(savedLanguage)) setLanguageState(savedLanguage)

    const syncLanguage = (event: Event) => {
      const nextLanguage = (event as CustomEvent<unknown>).detail
      if (isPortalLanguage(nextLanguage)) setLanguageState(nextLanguage)
    }

    window.addEventListener(LANGUAGE_EVENT, syncLanguage)
    return () => window.removeEventListener(LANGUAGE_EVENT, syncLanguage)
  }, [])

  useEffect(() => {
    applyDocumentLanguage(language)
  }, [language])

  const setLanguage = useCallback((nextLanguage: PortalLanguage) => {
    setLanguageState(nextLanguage)
    window.localStorage.setItem(STORAGE_KEY, nextLanguage)
    applyDocumentLanguage(nextLanguage)
    window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: nextLanguage }))
  }, [])

  return [language, setLanguage] as const
}
