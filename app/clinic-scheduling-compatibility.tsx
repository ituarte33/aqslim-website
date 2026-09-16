'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function suggestedDate(baseDate: string, days: number) {
  const base = baseDate ? new Date(`${baseDate}T12:00:00`) : new Date()
  base.setDate(base.getDate() + days)
  const now = new Date()
  const hour = now.getHours()
  const minute = Math.round(now.getMinutes() / 5) * 5
  const normalizedHour = minute === 60 ? (hour + 1) % 24 : hour
  const normalizedMinute = minute === 60 ? 0 : minute
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(normalizedHour)}:${pad(normalizedMinute)}`
}

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
  descriptor?.set?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

export function ClinicSchedulingCompatibility() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname !== '/clinic-preview') return

    let userEditedNextAppointment = false
    let lastPatientHeader = ''

    function enhance() {
      const title = [...document.querySelectorAll('div')].find(el => el.textContent?.trim() === 'Registrar consulta') as HTMLDivElement | undefined
      if (!title) return

      const formCard = title.parentElement as HTMLDivElement | null
      const layout = formCard?.parentElement as HTMLDivElement | null
      if (!formCard || !layout) return

      // Make the consultation task the visual center of the workspace.
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

      const consultationDate = formCard.querySelector('input[type="date"]') as HTMLInputElement | null
      const nextInput = formCard.querySelector('input[type="datetime-local"]') as HTMLInputElement | null
      if (!nextInput || !consultationDate) return

      const expedienteHeading = [...document.querySelectorAll('h2')].find(el => {
        const text = el.textContent?.trim() ?? ''
        return text && text !== 'Selecciona un paciente'
      })?.textContent?.trim() ?? ''

      if (expedienteHeading && expedienteHeading !== lastPatientHeader) {
        lastPatientHeader = expedienteHeading
        userEditedNextAppointment = false
      }

      if (!nextInput.dataset.clinicCadenceBound) {
        nextInput.dataset.clinicCadenceBound = 'true'
        nextInput.addEventListener('input', () => {
          if (nextInput.dataset.programmaticChange !== 'true') userEditedNextAppointment = true
        })
      }

      if (!nextInput.value && !userEditedNextAppointment) {
        nextInput.dataset.programmaticChange = 'true'
        setNativeInputValue(nextInput, suggestedDate(consultationDate.value, 7))
        nextInput.dataset.programmaticChange = 'false'
      }

      if (!formCard.querySelector('[data-clinic-cadence-controls]')) {
        const panel = document.createElement('div')
        panel.dataset.clinicCadenceControls = 'true'
        panel.style.marginTop = '10px'
        panel.style.padding = '12px'
        panel.style.border = '1px solid rgba(201,168,76,.20)'
        panel.style.borderRadius = '9px'
        panel.style.background = 'rgba(201,168,76,.04)'

        const caption = document.createElement('div')
        caption.textContent = 'Fecha preliminar · presencial estándar: 7 días'
        caption.style.fontSize = '11px'
        caption.style.color = '#9A9590'
        caption.style.marginBottom = '8px'
        panel.appendChild(caption)

        const buttons = document.createElement('div')
        buttons.style.display = 'flex'
        buttons.style.gap = '8px'
        buttons.style.flexWrap = 'wrap'

        ;[
          { label: '+ 7 días', days: 7 },
          { label: '+ 10 días', days: 10 },
          { label: '+ 14 días', days: 14 },
        ].forEach(option => {
          const button = document.createElement('button')
          button.type = 'button'
          button.textContent = option.label
          button.style.padding = '8px 11px'
          button.style.borderRadius = '8px'
          button.style.border = '1px solid rgba(201,168,76,.35)'
          button.style.background = 'rgba(201,168,76,.08)'
          button.style.color = '#E2C87A'
          button.style.cursor = 'pointer'
          button.style.fontSize = '11px'
          button.addEventListener('click', () => {
            userEditedNextAppointment = true
            nextInput.dataset.programmaticChange = 'true'
            setNativeInputValue(nextInput, suggestedDate(consultationDate.value, option.days))
            nextInput.dataset.programmaticChange = 'false'
            caption.textContent = `Fecha preliminar seleccionada: ${option.days} días · puedes cambiarla manualmente`
          })
          buttons.appendChild(button)
        })

        panel.appendChild(buttons)
        const note = document.createElement('div')
        note.textContent = 'Cuando el paciente tenga una cadencia definida por paquete Kenkho, esa frecuencia tendrá prioridad sobre esta sugerencia.'
        note.style.fontSize = '10px'
        note.style.color = '#6F6A64'
        note.style.lineHeight = '1.5'
        note.style.marginTop = '8px'
        panel.appendChild(note)

        nextInput.insertAdjacentElement('afterend', panel)
      }
    }

    const observer = new MutationObserver(enhance)
    observer.observe(document.body, { childList: true, subtree: true })
    enhance()

    return () => observer.disconnect()
  }, [pathname])

  return null
}
