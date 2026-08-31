'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { PatientPortalData } from '@/lib/patient-portal'
import type { GuidedPlan, MealSlot, PlateOption } from '@/lib/nutrition/types'
import {
  buildShoppingList,
  buildWeeklyRotation,
  rotationFrequency,
  weeklyRotationKey,
  type RecipePreference,
  type RecipePreferenceMap,
  type ShoppingCategory,
} from '@/lib/nutrition/weekly-capsule'
import { PortalShell } from '../portal-shell'
import { usePortalLanguage } from '../use-portal-language'
import { hasPilotRecipeDetail, RecipeDetailDialog } from './recipe-detail-dialog'
import recipeStyles from './recipe-detail-dialog.module.css'
import styles from '../portal.module.css'

const SLOT_COPY: Record<MealSlot, { es: string; en: string }> = {
  first_meal: { es: 'Primera comida', en: 'First meal' },
  lunch: { es: 'Comida', en: 'Lunch' },
  dinner: { es: 'Cena', en: 'Dinner' },
}

const SHOPPING_CATEGORY_COPY: Record<ShoppingCategory, { es: string; en: string }> = {
  protein: { es: 'Proteínas', en: 'Proteins' },
  produce: { es: 'Verduras y frescos', en: 'Produce' },
  refrigerated: { es: 'Refrigerados', en: 'Refrigerated' },
  pantry: { es: 'Revisa tu despensa', en: 'Check your pantry' },
}

const SHOPPING_CATEGORIES: readonly ShoppingCategory[] = ['protein', 'produce', 'refrigerated', 'pantry']

type Props = {
  data: PatientPortalData
  plan: GuidedPlan
  demo?: boolean
}

