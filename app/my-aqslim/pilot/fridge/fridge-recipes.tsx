'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { FridgeDetectionResult, FridgeRecipeGenerationResult } from '@/lib/fridge-recipes'
import { ingredientTextToList } from '@/lib/fridge-recipes'
import { PilotFeedback } from '@/app/pilot-feedback'
import styles from './fridge.module.css'

type PhotoInput = {
  id: string
  imageBase64: string
  mimeType: 'image/jpeg'
  previewUrl: string
}

type DetectionResponse = FridgeDetectionResult & {
  typedIngredients: string[]
  suggestedIngredients: string[]
}

type RecipeResponse = FridgeRecipeGenerationResult & {
  phase: string | null
  phaseConfirmed: boolean
}

const MAX_IMAGE_EDGE = 1800
const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_PHOTOS = 3

async function optimizeImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('Canvas unavailable')
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', .82).split(',')[1]
}

const ERROR_COPY = {
  es: {
    invalid_images: 'Usa de una a tres fotos JPG, PNG o WEBP de máximo 10 MB cada una.',
    detection_incomplete: 'AQ Buddy recibió las fotos, pero la identificación quedó incompleta. Se intentó dos veces; prueba acercándote a los alimentos principales.',
    ingredients_required: 'Confirma al menos un ingrediente antes de crear las recetas.',
    recipes_incomplete: 'AQ Buddy identificó los ingredientes, pero las recetas llegaron incompletas. Se intentó nuevamente de forma automática; vuelve a probar.',
    provider_unavailable: 'El servicio de AQ Buddy no está disponible en este momento. Tus fotos no se registraron como comidas; inténtalo nuevamente en unos minutos.',
    default: 'No pudimos completar este paso. Inténtalo nuevamente.',
  },
  en: {
    invalid_images: 'Use one to three JPG, PNG, or WEBP photos up to 10 MB each.',
    detection_incomplete: 'AQ Buddy received the photos, but identification was incomplete. It tried twice; move closer to the main foods and try again.',
    ingredients_required: 'Confirm at least one ingredient before creating recipes.',
    recipes_incomplete: 'AQ Buddy identified the ingredients, but the recipes were incomplete. It retried automatically; please try again.',
    provider_unavailable: 'AQ Buddy is currently unavailable. Your photos were not logged as meals; try again in a few minutes.',
    default: 'We could not complete this step. Please try again.',
  },
} as const

function errorMessage(errorCode: unknown, es: boolean): string {
  const copy = es ? ERROR_COPY.es : ERROR_COPY.en
  return typeof errorCode === 'string' && errorCode in copy
    ? copy[errorCode as keyof typeof copy]
    : copy.default
}

