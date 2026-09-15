'use client'

import { useEffect } from 'react'

const ONBOARDING_PATH = '/onboarding'
const NUTRITION_PROFILE_PATH = '/my-aqslim/nutrition-profile-preview'

export function OnboardingNutritionProfileEntryCompatibility() {
  useEffect(() => {
    if (window.location.pathname !== ONBOARDING_PATH) return

    const sync = () => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>('div,span,a'))

      for (const node of nodes) {
        const text = node.textContent?.trim() ?? ''

        if (text === 'Cuestionario de síntomas') {
          node.textContent = 'Perfil de Bienestar y Alimentación'
        }

        if (text === 'Cuéntanos cómo te has sentido.') {
          node.textContent = 'Cuéntanos cómo comes y qué debemos tomar en cuenta para personalizar tu plan.'
        }

        if (text === 'Cuestionario completado.') {
          node.textContent = 'Perfil completado.'
        }
      }

      const oldLink = document.querySelector<HTMLAnchorElement>('a[href="/cuestionario"]')
      if (oldLink) {
        oldLink.href = NUTRITION_PROFILE_PATH
        oldLink.textContent = 'Completar ahora →'
        oldLink.setAttribute('aria-label', 'Completar Perfil de Bienestar y Alimentación ahora')
      }
    }

    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return null
}
