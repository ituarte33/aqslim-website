'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function ClinicSchedulingCompatibility() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname !== '/clinic-preview') return

    function enhance() {
      const title = [...document.querySelectorAll('div')].find(el => el.textContent?.trim() === 'Registrar consulta') as HTMLDivElement | undefined
      if (!title) return

      const formCard = title.parentElement as HTMLDivElement | null
      const layout = formCard?.parentElement as HTMLDivElement | null
      if (!formCard || !layout) return

      layout.style.display = 'flex'
      layout.style.flexDirection = 'column'
      layout.style.gap = '18px'
      layout.style.alignItems = 'center'
      layout.style.width = '100%'

      formCard.style.width = 'min(760px, 100%)'
      formCard.style.maxWidth = '760px'
      formCard.style.boxSizing = 'border-box'
      formCard.style.order = '1'

      const historyCard = [...layout.children].find(child => child !== formCard) as HTMLElement | undefined
      if (historyCard) {
        historyCard.style.width = 'min(900px, 100%)'
        historyCard.style.maxWidth = '900px'
        historyCard.style.boxSizing = 'border-box'
        historyCard.style.order = '2'
      }

    }

    const observer = new MutationObserver(enhance)
    observer.observe(document.body, { childList: true, subtree: true })
    enhance()

    return () => observer.disconnect()
  }, [pathname])

  return null
}
