'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

function setNativeValue(element: HTMLInputElement | HTMLSelectElement, value: string) {
  const proto = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value')
  descriptor?.set?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

function findDraftControl(label: string) {
  const labelNode = [...document.querySelectorAll('div')].find(el => el.textContent?.trim() === label)
  const parent = labelNode?.parentElement
  if (!parent) return null
  return parent.querySelector('input,select') as HTMLInputElement | HTMLSelectElement | null
}

export function ClinicPlanConsultationSyncCompatibility() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname !== '/clinic-preview') return

    let cleanupAlert: (() => void) | null = null
    let requestToken = 0

    const removeAlert = () => {
      document.querySelector('[data-plan-consultation-discrepancy]')?.remove()
      cleanupAlert?.()
      cleanupAlert = null
    }

    const inspect = async () => {
      const planHost = document.querySelector('[data-clinic-plan-host]') as HTMLElement | null
      if (!planHost || !planHost.textContent?.includes('Borrador Clinic')) {
        removeAlert()
        return
      }

      const heading = [...document.querySelectorAll('h2')].find(el => {
        const text = el.textContent?.trim() ?? ''
        return text && text !== 'Selecciona un paciente'
      })
      if (!heading) return

      const name = heading.textContent?.trim() ?? ''
      const cardText = heading.parentElement?.textContent ?? ''
      const email = cardText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? ''
      const phone = cardText.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/)?.[0] ?? ''
      if (!name) return

      const token = ++requestToken
      const params = new URLSearchParams({ patientName: name })
      if (email) params.set('patientEmail', email)
      if (phone) params.set('patientPhone', phone)

      try {
        const planResponse = await fetch(`/api/preview/clinic-plans?${params}`, { cache: 'no-store' })
        const planData = await planResponse.json()
        if (token !== requestToken || !planResponse.ok || !planData.ok || !planData.patient?.id) return

        const patientId = String(planData.patient.id)
        const consultResponse = await fetch(`/api/preview/clinic-consultations?patientId=${encodeURIComponent(patientId)}`, { cache: 'no-store' })
        const consultData = await consultResponse.json()
        if (token !== requestToken || !consultResponse.ok || !consultData.ok) return

        const latest = Array.isArray(consultData.consultations) ? consultData.consultations[0] : null
        const live = planData.livePlan ?? null
        if (!latest || !live) {
          removeAlert()
          return
        }

        const consultPhase = String(latest.phase ?? '').trim()
        const livePhase = String(live.phase ?? '').trim()
        const consultWeek = latest.phaseWeek === null || latest.phaseWeek === undefined ? null : Number(latest.phaseWeek)
        const liveWeek = live.phaseWeek === null || live.phaseWeek === undefined ? null : Number(live.phaseWeek)
        const phaseDiffers = Boolean(consultPhase && consultPhase !== 'Sin fase' && consultPhase !== livePhase)
        const weekDiffers = consultWeek !== null && consultWeek > 0 && consultWeek !== liveWeek

        if (!phaseDiffers && !weekDiffers) {
          removeAlert()
          return
        }

        if (document.querySelector('[data-plan-consultation-discrepancy]')) return

        const alert = document.createElement('div')
        alert.dataset.planConsultationDiscrepancy = 'true'
        alert.style.border = '1px solid rgba(226,200,122,.45)'
        alert.style.background = 'rgba(201,168,76,.08)'
        alert.style.borderRadius = '12px'
        alert.style.padding = '14px 16px'
        alert.style.marginBottom = '16px'
        alert.style.color = '#D9D5CF'

        const title = document.createElement('div')
        title.textContent = 'Consulta y plan no coinciden'
        title.style.color = '#E2C87A'
        title.style.fontSize = '12px'
        title.style.fontWeight = '600'
        title.style.marginBottom = '6px'
        alert.appendChild(title)

        const detail = document.createElement('div')
        detail.style.fontSize = '12px'
        detail.style.lineHeight = '1.55'
        detail.textContent = `Última consulta: ${consultPhase || 'sin fase'}${consultWeek ? ` · semana ${consultWeek}` : ''}. Plan publicado: ${livePhase || 'sin fase'}${liveWeek ? ` · semana ${liveWeek}` : ''}. El plan no cambiará automáticamente.`
        alert.appendChild(detail)

        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = 'Preparar actualización del borrador →'
        button.style.marginTop = '10px'
        button.style.padding = '9px 12px'
        button.style.borderRadius = '8px'
        button.style.border = '1px solid rgba(201,168,76,.45)'
        button.style.background = '#C9A84C'
        button.style.color = '#0A0A0A'
        button.style.fontWeight = '600'
        button.style.cursor = 'pointer'

        const apply = () => {
          const phaseControl = findDraftControl('Fase')
          const weekControl = findDraftControl('Semana en fase')
          if (phaseControl && consultPhase && consultPhase !== 'Sin fase') setNativeValue(phaseControl, consultPhase)
          if (weekControl && consultWeek !== null && consultWeek > 0) setNativeValue(weekControl, String(consultWeek))
          title.textContent = 'Actualización preparada en el borrador'
          detail.textContent = `Se aplicó al borrador ${consultPhase || 'la fase registrada'}${consultWeek ? ` · semana ${consultWeek}` : ''}. Revisa los demás campos y pulsa “Guardar borrador Preview”. My AQSLIM sigue sin cambios.`
          button.remove()
        }
        button.addEventListener('click', apply)
        cleanupAlert = () => button.removeEventListener('click', apply)
        alert.appendChild(button)

        const workspaceHeader = [...planHost.querySelectorAll('div')].find(el => el.textContent?.trim() === 'Plan del paciente · Preview')?.parentElement
        if (workspaceHeader) workspaceHeader.insertAdjacentElement('afterend', alert)
        else planHost.prepend(alert)
      } catch {
        // Fail closed: discrepancy helper stays silent if either source cannot be read.
      }
    }

    const observer = new MutationObserver(() => { void inspect() })
    observer.observe(document.body, { childList: true, subtree: true })
    const clickHandler = () => setTimeout(() => { void inspect() }, 50)
    document.addEventListener('click', clickHandler, true)
    void inspect()

    return () => {
      observer.disconnect()
      document.removeEventListener('click', clickHandler, true)
      removeAlert()
    }
  }, [pathname])

  return null
}
