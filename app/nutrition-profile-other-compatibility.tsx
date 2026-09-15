'use client'

import { useEffect } from 'react'

const PREVIEW_PATH = '/my-aqslim/nutrition-profile-preview'

type OtherSpec = {
  controlSelector: string
  controlValue: string
  fieldName: string
  insertAfterSelector?: string
  existingFieldSelector?: string
}

const SPECS: OtherSpec[] = [
  {
    controlSelector: 'input[name="healthConstraints"]',
    controlValue: 'Otra',
    fieldName: 'otherHealthCondition',
    existingFieldSelector: '[name="otherHealthCondition"]',
  },
  {
    controlSelector: 'input[name="proteins"]',
    controlValue: 'Otra',
    fieldName: 'otherProtein',
  },
  {
    controlSelector: 'input[name="carbs"]',
    controlValue: 'Otro',
    fieldName: 'otherCarb',
  },
  {
    controlSelector: 'select[name="craving"]',
    controlValue: 'Otro',
    fieldName: 'otherCraving',
  },
  {
    controlSelector: 'input[name="drinks"]',
    controlValue: 'Otra',
    fieldName: 'otherDrink',
  },
  {
    controlSelector: 'input[name="goals"]',
    controlValue: 'Otra',
    fieldName: 'otherGoal',
  },
]

function selected(spec: OtherSpec) {
  const controls = Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(spec.controlSelector))
  return controls.some(control => {
    if (control instanceof HTMLSelectElement) return control.value === spec.controlValue
    return control.value === spec.controlValue && control.checked
  })
}

function createField(spec: OtherSpec) {
  const wrapper = document.createElement('label')
  wrapper.dataset.nutritionOtherField = spec.fieldName
  wrapper.style.display = 'grid'
  wrapper.style.gap = '8px'
  wrapper.style.marginTop = '12px'
  wrapper.style.color = '#f5f2eb'
  wrapper.style.fontSize = '13px'

  const text = document.createElement('span')
  text.textContent = document.documentElement.lang === 'en' ? 'Which one?' : '¿Cuál?'

  const input = document.createElement('input')
  input.name = spec.fieldName
  input.type = 'text'
  input.autocomplete = 'off'
  input.placeholder = document.documentElement.lang === 'en' ? 'Please specify' : 'Especifica aquí'
  input.style.width = '100%'
  input.style.boxSizing = 'border-box'
  input.style.border = '1px solid rgba(212, 167, 44, .32)'
  input.style.borderRadius = '10px'
  input.style.padding = '12px 14px'
  input.style.background = 'rgba(255,255,255,.035)'
  input.style.color = '#f5f2eb'
  input.style.font = 'inherit'

  wrapper.append(text, input)
  return wrapper
}

function targetFor(spec: OtherSpec): HTMLElement | null {
  const controls = Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(spec.controlSelector))
  const matching = controls.find(control => control instanceof HTMLSelectElement || control.value === spec.controlValue)
  if (!matching) return null

  if (matching instanceof HTMLSelectElement) return matching.closest('label')?.parentElement ?? null
  return matching.closest('div')?.parentElement ?? matching.parentElement
}

export function NutritionProfileOtherCompatibility() {
  useEffect(() => {
    if (window.location.pathname !== PREVIEW_PATH) return

    const sync = () => {
      for (const spec of SPECS) {
        const isSelected = selected(spec)

        if (spec.existingFieldSelector) {
          const existing = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(spec.existingFieldSelector)
          const wrapper = existing?.closest('label') as HTMLElement | null
          if (wrapper) {
            wrapper.style.display = isSelected ? '' : 'none'
            if (!isSelected && existing) existing.value = ''
          }
          continue
        }

        let wrapper = document.querySelector<HTMLElement>(`[data-nutrition-other-field="${spec.fieldName}"]`)
        if (isSelected && !wrapper) {
          const target = targetFor(spec)
          if (!target) continue
          wrapper = createField(spec)
          target.insertAdjacentElement('afterend', wrapper)
        } else if (!isSelected && wrapper) {
          wrapper.remove()
        }
      }
    }

    sync()
    document.addEventListener('change', sync, true)
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      document.removeEventListener('change', sync, true)
      observer.disconnect()
    }
  }, [])

  return null
}
