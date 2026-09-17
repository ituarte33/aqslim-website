'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

type PrepareDetail = {
  livePlan?: Record<string, unknown> | null
  phase?: string
  phaseWeek?: number | null
}

export function ClinicPlanPreparePersistence() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname !== '/clinic-preview') return

    const handle = async (event: Event) => {
      const detail = (event as CustomEvent<PrepareDetail>).detail
      if (!detail?.livePlan) return

      const heading = [...document.querySelectorAll('h2')].find(el => {
        const text = el.textContent?.trim() ?? ''
        return text && text !== 'Selecciona un paciente'
      })
      if (!heading) return

      const patientName = heading.textContent?.trim() ?? ''
      const cardText = heading.parentElement?.textContent ?? ''
      const patientEmail = cardText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? ''
      const patientPhone = cardText.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/)?.[0] ?? ''
      if (!patientName) return

      try {
        const params = new URLSearchParams({ patientName })
        if (patientEmail) params.set('patientEmail', patientEmail)
        if (patientPhone) params.set('patientPhone', patientPhone)

        const lookup = await fetch(`/api/preview/clinic-plans?${params}`, { cache: 'no-store' })
        const lookupData = await lookup.json()
        if (!lookup.ok || !lookupData.ok || !lookupData.patient?.id) return

        const base = lookupData.draft ?? detail.livePlan
        const prepared = {
          ...base,
          patientId: String(lookupData.patient.id),
          status: 'Draft',
          phase: detail.phase && detail.phase !== 'Sin fase' ? detail.phase : (base.phase || 'Sin fase'),
          phaseWeek: detail.phaseWeek && detail.phaseWeek > 0 ? detail.phaseWeek : (base.phaseWeek ?? null),
        }

        const response = await fetch('/api/preview/clinic-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prepared),
        })
        const data = await response.json()
        if (!response.ok || !data.ok) return

        window.dispatchEvent(new CustomEvent('clinic-plan-prepared-persisted', {
          detail: { draft: data.draft },
        }))
      } catch {
        // Fail closed: visual helper still works; no production write occurs.
      }
    }

    window.addEventListener('clinic-plan-prepare-update', handle as EventListener)
    return () => window.removeEventListener('clinic-plan-prepare-update', handle as EventListener)
  }, [pathname])

  return null
}