export function FridgeRecipes({
  language,
  phase,
  patientName,
}: {
  language: 'es' | 'en'
  phase: string | null
  patientName: string
}) {
  const es = language === 'es'
  const fileRef = useRef<HTMLInputElement>(null)
  const previewUrlsRef = useRef<string[]>([])
  const [photos, setPhotos] = useState<PhotoInput[]>([])
  const [additionalIngredients, setAdditionalIngredients] = useState('')
  const [exclusions, setExclusions] = useState('')
  const [ingredientsText, setIngredientsText] = useState('')
  const [servings, setServings] = useState(2)
  const [detecting, setDetecting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detection, setDetection] = useState<DetectionResponse | null>(null)
  const [result, setResult] = useState<RecipeResponse | null>(null)
  const [feedbackTarget, setFeedbackTarget] = useState<{ id: string; context: unknown } | null>(null)

  useEffect(() => () => {
    previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
  }, [])

  const invalidateDetection = useCallback(() => {
    setDetection(null)
    setIngredientsText('')
    setResult(null)
    setFeedbackTarget(null)
    setError(null)
  }, [])

  const loadFiles = useCallback(async (files?: FileList | null) => {
    if (!files?.length) return
    const availableSlots = MAX_PHOTOS - photos.length
    const selected = Array.from(files).slice(0, availableSlots)
    if (!selected.length) return
    if (selected.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_FILE_SIZE)) {
      setError(ERROR_COPY[es ? 'es' : 'en'].invalid_images)
      return
    }
    try {
      const prepared = await Promise.all(selected.map(async file => {
        const previewUrl = URL.createObjectURL(file)
        previewUrlsRef.current.push(previewUrl)
        return {
          id: crypto.randomUUID(),
          imageBase64: await optimizeImage(file),
          mimeType: 'image/jpeg' as const,
          previewUrl,
        }
      }))
      setPhotos(current => [...current, ...prepared].slice(0, MAX_PHOTOS))
      invalidateDetection()
    } catch {
      setError(es ? 'No pudimos preparar una de las imágenes.' : 'We could not prepare one of the images.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [es, invalidateDetection, photos.length])

  function removePhoto(id: string) {
    setPhotos(current => {
      const removed = current.find(photo => photo.id === id)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return current.filter(photo => photo.id !== id)
    })
    invalidateDetection()
  }

  async function detectIngredients() {
    if (!photos.length || detecting) return
    setDetecting(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch('/api/fridge-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'detect',
          images: photos.map(({ imageBase64, mimeType }) => ({ imageBase64, mimeType })),
          additionalIngredients,
          language,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        const errorCode = data.error || 'detection_failed'
        setError(errorMessage(errorCode, es))
        setFeedbackTarget({
          id: crypto.randomUUID(),
          context: { step: 'detection', errorCode, correlationId: data.correlationId ?? null },
        })
        return
      }
      const nextDetection = data as DetectionResponse
      setDetection(nextDetection)
      setIngredientsText(nextDetection.suggestedIngredients.join(', '))
    } catch {
      const errorCode = 'network_error'
      setError(errorMessage(errorCode, es))
      setFeedbackTarget({ id: crypto.randomUUID(), context: { step: 'detection', errorCode } })
    } finally {
      setDetecting(false)
    }
  }

  async function createRecipes() {
    if (generating) return
    const ingredients = ingredientTextToList(ingredientsText)
    if (!ingredients.length) {
      setError(ERROR_COPY[es ? 'es' : 'en'].ingredients_required)
      return
    }
    setGenerating(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch('/api/fridge-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', ingredients, exclusions, servings, language }),
      })
      const data = await response.json()
      if (!response.ok) {
        const errorCode = data.error || 'generation_failed'
        setError(errorMessage(errorCode, es))
        setFeedbackTarget({
          id: crypto.randomUUID(),
          context: { step: 'generation', confirmedIngredients: ingredients, exclusions, errorCode, correlationId: data.correlationId ?? null },
        })
        return
      }
      setResult(data as RecipeResponse)
      setFeedbackTarget({
        id: crypto.randomUUID(),
        context: { step: 'generation', confirmedIngredients: ingredients, exclusions, result: data },
      })
    } catch {
      const errorCode = 'network_error'
      setError(errorMessage(errorCode, es))
      setFeedbackTarget({
        id: crypto.randomUUID(),
        context: { step: 'generation', confirmedIngredients: ingredients, exclusions, errorCode },
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/my-aqslim/pilot" className={styles.brand}>AQ<span>SLIM</span></Link>
        <span>{es ? 'ACCESO PILOTO' : 'PILOT ACCESS'}</span>
      </header>

      <section className={styles.content}>
        <Link href="/my-aqslim/pilot" className={styles.back}>{es ? '← Volver al piloto' : '← Back to pilot'}</Link>
        <p className={styles.eyebrow}>AQ BUDDY · {patientName.toUpperCase()}</p>
        <h1>{es ? 'Recetas de mi refrigerador' : 'Recipes from my refrigerator'}</h1>
        <p className={styles.intro}>{es
          ? 'Muéstrale a AQ Buddy una, dos o tres vistas. Después podrás corregir la lista antes de crear las recetas.'
          : 'Show AQ Buddy one, two, or three views. You can correct the ingredient list before creating recipes.'}</p>

        <section className={styles.formPanel}>
          <div className={styles.stepHeading}><span>01</span><div><strong>{es ? 'Muéstrame lo que tienes' : 'Show me what you have'}</strong><small>{es ? 'Refrigerador, puerta o ingredientes sobre la mesa.' : 'Refrigerator, door, or ingredients on a counter.'}</small></div></div>

          <div className={styles.photoGrid}>
            {photos.map((photo, index) => (
              <div className={styles.photo} key={photo.id}>
                <img src={photo.previewUrl} alt={es ? `Foto ${index + 1} de ingredientes` : `Ingredient photo ${index + 1}`} />
                <span>{index + 1}</span>
                <button type="button" onClick={() => removePhoto(photo.id)} aria-label={es ? `Eliminar foto ${index + 1}` : `Remove photo ${index + 1}`}>×</button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <button type="button" className={styles.addPhoto} onClick={() => fileRef.current?.click()}>
                <b>＋</b><span>{photos.length ? (es ? 'Agregar otra vista' : 'Add another view') : (es ? 'Tomar o elegir foto' : 'Take or choose a photo')}</span><small>{photos.length + 1} / {MAX_PHOTOS}</small>
              </button>
            ) : null}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple hidden onChange={event => void loadFiles(event.target.files)} />

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>{es ? 'Porciones' : 'Servings'}</span>
              <select value={servings} onChange={event => setServings(Number(event.target.value))}>
                {[1, 2, 3, 4, 5, 6].map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <div className={styles.context}>
              <span>{es ? 'Fase nutricional' : 'Nutritional phase'}</span>
              <strong>{phase || (es ? 'Por confirmar' : 'Pending confirmation')}</strong>
            </div>
          </div>

          <label className={styles.field}>
            <span>{es ? 'También tengo (opcional)' : 'I also have (optional)'}</span>
            <textarea value={additionalIngredients} onChange={event => { setAdditionalIngredients(event.target.value); invalidateDetection() }} maxLength={400} placeholder={es ? 'Ejemplo: carne deshebrada, tortillas.' : 'Example: shredded beef, tortillas.'} />
          </label>
          <label className={styles.field}>
            <span>{es ? 'Quiero evitar (opcional)' : 'I want to avoid (optional)'}</span>
            <textarea value={exclusions} onChange={event => setExclusions(event.target.value)} maxLength={400} placeholder={es ? 'Ejemplo: sin lácteos o sin picante.' : 'Example: no dairy or no spicy food.'} />
          </label>

          {!phase ? <p className={styles.phaseNotice}>{es ? 'Tu fase aún no está confirmada. Las recetas serán ideas generales y no se presentarán como compatibles con una fase específica.' : 'Your phase is not confirmed yet. Recipes will be general ideas and will not be presented as compatible with a specific phase.'}</p> : null}

          <button type="button" className={styles.analyze} disabled={!photos.length || detecting || generating} onClick={detectIngredients}>
            {detecting ? (es ? 'Identificando ingredientes…' : 'Identifying ingredients…') : (es ? 'Identificar ingredientes' : 'Identify ingredients')}
          </button>

          {detection ? (
            <section className={styles.confirmPanel} aria-live="polite">
              <div className={styles.stepHeading}><span>02</span><div><strong>{es ? 'Confirma lo que tienes' : 'Confirm what you have'}</strong><small>{es ? 'Corrige, borra o agrega ingredientes separados por comas.' : 'Correct, remove, or add ingredients separated by commas.'}</small></div></div>
              <label className={styles.field}>
                <span>{es ? 'Ingredientes confirmados' : 'Confirmed ingredients'}</span>
                <textarea className={styles.ingredientsEditor} value={ingredientsText} onChange={event => setIngredientsText(event.target.value)} maxLength={1200} />
              </label>
              {detection.uncertainItems.length ? <div className={styles.uncertain}><span>{es ? 'Revisa especialmente' : 'Please check'}</span><p>{detection.uncertainItems.join(' · ')}</p></div> : null}
              <p className={styles.confidence}>{detection.confidenceNote}</p>
              <button type="button" className={styles.generate} disabled={generating} onClick={createRecipes}>
                {generating ? (es ? 'Creando tus recetas…' : 'Creating your recipes…') : (es ? 'Confirmar y crear 3 recetas' : 'Confirm and create 3 recipes')}
              </button>
            </section>
          ) : null}

          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          {error && feedbackTarget ? <PilotFeedback key={feedbackTarget.id} tool="Recetas del refrigerador" language={language} responseId={feedbackTarget.id} context={feedbackTarget.context} issueOnly /> : null}
          <p className={styles.disclosure}>{es ? 'Las identificaciones y cantidades son aproximadas. Verifica ingredientes, alergias, fechas y cocción segura.' : 'Identifications and quantities are approximate. Verify ingredients, allergies, dates, and safe cooking.'}</p>
        </section>

        {result ? (
          <section className={styles.results} aria-live="polite">
            <div className={styles.stepHeading}><span>03</span><div><strong>{es ? 'Tres ideas para ti' : 'Three ideas for you'}</strong><small>{es ? 'Basadas en la lista que tú confirmaste.' : 'Based on the list you confirmed.'}</small></div></div>
            <div className={styles.recipeGrid}>
              {result.recipes.map((recipe, index) => (
                <article key={`${recipe.name}-${index}`} className={styles.recipe}>
                  <div className={styles.recipeNumber}>0{index + 1}</div>
                  <div className={styles.recipeMeta}><span>{recipe.minutes} min</span><span>{recipe.servings} {es ? 'porc.' : 'serv.'}</span></div>
                  <h3>{recipe.name}</h3>
                  <p className={styles.summary}>{recipe.summary}</p>
                  <h4>{es ? 'Usa' : 'Use'}</h4>
                  <ul>{recipe.ingredients.map((ingredient, ingredientIndex) => <li key={`${ingredient.item}-${ingredientIndex}`}><strong>{ingredient.amount}</strong> {ingredient.item}</li>)}</ul>
                  {recipe.optionalExtras.length ? <><h4>{es ? 'Opcional o por agregar' : 'Optional or add if available'}</h4><p className={styles.extras}>{recipe.optionalExtras.join(' · ')}</p></> : null}
                  <h4>{es ? 'Preparación' : 'Directions'}</h4>
                  <ol>{recipe.steps.map((step, stepIndex) => <li key={`${stepIndex}-${step}`}>{step}</li>)}</ol>
                  <p className={styles.phaseFit}><strong>{es ? 'Tu fase:' : 'Your phase:'}</strong> {recipe.phaseFit}</p>
                </article>
              ))}
            </div>
            <div className={styles.notes}><p>{result.confidenceNote}</p><p>{result.safetyNote}</p></div>
            {feedbackTarget ? <PilotFeedback key={feedbackTarget.id} tool="Recetas del refrigerador" language={language} responseId={feedbackTarget.id} context={feedbackTarget.context} /> : null}
          </section>
        ) : null}
      </section>
    </main>
  )
}
