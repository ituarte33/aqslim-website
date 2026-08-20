'use client'

import { useCallback, useEffect, useState } from 'react'

export type PortalLanguage = 'es' | 'en'

const STORAGE_KEY = 'myaq-language'
const LANGUAGE_EVENT = 'aqslim-lang'

export function isPortalLanguage(value: unknown): value is PortalLanguage {
  return value === 'es' || value === 'en'
}

export function portalLanguageStorageKey(scopeId?: string): string {
  const scope = scopeId?.trim()
  return scope ? `${STORAGE_KEY}:${scope}` : STORAGE_KEY
}

function applyDocumentLanguage(language: PortalLanguage) {
  document.body.classList.remove('marketing')
  document.body.classList.toggle('lang-es', language === 'es')
  document.body.classList.toggle('lang-en', language === 'en')
  document.documentElement.lang = language
}

export function usePortalLanguage(initialLanguage: PortalLanguage, scopeId?: string) {
  const [language, setLanguageState] = useState<PortalLanguage>(initialLanguage)
  const storageKey = portalLanguageStorageKey(scopeId)

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(storageKey)
    setLanguageState(isPortalLanguage(savedLanguage) ? savedLanguage : initialLanguage)

    const syncLanguage = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      if (isPortalLanguage(detail) && !scopeId) {
        setLanguageState(detail)
        return
      }
      if (!detail || typeof detail !== 'object') return
      const next = detail as { language?: unknown; scopeId?: unknown }
      if (next.scopeId === scopeId && isPortalLanguage(next.language)) {
        setLanguageState(next.language)
      }
    }

    window.addEventListener(LANGUAGE_EVENT, syncLanguage)
    return () => window.removeEventListener(LANGUAGE_EVENT, syncLanguage)
  }, [initialLanguage, scopeId, storageKey])

  useEffect(() => {
    applyDocumentLanguage(language)
  }, [language])

  const setLanguage = useCallback((nextLanguage: PortalLanguage) => {
    setLanguageState(nextLanguage)
    window.localStorage.setItem(storageKey, nextLanguage)
    applyDocumentLanguage(nextLanguage)
    window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, {
      detail: scopeId ? { language: nextLanguage, scopeId } : nextLanguage,
    }))
  }, [scopeId, storageKey])

  return [language, setLanguage] as const
}
