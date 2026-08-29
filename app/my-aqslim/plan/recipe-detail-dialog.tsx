'use client'

import Image from 'next/image'
import { useEffect } from 'react'
import type { LocalizedText, PlateOption, PortionBand } from '@/lib/nutrition/types'
import styles from './recipe-detail-dialog.module.css'

type Language = 'es' | 'en'

type Props = {
  option: PlateOption | null
  language: Language
  context: 'client' | 'review'
  onClose: () => void
}

const text = (es: string, en: string): LocalizedText => ({ es, en })

const INGREDIENTS: Record<PortionBand, readonly LocalizedText[]> = {
  L: [
    text('1½ palmas de filete de tilapia', '1½ palms tilapia fillet'),
    text('3 tazas de espinaca fresca', '3 cups fresh spinach'),
    text('2 cucharaditas de aceite de oliva', '2 teaspoons olive oil'),
    text('Ajo, sal, pimienta y limón al gusto', 'Garlic, salt, pepper, and lemon to taste'),
  ],
  E: [
    text('2 palmas de filete de tilapia', '2 palms tilapia fillet'),
    text('3 tazas de espinaca fresca', '3 cups fresh spinach'),
    text('2 cucharadas de aceite de oliva', '2 tablespoons olive oil'),
    text('Ajo, sal, pimienta y limón al gusto', 'Garlic, salt, pepper, and lemon to taste'),
  ],
  M: [
    text('3 palmas de filete de tilapia', '3 palms tilapia fillet'),
    text('3 tazas de espinaca fresca', '3 cups fresh spinach'),
    text('2 cucharadas de aceite de oliva', '2 tablespoons olive oil'),
    text('Ajo, sal, pimienta y limón al gusto', 'Garlic, salt, pepper, and lemon to taste'),
  ],
}

const STEPS = [
  text('Seca la tilapia y sazónala con ajo, sal, pimienta y unas gotas de limón.', 'Pat the tilapia dry and season it with garlic, salt, pepper, and a few drops of lemon.'),
  text('Calienta la mitad del aceite en un sartén a fuego medio.', 'Heat half of the oil in a skillet over medium heat.'),
  text('Cocina la tilapia de 3 a 4 minutos por lado, hasta que se desmenuce fácilmente.', 'Cook the tilapia for 3 to 4 minutes per side, until it flakes easily.'),
  text('Retira el pescado. Agrega el resto del aceite y cocina la espinaca de 2 a 3 minutos.', 'Remove the fish. Add the remaining oil and cook the spinach for 2 to 3 minutes.'),
]

const SUBSTITUTIONS = [
  text('Tilapia → bacalao o lenguado, conservando la misma porción', 'Tilapia → cod or sole, keeping the same portion'),
  text('Espinaca → acelga o calabacita', 'Spinach → chard or zucchini'),
]

export function hasPilotRecipeDetail(option: PlateOption) {
  return option.familyId === 'PIL-J05'
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
            src="/images/recipes/tilapia-con-espinaca-v1.webp"
            alt={es ? 'Tilapia dorada servida con espinaca salteada' : 'Golden tilapia served with sautéed spinach'}
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
                {INGREDIENTS[option.band].map(item => <li key={item.es}>{item[language]}</li>)}
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
                {STEPS.map(item => <li key={item.es}>{item[language]}</li>)}
              </ol>
            </section>
          </div>

          <section className={styles.substitutions}>
            <div>
              <span>{es ? 'Sustituciones compatibles' : 'Compatible substitutions'}</span>
              <ul>{SUBSTITUTIONS.map(item => <li key={item.es}>{item[language]}</li>)}</ul>
            </div>
            <p><strong>{es ? 'Alérgeno:' : 'Allergen:'}</strong> {es ? 'pescado.' : 'fish.'} {es
              ? 'Si haces una sustitución, conserva la porción indicada.'
              : 'If you make a substitution, keep the indicated portion.'}</p>
          </section>
        </div>
      </article>
    </div>
  )
}
