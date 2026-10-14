'use client'

import { useEffect } from 'react'

const PREVIEW_PATH = '/my-aqslim/nutrition-profile-preview'

type Profile = Record<string, unknown>

function setValue(name: string, value: unknown) {
  const control = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${name}"]`)
  if (!control || value === null || value === undefined) return

  if (control instanceof HTMLInputElement && control.type === 'checkbox') {
    const next = value === true
    if (control.checked !== next) control.click()
    return
  }

  control.value = String(value)
  control.dispatchEvent(new Event('input', { bubbles: true }))
  control.dispatchEvent(new Event('change', { bubbles: true }))
}

function setMulti(name: string, values: unknown) {
  const wanted = new Set(Array.isArray(values) ? values.map(String) : [])
  const controls = Array.from(document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`))
  for (const control of controls) {
    const shouldBeChecked = wanted.has(control.value)
    if (control.checked !== shouldBeChecked) control.click()
  }
}

function fillOtherFields(profile: Profile) {
  setValue('otherHealthCondition', profile.otherHealthCondition)
  setValue('otherProtein', profile.otherProtein)
  setValue('otherCarb', profile.otherCarb)
  setValue('otherCraving', profile.otherCraving)
  setValue('otherDrink', profile.otherDrink)
  setValue('otherGoal', profile.otherGoal)
}

function populate(profile: Profile) {
  setMulti('healthConstraints', profile.healthConstraints)
  setValue('allergies', profile.allergies)
  setValue('medications', profile.medications)
  setValue('medicationUncertain', profile.medicationUncertain)
  setValue('mealsPerDay', profile.mealsPerDay)
  setValue('breakfast', profile.breakfast)
  setValue('firstMealTime', profile.firstMealTime)
  setValue('secondMealTime', profile.secondMealTime)
  setValue('lastMealTime', profile.lastMealTime)
  setValue('eatingPattern', profile.eatingPattern)
  setMulti('proteins', profile.proteins)
  setValue('vegetables', profile.vegetables)
  setMulti('carbs', profile.carbs)
  setValue('favoriteDish', profile.favoriteDish)
  setValue('dislikedFoods', profile.dislikedFoods)
  setValue('hardestFood', profile.hardestFood)
  setValue('craving', profile.craving)
  setMulti('drinks', profile.drinks)
  setValue('mealPreparer', profile.mealPreparer)
  setValue('cookingTime', profile.cookingTime)
  setValue('restaurantFrequency', profile.restaurantFrequency)
  setValue('restaurantTypes', profile.restaurantTypes)
  setValue('mealStructure', profile.mealStructure)
  setValue('planStyle', profile.planStyle)
  setMulti('goals', profile.goals)
  setValue('notes', profile.notes)
  window.setTimeout(() => fillOtherFields(profile), 80)
}

function bodyFromForm(form: HTMLFormElement) {
  const data = new FormData(form)
  return {
    language: document.documentElement.lang === 'en' ? 'English' : 'Español',
    healthConstraints: data.getAll('healthConstraints'),
    otherHealthCondition: data.get('otherHealthCondition'),
    allergies: data.get('allergies'),
    medications: data.get('medications'),
    medicationUncertain: data.get('medicationUncertain') === 'on',
    mealsPerDay: data.get('mealsPerDay'),
    breakfast: data.get('breakfast'),
    firstMealTime: data.get('firstMealTime'),
    secondMealTime: data.get('secondMealTime'),
    lastMealTime: data.get('lastMealTime'),
    eatingPattern: data.get('eatingPattern'),
    proteins: data.getAll('proteins'),
    otherProtein: data.get('otherProtein'),
    vegetables: data.get('vegetables'),
    carbs: data.getAll('carbs'),
    otherCarb: data.get('otherCarb'),
    favoriteDish: data.get('favoriteDish'),
    dislikedFoods: data.get('dislikedFoods'),
    hardestFood: data.get('hardestFood'),
    craving: data.get('craving'),
    otherCraving: data.get('otherCraving'),
    drinks: data.getAll('drinks'),
    otherDrink: data.get('otherDrink'),
    mealPreparer: data.get('mealPreparer'),
    cookingTime: data.get('cookingTime'),
    restaurantFrequency: data.get('restaurantFrequency'),
    restaurantTypes: data.get('restaurantTypes'),
    mealStructure: data.get('mealStructure'),
    planStyle: data.get('planStyle'),
    goals: data.getAll('goals').slice(0, 2),
    otherGoal: data.get('otherGoal'),
    notes: data.get('notes'),
  }
}

function statusNode(form: HTMLFormElement) {
  let node = document.querySelector<HTMLElement>('[data-nutrition-persistence-status]')
  if (node) return node
  node = document.createElement('div')
  node.dataset.nutritionPersistenceStatus = 'true'
  node.style.margin = '0 0 16px'
  node.style.padding = '12px 14px'
  node.style.border = '1px solid rgba(212, 167, 44, .34)'
  node.style.borderRadius = '10px'
  node.style.background = 'rgba(212, 167, 44, .06)'
  node.style.color = '#f2cf6a'
  node.style.fontSize = '12px'
  node.style.display = 'none'
  form.insertAdjacentElement('beforebegin', node)
  return node
}

function updatePreviewCopy() {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('div,small'))
  for (const element of candidates) {
    const text = element.textContent?.trim() ?? ''
    if (text.startsWith('Vista Preview: por ahora estas respuestas se guardan sólo en este dispositivo')) {
      element.textContent = 'Vista Preview: estas respuestas se guardan de forma controlada en tu perfil Preview. Todavía no alimentan AQ Buddy ni cambian tu plan.'
    }
    if (text.startsWith('Preview: for now these answers are stored only on this device')) {
      element.textContent = 'Preview: these answers are stored in your controlled Preview profile. They do not feed AQ Buddy or change your plan yet.'
    }
    if (text === '✓ Perfil de prueba guardado en este dispositivo.') {
      element.textContent = 'Borrador local detectado. Pulsa Guardar para confirmarlo en tu perfil Preview.'
    }
    if (text === '✓ Test profile saved on this device.') {
      element.textContent = 'Local draft detected. Press Save to confirm it in your Preview profile.'
    }
    if (text === 'Preview local · todavía no cambia tu plan.') {
      element.textContent = 'Preview · guardado controlado · todavía no cambia tu plan.'
    }
    if (text === 'Local Preview · does not change your plan yet.') {
      element.textContent = 'Preview · controlled storage · does not change your plan yet.'
    }
  }
}

export function NutritionProfilePersistenceCompatibility() {
  useEffect(() => {
    if (window.location.pathname !== PREVIEW_PATH) return

    let disposed = false
    let form: HTMLFormElement | null = null
    let saving = false

    const setup = async () => {
      form = document.querySelector<HTMLFormElement>('form')
      if (!form || disposed) return
      updatePreviewCopy()
      const status = statusNode(form)

      try {
        const response = await fetch('/api/preview/nutrition-profile', { cache: 'no-store' })
        if (response.ok) {
          const result = await response.json()
          if (result.profile) {
            populate(result.profile)
            status.style.display = 'block'
            status.textContent = document.documentElement.lang === 'en'
              ? '✓ Your saved Preview profile was loaded from controlled storage.'
              : '✓ Cargamos tu perfil Preview desde el guardado controlado.'
          }
        }
      } catch {
        // Keep the form usable; saving will surface any provider error.
      }
    }

    const submitHandler = async (event: Event) => {
      if (window.location.pathname !== PREVIEW_PATH) return
      const target = event.target
      if (!(target instanceof HTMLFormElement)) return
      const currentForm = target
      if (saving) return

      // Window capture runs before React's delegated submit handler, so the old
      // local-only handler cannot consume the event first.
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      saving = true
      form = currentForm

      const status = statusNode(currentForm)
      const button = currentForm.querySelector<HTMLButtonElement>('button[type="submit"]')
      const originalText = button?.textContent ?? ''
      if (button) {
        button.disabled = true
        button.textContent = document.documentElement.lang === 'en' ? 'Saving…' : 'Guardando…'
      }
      status.style.display = 'block'
      status.textContent = document.documentElement.lang === 'en'
        ? 'Saving your Preview profile…'
        : 'Guardando tu perfil Preview…'

      try {
        const response = await fetch('/api/preview/nutrition-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyFromForm(currentForm)),
        })
        if (!response.ok) throw new Error('save_failed')
        const result = await response.json()
        status.textContent = document.documentElement.lang === 'en'
          ? '✓ Preview profile saved in controlled storage. You can close this page and return later.'
          : '✓ Perfil Preview guardado en almacenamiento controlado. Puedes cerrar esta página y regresar después.'
        status.dataset.savedAt = result.updatedAt ?? ''
        window.scrollTo({ top: status.offsetTop - 110, behavior: 'smooth' })
      } catch {
        status.textContent = document.documentElement.lang === 'en'
          ? 'We could not save your Preview profile. Please try again.'
          : 'No pudimos guardar tu perfil Preview. Intenta nuevamente.'
      } finally {
        saving = false
        if (button) {
          button.disabled = false
          button.textContent = originalText || (document.documentElement.lang === 'en' ? 'Save Preview profile' : 'Guardar perfil Preview')
        }
      }
    }

    // Register on window in capture phase so this runs before React's root listener.
    window.addEventListener('submit', submitHandler, true)
    const timer = window.setTimeout(setup, 0)
    const copyObserver = new MutationObserver(updatePreviewCopy)
    copyObserver.observe(document.body, { childList: true, subtree: true })

    return () => {
      disposed = true
      window.clearTimeout(timer)
      copyObserver.disconnect()
      window.removeEventListener('submit', submitHandler, true)
    }
  }, [])

  return null
}