export function GuidedPlanView({ data, plan, demo = false }: Props) {
  const [language] = usePortalLanguage(data.language, data.clienteId)
  const [activeSlot, setActiveSlot] = useState<MealSlot>(plan.groups[0]?.slot ?? 'lunch')
  const [selected, setSelected] = useState<Partial<Record<MealSlot, string>>>({})
  const [preferences, setPreferences] = useState<RecipePreferenceMap>({})
  const [showShoppingList, setShowShoppingList] = useState(false)
  const [openRecipe, setOpenRecipe] = useState<PlateOption | null>(null)
  const es = language === 'es'
  const shellFirstName = demo ? (es ? 'Vista de ejemplo' : 'Example view') : data.firstName
  const group = plan.groups.find(item => item.slot === activeSlot) ?? plan.groups[0]
  const chosenCount = Object.keys(selected).length
  const guidePath = demo ? '/my-aqslim/demo/materials' : '/my-aqslim/materials'
  const weeklyRotation = useMemo(() => buildWeeklyRotation(plan, preferences), [plan, preferences])
  const frequency = useMemo(() => rotationFrequency(weeklyRotation), [weeklyRotation])
  const shoppingList = useMemo(() => buildShoppingList(weeklyRotation), [weeklyRotation])
  const activeRecipeCount = plan.groups.reduce(
    (total, item) => total + item.options.filter(option => preferences[option.familyId] !== 'avoid').length,
    0,
  )

  function choose(slot: MealSlot, optionId: string) {
    setSelected(current => ({ ...current, [slot]: optionId }))
    const groupIndex = plan.groups.findIndex(item => item.slot === slot)
    const nextGroup = plan.groups[groupIndex + 1]
    if (nextGroup) setActiveSlot(nextGroup.slot)
  }

  function canAvoidFamily(familyId: string) {
    return plan.groups.every(item => item.options.some(option => (
      option.familyId !== familyId && preferences[option.familyId] !== 'avoid'
    )))
  }

  function rateOption(familyId: string, preference: RecipePreference) {
    setPreferences(current => {
      const currentValue = current[familyId]
      const nextValue = currentValue === preference ? undefined : preference
      const wouldEmptyAGroup = plan.groups.some(item => item.options.every(option => (
        option.familyId === familyId || current[option.familyId] === 'avoid'
      )))

      if (nextValue === 'avoid' && currentValue !== 'avoid' && wouldEmptyAGroup) return current

      const next = { ...current }
      if (nextValue) next[familyId] = nextValue
      else delete next[familyId]
      return next
    })

    if (preference === 'avoid' && preferences[familyId] !== 'avoid') {
      setSelected(current => {
        const next = { ...current }
        for (const [slot, optionId] of Object.entries(current) as Array<[MealSlot, string]>) {
          const option = plan.groups.find(item => item.slot === slot)?.options.find(item => item.id === optionId)
          if (option?.familyId === familyId) delete next[slot]
        }
        return next
      })
    }
  }

  return (
    <PortalShell firstName={shellFirstName} profileId={data.clienteId} initialLanguage={data.language} demo={demo}>
      <section className={styles.guidedIntro}>
        <div>
          <p className={styles.eyebrow}>{es ? 'Libertad guiada' : 'Guided freedom'}</p>
          <h1>{es ? 'Tus opciones de esta semana' : 'Your choices this week'}</h1>
          <p>{es
            ? 'Marca tus favoritas y las que no deseas repetir. AQ Buddy mantiene una cápsula pequeña y compatible.'
            : 'Mark your favorites and the choices you do not want repeated. AQ Buddy keeps a small compatible capsule.'}</p>
        </div>
        <span className={styles.syntheticBadge}>{es ? `Preview sintético · ${plan.profile.firstName}` : `Synthetic Preview · ${plan.profile.firstName}`}</span>
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
            <span>{group.options.filter(option => preferences[option.familyId] !== 'avoid').length} {es ? 'activas de 3' : 'active of 3'}</span>
          </div>

          <div className={styles.choiceList}>
            {group.options.map((option, index) => {
              const isSelected = selected[group.slot] === option.id
              const preference = preferences[option.familyId]
              const cannotAvoid = preference !== 'avoid' && !canAvoidFamily(option.familyId)
              return (
                <article
                  key={option.id}
                  className={`${styles.choiceCard} ${isSelected ? styles.choiceSelected : ''} ${preference === 'avoid' ? styles.choiceAvoided : ''}`}
                >
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
                    <div className={styles.preferenceActions} aria-label={es ? `Preferencia para ${option.name.es}` : `Preference for ${option.name.en}`}>
                      <button
                        type="button"
                        aria-pressed={preference === 'favorite'}
                        className={preference === 'favorite' ? styles.preferenceActive : undefined}
                        onClick={() => rateOption(option.familyId, 'favorite')}
                      >♡ {es ? 'Favorita' : 'Favorite'}</button>
                      <button
                        type="button"
                        aria-pressed={preference === 'liked'}
                        className={preference === 'liked' ? styles.preferenceActive : undefined}
                        onClick={() => rateOption(option.familyId, 'liked')}
                      >✓ {es ? 'Me gusta' : 'I like it'}</button>
                      <button
                        type="button"
                        aria-pressed={preference === 'avoid'}
                        className={preference === 'avoid' ? styles.preferenceAvoidActive : undefined}
                        disabled={cannotAvoid}
                        onClick={() => rateOption(option.familyId, 'avoid')}
                      >− {es ? 'No repetir' : 'Do not repeat'}</button>
                    </div>
                    <div className={styles.choiceActions}>
                      <button type="button" disabled={preference === 'avoid'} onClick={() => choose(group.slot, option.id)}>
                        {isSelected ? (es ? 'Elegida ✓' : 'Chosen ✓') : (es ? 'Elijo ésta' : 'Choose this')}
                      </button>
                      <span>{hasPilotRecipeDetail(option)
                        ? (es ? 'Receta ilustrada disponible' : 'Illustrated recipe available')
                        : (es ? 'Ficha próximamente' : 'Recipe card coming soon')}</span>
                    </div>
                    {hasPilotRecipeDetail(option) ? (
                      <button type="button" className={recipeStyles.trigger} onClick={() => setOpenRecipe(option)}>
                        {es ? 'Ver receta con foto' : 'View photo recipe'}
                      </button>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}

      <section className={`${styles.panel} ${styles.weeklyCapsule}`} data-testid="weekly-capsule">
        <header>
          <div>
            <p className={styles.eyebrow}>{es ? 'Cápsula semanal' : 'Weekly capsule'}</p>
            <h2>{es ? 'Pocas recetas, compras que sí se aprovechan' : 'Fewer recipes, groceries you will use'}</h2>
            <p>{es
              ? 'AQ Buddy distribuye las alternativas activas durante siete días. La preferencia aplica a la receta en cualquier horario y ningún ingrediente entra en la lista para una sola comida.'
              : 'AQ Buddy distributes active choices across seven days. The preference applies to the recipe in any meal slot, and no ingredient enters the list for only one meal.'}</p>
          </div>
          <dl className={styles.capsuleMetrics}>
            <div><dt>{es ? 'Recetas activas' : 'Active recipes'}</dt><dd>{activeRecipeCount}</dd></div>
            <div><dt>{es ? 'Comidas planeadas' : 'Planned meals'}</dt><dd>{weeklyRotation.length}</dd></div>
          </dl>
        </header>

        <div className={styles.rotationGroups}>
          {plan.groups.map(item => (
            <section key={item.slot}>
              <h3>{SLOT_COPY[item.slot][language]}</h3>
              <ul>{item.options.map(option => {
                const uses = frequency[weeklyRotationKey(item.slot, option.id)] ?? 0
                return (
                  <li key={option.id} className={uses === 0 ? styles.rotationExcluded : undefined}>
                    <span>{option.name[language]}</span>
                    <b>{uses > 0
                      ? `${uses} ${es ? 'veces' : 'times'}`
                      : (es ? 'No repetir' : 'Do not repeat')}</b>
                  </li>
                )
              })}</ul>
            </section>
          ))}
        </div>

        <div className={styles.capsuleActions}>
          <button type="button" className={styles.goldButton} onClick={() => setShowShoppingList(value => !value)}>
            {showShoppingList
              ? (es ? 'Ocultar lista' : 'Hide list')
              : (es ? 'Confirmar rotación y preparar lista' : 'Confirm rotation and prepare list')}
          </button>
          <span>{es ? 'Preview sintético: las preferencias todavía no se guardan.' : 'Synthetic Preview: preferences are not saved yet.'}</span>
        </div>
      </section>

      {showShoppingList ? (
        <section className={`${styles.panel} ${styles.shoppingList}`} aria-live="polite" data-testid="shopping-list">
          <header>
            <div>
              <p className={styles.eyebrow}>{es ? 'Lista de supermercado' : 'Grocery list'}</p>
              <h2>{es ? 'Compra coordinada para siete días' : 'Coordinated shopping for seven days'}</h2>
            </div>
            <span>{shoppingList.length} {es ? 'ingredientes agrupados' : 'grouped ingredients'}</span>
          </header>

          <div className={styles.shoppingGroups}>
            {SHOPPING_CATEGORIES.map(category => {
              const items = shoppingList.filter(item => item.category === category)
              if (items.length === 0) return null
              return (
                <section key={category}>
                  <h3>{SHOPPING_CATEGORY_COPY[category][language]}</h3>
                  <ul>{items.map(item => (
                    <li key={item.ingredient}>
                      <span>{item.label[language]}</span>
                      <b>{es ? `para ${item.mealUses} comidas` : `for ${item.mealUses} meals`}</b>
                    </li>
                  ))}</ul>
                </section>
              )
            })}
          </div>
          <p className={styles.shoppingNotice}>{es
            ? 'Esta primera lista agrupa por número de preparaciones. Las cantidades de compra se añadirán después de validar equivalencias domésticas de cada porción.'
            : 'This first list groups by number of preparations. Purchase quantities will be added after validating household equivalents for each portion.'}</p>
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

      <RecipeDetailDialog option={openRecipe} language={language} context="client" onClose={() => setOpenRecipe(null)} />
    </PortalShell>
  )
}
