'use client'

import Image from 'next/image'
import { useEffect } from 'react'
import type { PlateOption } from '@/lib/nutrition/types'
import { RECIPE_DETAILS, type RecipeAllergen } from './recipe-detail-data'
import styles from './recipe-detail-dialog.module.css'

type Language = 'es' | 'en'

type Props = {
  option: PlateOption | null
  language: Language
  context: 'client' | 'review'
  onClose: () => void
}

const ALLERGEN_LABEL: Record<RecipeAllergen, { es: string; en: string }> = {
  dairy: { es: 'lácteos', en: 'dairy' },
  egg: { es: 'huevo', en: 'egg' },
  fish: { es: 'pescado', en: 'fish' },
}

function optionAllergens(option: PlateOption): readonly RecipeAllergen[] {
  const detail = RECIPE_DETAILS[option.familyId]
  const allergens = new Set<RecipeAllergen>(detail?.allergens ?? [])

  for (const component of option.componentNames) {
    const name = component.es.toLocaleLowerCase('es')
    if (name.includes('queso')) allergens.add('dairy')
    if (name.includes('huevo')) allergens.add('egg')
    if (name.includes('atún') || name.includes('tilapia')) allergens.add('fish')
  }

  return [...allergens]
}

export function hasPilotRecipeDetail(option: PlateOption) {
  return Boolean(RECIPE_DETAILS[option.familyId])
}

export function RecipeDetailDialog({ option, language, context, onClose }: Props) {
  const es = language === 'es'

  useEffect(() => {
    if (!option) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose, option])

  if (!option || !hasPilotRecipeDetail(option)) return null

  const detail = RECIPE_DETAILS[option.familyId]
  const allergens = optionAllergens(option)
  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <article
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pilot-recipe-title"
      >
        <button className={styles.close} type="button" onClick={onClose} aria-label={es ? 'Cerrar receta' : 'Close recipe'}>×</button>

        <div className={styles.hero}>
          <Image
            src={detail.image}
            alt={detail.imageAlt[language]}
            width={1280}
            height={853}
            sizes="(max-width: 760px) 100vw, 48vw"
          />
          <span>{es ? 'Ficha piloto · Jing' : 'Pilot recipe · Jing'}</span>
        </div>

        <div className={styles.content}>
          <header>
            <p>{context === 'review'
              ? (es ? 'Así la recibirá el cliente' : 'This is what the client will receive')
              : (es ? 'Tu receta paso a paso' : 'Your step-by-step recipe')}</p>
            <h2 id="pilot-recipe-title">{option.name[language]}</h2>
            <div className={styles.quickFacts}>
              <span>{option.minutes} min</span>
              <span>{option.totals.calories} kcal</span>
              <span>{option.totals.netCarbsG} g {es ? 'carbos netos' : 'net carbs'}</span>
              <span>{option.totals.proteinG} g {es ? 'proteína' : 'protein'}</span>
            </div>
          </header>

          <section className={styles.portion}>
            <span>{es ? 'Tu porción calculada' : 'Your calculated portion'}</span>
            <strong>{option.portion[language]}</strong>
            <small>{es ? `Banda ${option.band} · Valores aproximados para esta combinación` : `Band ${option.band} · Approximate values for this combination`}</small>
          </section>

          <div className={styles.columns}>
            <section>
              <h3>{es ? 'Ingredientes' : 'Ingredients'}</h3>
              <ul className={styles.ingredients}>
                {detail.ingredients[option.band].map(item => <li key={item.es}>{item[language]}</li>)}
              </ul>
              {option.componentNames.length > 0 ? (
                <div className={styles.components}>
                  <span>{es ? 'Completa tu plato con' : 'Complete your plate with'}</span>
                  <p>{option.componentNames.map(item => item[language]).join(' + ')}</p>
                </div>
              ) : null}
            </section>

            <section>
              <h3>{es ? 'Preparación' : 'Directions'}</h3>
              <ol className={styles.steps}>
                {detail.steps.map(item => <li key={item.es}>{item[language]}</li>)}
              </ol>
            </section>
          </div>

          <section className={styles.substitutions}>
            <div>
              <span>{es ? 'Sustituciones compatibles' : 'Compatible substitutions'}</span>
              <ul>{detail.substitutions.map(item => <li key={item.es}>{item[language]}</li>)}</ul>
            </div>
            <p><strong>{es ? 'Alérgenos:' : 'Allergens:'}</strong> {allergens.length > 0
              ? allergens.map(item => ALLERGEN_LABEL[item][language]).join(', ')
              : (es ? 'ninguno declarado en la receta base' : 'none declared in the base recipe')}. {es
              ? 'Si haces una sustitución, conserva la porción indicada.'
              : 'If you make a substitution, keep the indicated portion.'}</p>
          </section>
        </div>
      </article>
    </div>
  )
}
