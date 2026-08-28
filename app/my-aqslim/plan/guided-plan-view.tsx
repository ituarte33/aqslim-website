'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import type { PatientPortalData } from '@/lib/patient-portal'
import type { GuidedPlan, MealSlot } from '@/lib/nutrition/types'
import { PortalShell } from '../portal-shell'
import { usePortalLanguage } from '../use-portal-language'
import styles from '../portal.module.css'

const SLOT_COPY: Record<MealSlot, { es: string; en: string }> = {
  first_meal: { es: 'Primera comida', en: 'First meal' },
  lunch: { es: 'Comida', en: 'Lunch' },
  dinner: { es: 'Cena', en: 'Dinner' },
}

type Props = {
  data: PatientPortalData
  plan: GuidedPlan
  demo?: boolean
}

export function GuidedPlanView({ data, plan, demo = false }: Props) {
  const [language] = usePortalLanguage(data.language, data.clienteId)
  const [activeSlot, setActiveSlot] = useState<MealSlot>(plan.groups[0]?.slot ?? 'lunch')
  const [selected, setSelected] = useState<Partial<Record<MealSlot, string>>>({})
  const es = language === 'es'
  const group = plan.groups.find(item => item.slot === activeSlot) ?? plan.groups[0]
  const chosenCount = Object.keys(selected).length
  const guidePath = demo ? '/my-aqslim/demo/materials' : '/my-aqslim/materials'

  function choose(slot: MealSlot, optionId: string) {
    setSelected(current => ({ ...current, [slot]: optionId }))
    const groupIndex = plan.groups.findIndex(item => item.slot === slot)
    const nextGroup = plan.groups[groupIndex + 1]
    if (nextGroup) setActiveSlot(nextGroup.slot)
  }

  return (
    <PortalShell firstName={data.firstName} profileId={data.clienteId} initialLanguage={data.language} demo={demo}>
      <section className={styles.guidedIntro}>
        <div>
          <p className={styles.eyebrow}>{es ? 'Libertad guiada' : 'Guided freedom'}</p>
          <h1>{es ? 'Tus opciones de hoy' : 'Your choices today'}</h1>
          <p>{es
            ? 'Elige lo que se te antoje. AQ Buddy ya revisó las combinaciones por ti.'
            : 'Choose what sounds good. AQ Buddy already checked the combinations for you.'}</p>
        </div>
        <span className={styles.syntheticBadge}>{es ? 'Preview sintético' : 'Synthetic Preview'}</span>
      </section>

      <section className={`${styles.panel} ${styles.guidedPhase}`}>
        <div>
          <p className={styles.eyebrow}>{es ? 'Tu fase hoy' : 'Your phase today'}</p>
          <h2>{plan.profile.phase}</h2>
          <span>{es ? 'Opciones muy bajas en carbohidratos' : 'Very-low-carbohydrate choices'}</span>
        </div>
        <Link href={guidePath} className={styles.outlineAction}>{es ? 'Ver mi guía Jing' : 'View my Jing guide'}</Link>
      </section>

      <nav className={styles.mealTabs} aria-label={es ? 'Comidas de hoy' : 'Today’s meals'}>
        {plan.groups.map(item => {
          const isActive = item.slot === group?.slot
          const isChosen = Boolean(selected[item.slot])
          return (
            <button
              key={item.slot}
              type="button"
              className={`${isActive ? styles.mealTabActive : ''} ${isChosen ? styles.mealTabChosen : ''}`}
              onClick={() => setActiveSlot(item.slot)}
            >
              <span>{SLOT_COPY[item.slot][language]}</span>
              <small>{isChosen ? (es ? 'Elegida' : 'Chosen') : `${item.options.length} ${es ? 'opciones' : 'choices'}`}</small>
            </button>
          )
        })}
      </nav>

      {group ? (
        <section className={styles.choiceSection} data-testid="guided-choice-group">
          <div className={styles.choiceHeading}>
            <div>
              <p className={styles.eyebrow}>{SLOT_COPY[group.slot][language]}</p>
              <h2>{es ? '¿Qué se te antoja?' : 'What sounds good?'}</h2>
            </div>
            <span>{group.options.length}/3</span>
          </div>

          <div className={styles.choiceList}>
            {group.options.map((option, index) => {
              const isSelected = selected[group.slot] === option.id
              return (
                <article key={option.id} className={`${styles.choiceCard} ${isSelected ? styles.choiceSelected : ''}`}>
                  <div className={styles.choiceNumber}>{String(index + 1).padStart(2, '0')}</div>
                  <div className={styles.choiceBody}>
                    <div className={styles.choiceTitleRow}>
                      <h3>{option.name[language]}</h3>
                      <span>{option.minutes} min</span>
                    </div>
                    <p>{option.portion[language]}</p>
                    {option.componentNames.length > 0 ? (
                      <ul>
                        {option.componentNames.map(component => <li key={component.es}>{component[language]}</li>)}
                      </ul>
                    ) : null}
                    <div className={styles.choiceActions}>
                      <button type="button" onClick={() => choose(group.slot, option.id)}>
                        {isSelected ? (es ? 'Elegida ✓' : 'Chosen ✓') : (es ? 'Elijo ésta' : 'Choose this')}
                      </button>
                      <span>{es ? 'Fácil de preparar' : 'Easy to prepare'}</span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}

      <section className={`${styles.panel} ${styles.guidedFreedom}`}>
        <div>
          <p className={styles.eyebrow}>{es ? 'También puedes decidir libremente' : 'You can also choose freely'}</p>
          <h2>{es ? 'Tu lista Jing sigue siendo tuya' : 'Your Jing list is still yours'}</h2>
          <p>{es
            ? 'Si hoy no quieres una receta, usa tu guía. Después podrás registrar tu comida con foto o texto.'
            : 'If you do not want a recipe today, use your guide. You can then log your meal by photo or text.'}</p>
        </div>
        <Link href={guidePath} className={styles.goldButton}>{es ? 'Quiero decidir con mi lista' : 'Choose from my list'}</Link>
        <span className={styles.previewOnlyAction}>{es ? 'Registrar otra comida · disponible al conectar Preview' : 'Log another meal · available after Preview connection'}</span>
      </section>

      <details className={styles.guidedDetails}>
        <summary>{es ? '¿Por qué funcionan estas opciones?' : 'Why do these choices work?'}</summary>
        <p>{es
          ? `AQ Buddy comprobó todas las combinaciones. El día completo permanece entre ${plan.envelope.minCalories} y ${plan.envelope.maxCalories} kcal aproximadas y no supera ${plan.envelope.maxNetCarbsG} g netos calculados.`
          : `AQ Buddy checked every combination. The full day remains between approximately ${plan.envelope.minCalories} and ${plan.envelope.maxCalories} kcal and does not exceed ${plan.envelope.maxNetCarbsG} calculated net grams.`}</p>
      </details>

      <section className={styles.guidedBuddy}>
        <Image
          src="/Aqslim_Buddy_Pics/aqslim_buddy_open_arms.png"
          alt="AQ Buddy"
          width={132}
          height={132}
        />
        <div>
          <p className={styles.eyebrow}>AQ Buddy</p>
          <h2>{chosenCount === plan.groups.length
            ? (es ? 'Listo. Tus elecciones siguen dentro de Jing.' : 'All set. Your choices remain within Jing.')
            : (es ? 'Yo hago las cuentas; tú eliges.' : 'I do the math; you choose.')}</h2>
          <span>{es ? `${chosenCount} de ${plan.groups.length} comidas elegidas` : `${chosenCount} of ${plan.groups.length} meals chosen`}</span>
        </div>
      </section>
    </PortalShell>
  )
}
