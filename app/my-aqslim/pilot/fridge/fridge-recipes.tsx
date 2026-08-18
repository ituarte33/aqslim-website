'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { FridgeRecipeResult } from '@/lib/fridge-recipes'
import styles from './fridge.module.css'

type FridgeResponse = FridgeRecipeResult & {
  phase: string | null
  phaseConfirmed: boolean
}

const MAX_IMAGE_EDGE = 1800
const MAX_FILE_SIZE = 10 * 1024 * 1024

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
  return canvas.toDataURL('image/jpeg', .84).split(',')[1]
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
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [servings, setServings] = useState(2)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<FridgeResponse | null>(null)

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  const loadFile = useCallback(async (file?: File) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_FILE_SIZE) {
      setError(es ? 'Usa una imagen JPG, PNG o WEBP de máximo 10 MB.' : 'Use a JPG, PNG, or WEBP image up to 10 MB.')
      return
    }
    try {
      setError(null)
      setResult(null)
      setPreview(URL.createObjectURL(file))
      setImageBase64(await optimizeImage(file))
    } catch {
      setError(es ? 'No pudimos preparar esa imagen.' : 'We could not prepare that image.')
    }
  }, [es])

  async function createRecipes() {
    if (!imageBase64 || loading) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/fridge-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg', notes, servings, language }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'analysis_failed')
      setResult(data as FridgeResponse)
    } catch {
      setError(es
        ? 'AQ Buddy no pudo preparar las recetas. Prueba con una foto más clara y vuelve a intentarlo.'
        : 'AQ Buddy could not prepare the recipes. Try a clearer photo and try again.')
    } finally {
      setLoading(false)
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
          ? 'Toma una foto de los alimentos que tienes. AQ Buddy identificará lo visible y te propondrá tres maneras prácticas de aprovecharlo.'
          : 'Take a photo of the food you have. AQ Buddy will identify what is visible and suggest three practical ways to use it.'}</p>

        <section className={styles.formPanel}>
          <button type="button" className={styles.upload} onClick={() => fileRef.current?.click()}>
            {preview
              ? <img src={preview} alt={es ? 'Alimentos seleccionados' : 'Selected food'} />
              : <><b>▣</b><span>{es ? 'Fotografía tu refrigerador o ingredientes' : 'Photograph your refrigerator or ingredients'}</span><small>JPG, PNG, WEBP · {es ? 'máx.' : 'max'} 10 MB</small></>}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            hidden
            onChange={event => void loadFile(event.target.files?.[0])}
          />

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
            <span>{es ? 'Algo que quieras incluir o evitar (opcional)' : 'Anything to include or avoid (optional)'}</span>
            <textarea
              value={notes}
              onChange={event => setNotes(event.target.value)}
              maxLength={500}
              placeholder={es ? 'Ejemplo: sin lácteos; también tengo huevos y aceite de oliva.' : 'Example: dairy-free; I also have eggs and olive oil.'}
            />
          </label>

          {!phase ? (
            <p className={styles.phaseNotice}>{es
              ? 'Tu fase aún no está confirmada. Las recetas serán ideas generales y AQ Buddy no las presentará como compatibles con una fase específica.'
              : 'Your phase is not confirmed yet. Recipes will be general ideas and AQ Buddy will not present them as compatible with a specific phase.'}</p>
          ) : null}

          <button type="button" className={styles.analyze} disabled={!imageBase64 || loading} onClick={createRecipes}>
            {loading ? (es ? 'Creando tus recetas…' : 'Creating your recipes…') : (es ? 'Crear 3 recetas con AQ Buddy' : 'Create 3 recipes with AQ Buddy')}
          </button>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <p className={styles.disclosure}>{es
            ? 'Las identificaciones y cantidades son aproximadas. Verifica ingredientes, alergias, fechas y cocción segura antes de preparar cualquier receta.'
            : 'Identifications and quantities are approximate. Verify ingredients, allergies, dates, and safe cooking before preparing any recipe.'}</p>
        </section>

        {result ? (
          <section className={styles.results} aria-live="polite">
            <div className={styles.detected}>
              <div>
                <span>{es ? 'AQ Buddy identificó' : 'AQ Buddy identified'}</span>
                <p>{result.observedIngredients.join(' · ')}</p>
              </div>
              {result.uncertainItems.length ? (
                <div className={styles.uncertain}>
                  <span>{es ? 'No estoy completamente seguro de' : 'I am not completely sure about'}</span>
                  <p>{result.uncertainItems.join(' · ')}</p>
                </div>
              ) : null}
            </div>

            <h2>{es ? 'Tres ideas para ti' : 'Three ideas for you'}</h2>
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
            <div className={styles.notes}>
              <p>{result.confidenceNote}</p>
              <p>{result.safetyNote}</p>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  )
}
