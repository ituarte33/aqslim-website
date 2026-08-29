'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { GuidedPlan, MealSlot } from '@/lib/nutrition/types'
import { DashboardShell } from '../dashboard-shell'
import styles from './plan-preview.module.css'

const SLOT_LABEL: Record<MealSlot, { es: string; en: string }> = {
  first_meal: { es: 'Primera comida', en: 'First meal' },
  lunch: { es: 'Comida', en: 'Lunch' },
  dinner: { es: 'Cena', en: 'Dinner' },
}

const FOOD_LABEL: Record<string, { es: string; en: string }> = {
  chicken: { es: 'pollo', en: 'chicken' },
  dairy: { es: 'lácteos', en: 'dairy' },
  egg: { es: 'huevo', en: 'egg' },
  fish: { es: 'pescado', en: 'fish' },
  'ground beef': { es: 'carne molida', en: 'ground beef' },
  nopales: { es: 'nopales', en: 'nopales' },
  pork: { es: 'cerdo', en: 'pork' },
  sirloin: { es: 'bistec', en: 'steak' },
  spinach: { es: 'espinaca', en: 'spinach' },
  tilapia: { es: 'tilapia', en: 'tilapia' },
}

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
  plans: readonly GuidedPlan[]
  recipeVariantCount: number
  componentCount: number
}

function foodList(values: readonly string[], lang: 'es' | 'en') {
  return values.map(value => FOOD_LABEL[value]?.[lang] ?? value).join(', ')
}

function blockedMessage(status: GuidedPlan['status'], es: boolean) {
  if (status === 'blocked_high_target') {
    return es
      ? 'La biblioteca piloto todavía no cubre automáticamente una meta de 2,000 kcal. AQ Buddy detuvo la generación para revisión humana.'
      : 'The pilot library does not yet cover a 2,000 kcal target automatically. AQ Buddy stopped generation for human review.'
  }
  if (status === 'blocked_profile') {
    return es
      ? 'Este perfil está fuera de la cobertura autorizada para la prueba y requiere revisión humana.'
      : 'This profile is outside the authorized test coverage and requires human review.'
  }
  return es
    ? 'La biblioteca actual no tiene suficientes opciones compatibles para completar este perfil.'
    : 'The current library does not have enough compatible choices to complete this profile.'
}

function resetPreviewScroll() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}

export function PlanPreviewClient({ user, plans, recipeVariantCount, componentCount }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [selectedProfileId, setSelectedProfileId] = useState(plans[0]?.profile.id ?? '')
  const es = lang === 'es'
  const plan = useMemo(
    () => plans.find(item => item.profile.id === selectedProfileId) ?? plans[0],
    [plans, selectedProfileId],
  )
  const combinationCount = useMemo(
    () => plan.groups.length > 0
      ? plan.groups.reduce((total, group) => total * group.options.length, 1)
      : 0,
    [plan.groups],
  )
  const generationPassed = plan.status === 'ready_for_review'
  const coverageGap = plan.groups.find(group => group.options.length < 3)

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    resetPreviewScroll()

    let secondFrame = 0
    const firstFrame = window.requestAnimationFrame(() => {
      resetPreviewScroll()
      secondFrame = window.requestAnimationFrame(resetPreviewScroll)
    })
    const delayedReset = window.setTimeout(resetPreviewScroll, 120)

    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.cancelAnimationFrame(secondFrame)
      window.clearTimeout(delayedReset)
      window.history.scrollRestoration = previousScrollRestoration
    }
  }, [])

  function selectProfile(profileId: string) {
    setSelectedProfileId(profileId)
    window.requestAnimationFrame(resetPreviewScroll)
  }

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      <div className={styles.page}>
        <header className={styles.intro}>
          <div>
            <div className={styles.kicker}>{es ? 'MYAQ-001-REC-001 · Preview aislado' : 'MYAQ-001-REC-001 · Isolated Preview'}</div>
            <h1>{es ? 'Revisión de planes personalizados' : 'Personalized plan review'}</h1>
            <p>{es
              ? 'AQ Buddy genera las opciones automáticamente; aquí revisas las excepciones antes de publicar. Todos los datos son sintéticos.'
              : 'AQ Buddy generates the choices automatically; review exceptions here before publishing. All data is synthetic.'}</p>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.syntheticBadge}>{es ? 'Datos sintéticos' : 'Synthetic data'}</span>
            {generationPassed ? (
              <Link
                href={{ pathname: '/my-aqslim/demo/plan', query: { profile: plan.profile.id } }}
                className={styles.previewLink}
                target="_blank"
                rel="noreferrer"
              >
                {es ? `Abrir vista de ${plan.profile.firstName} ↗` : `Open ${plan.profile.firstName}’s view ↗`}
              </Link>
            ) : (
              <span className={`${styles.previewLink} ${styles.previewLinkDisabled}`} aria-disabled="true">
                {es ? `Vista de ${plan.profile.firstName} no disponible` : `${plan.profile.firstName}’s view unavailable`}
              </span>
            )}
          </div>
        </header>

        <section className={styles.profilePicker} aria-labelledby="synthetic-profile-title">
          <div className={styles.profilePickerIntro}>
            <div>
              <span>{es ? 'Prueba de personalización automática v0.1' : 'Automatic personalization test v0.1'}</span>
              <h2 id="synthetic-profile-title">{es ? 'Cambia el perfil; AQ Buddy recalcula' : 'Change the profile; AQ Buddy recalculates'}</h2>
            </div>
            <p>{es
              ? 'Estos perfiles ficticios comprueban que fase, número de comidas, gustos y exclusiones cambian el resultado sin armar cada plan a mano.'
              : 'These fictional profiles verify that phase, meal count, preferences, and exclusions change the result without building every plan by hand.'}</p>
          </div>
          <div className={styles.profileOptions}>
            {plans.map(item => {
              const active = item.profile.id === plan.profile.id
              const ready = item.status === 'ready_for_review'
              return (
                <button
                  key={item.profile.id}
                  type="button"
                  className={active ? styles.profileOptionActive : undefined}
                  aria-pressed={active}
                  onClick={() => selectProfile(item.profile.id)}
                >
                  <span className={ready ? styles.profileReady : styles.profileBlocked} />
                  <strong>{item.profile.firstName}</strong>
                  <small>{item.profile.calorieTarget.toLocaleString()} kcal · {item.profile.mealSlots.length} {es ? 'comidas' : 'meals'}</small>
                  <b>{ready ? (es ? 'Generado' : 'Generated') : (es ? 'Detenido' : 'Stopped')}</b>
                </button>
              )
            })}
          </div>
          <dl className={styles.profileSignals}>
            <div><dt>{es ? 'Prioriza' : 'Prioritizes'}</dt><dd>{foodList(plan.profile.preferredFoods, lang)}</dd></div>
            <div><dt>{es ? 'No le gusta' : 'Dislikes'}</dt><dd>{plan.profile.dislikedFoods.length > 0 ? foodList(plan.profile.dislikedFoods, lang) : (es ? 'Sin dislikes' : 'No dislikes')}</dd></div>
            <div><dt>{es ? 'Exclusión estricta' : 'Hard exclusion'}</dt><dd>{plan.profile.excludedFoods.length > 0 ? foodList(plan.profile.excludedFoods, lang) : (es ? 'Ninguna' : 'None')}</dd></div>
          </dl>
        </section>

        <section className={styles.summaryGrid}>
          <article className={styles.profileCard}>
            <span>{es ? 'Perfil de prueba' : 'Test profile'}</span>
            <strong>{plan.profile.firstName}</strong>
            <small>{plan.profile.phase} · {plan.profile.mealSlots.length} {es ? 'comidas' : 'meals'} · {plan.profile.calorieTarget.toLocaleString()} kcal</small>
          </article>
          <article>
            <span>{es ? 'Biblioteca piloto' : 'Pilot library'}</span>
            <strong>{recipeVariantCount}</strong>
            <small>{es ? 'variantes piloto calculadas' : 'calculated pilot variants'}</small>
          </article>
          <article>
            <span>{es ? 'Componentes' : 'Components'}</span>
            <strong>{componentCount}</strong>
            <small>{es ? 'complementos sintéticos' : 'synthetic complements'}</small>
          </article>
          <article>
            <span>{es ? 'Combinaciones diarias' : 'Daily combinations'}</span>
            <strong>{combinationCount}</strong>
            <small>{generationPassed ? (es ? 'compatibles automáticamente' : 'automatically compatible') : (es ? 'generación detenida' : 'generation stopped')}</small>
          </article>
        </section>

        <div className={styles.workspace}>
          <main className={styles.groups}>
            {plan.groups.length > 0 ? plan.groups.map(group => (
              <section key={group.slot} className={styles.groupCard}>
                <header>
                  <div>
                    <span>{SLOT_LABEL[group.slot][lang]}</span>
                    <h2>{Math.round(group.targetCalories)} kcal objetivo</h2>
                  </div>
                  <b>{group.options.length}/3 {es ? 'opciones' : 'choices'}</b>
                </header>

                <div className={styles.optionList}>
                  {group.options.map((option, index) => (
                    <article key={option.id} className={styles.optionCard}>
                      <div className={styles.optionIndex}>{index + 1}</div>
                      <div className={styles.optionCopy}>
                        <div>
                          <h3>{option.name[lang]}</h3>
                          <span>{option.recipeId} · Banda {option.band}{option.conditional ? ` · ${es ? 'Condicional' : 'Conditional'}` : ''}</span>
                        </div>
                        <p>{option.portion[lang]}</p>
                        {option.componentNames.length > 0 ? (
                          <ul>{option.componentNames.map(component => <li key={component.es}>+ {component[lang]}</li>)}</ul>
                        ) : null}
                      </div>
                      <dl className={styles.macros}>
                        <div><dt>kcal</dt><dd>{option.totals.calories}</dd></div>
                        <div><dt>{es ? 'Carbos netos' : 'Net carbs'}</dt><dd>{option.totals.netCarbsG} g</dd></div>
                        <div><dt>{es ? 'Proteína' : 'Protein'}</dt><dd>{option.totals.proteinG} g</dd></div>
                      </dl>
                    </article>
                  ))}
                </div>
              </section>
            )) : (
              <section className={styles.blockedPanel}>
                <span>{es ? 'Revisión requerida' : 'Review required'}</span>
                <h2>{es ? 'AQ Buddy no improvisó un plan' : 'AQ Buddy did not improvise a plan'}</h2>
                <p>{blockedMessage(plan.status, es)}</p>
                <ul>
                  <li>{es ? 'No se mostraron recetas incompatibles.' : 'No incompatible recipes were shown.'}</li>
                  <li>{es ? 'No se aumentaron porciones fuera de las reglas.' : 'Portions were not increased beyond the rules.'}</li>
                  <li>{es ? 'La publicación permanece desactivada.' : 'Publishing remains disabled.'}</li>
                </ul>
              </section>
            )}
          </main>

          <aside className={styles.inspector}>
            <div className={`${styles.statusCard} ${generationPassed ? '' : styles.blockedStatusCard}`}>
              <div className={styles.statusItem}>
                <span className={`${styles.statusDot} ${generationPassed ? '' : styles.stopDot}`} />
                <div>
                  <small>{es ? 'Validación automática' : 'Automated validation'}</small>
                  <strong>{generationPassed
                    ? (es ? `Aprobada · ${combinationCount}/${combinationCount} combinaciones` : `Passed · ${combinationCount}/${combinationCount} combinations`)
                    : (es ? 'Detenida por regla de cobertura' : 'Stopped by coverage rule')}</strong>
                </div>
              </div>
              <div className={styles.statusDivider} />
              <div className={styles.statusItem}>
                <span className={`${styles.statusDot} ${styles.reviewDot}`} />
                <div>
                  <small>{es ? 'Publicación' : 'Publishing'}</small>
                  <strong className={styles.reviewStatus}>{generationPassed
                    ? (es ? 'Pendiente de revisión humana' : 'Pending human review')
                    : (es ? 'No disponible' : 'Unavailable')}</strong>
                </div>
              </div>
            </div>

            {coverageGap ? (
              <div className={styles.coverageNote}>
                <span>{es ? 'Cobertura piloto' : 'Pilot coverage'}</span>
                <strong>{SLOT_LABEL[coverageGap.slot][lang]}: {coverageGap.options.length}/3 {es ? 'opciones' : 'choices'}</strong>
                <p>{es ? 'La prueba muestra la limitación; no inventa una tercera opción.' : 'The test shows the limitation; it does not invent a third choice.'}</p>
              </div>
            ) : null}

            <section>
              <span>{es ? 'Sobre de compatibilidad' : 'Compatibility envelope'}</span>
              <h2>{plan.envelope.passes
                ? (es ? `${combinationCount} de ${combinationCount} combinaciones compatibles` : `${combinationCount} of ${combinationCount} compatible combinations`)
                : (es ? 'Generación detenida' : 'Generation stopped')}</h2>
              <dl>
                <div><dt>{es ? 'Energía posible' : 'Possible energy'}</dt><dd>{plan.groups.length > 0 ? `${plan.envelope.minCalories}–${plan.envelope.maxCalories} kcal` : '—'}</dd></div>
                <div><dt>{es ? 'Rango permitido' : 'Allowed range'}</dt><dd>{plan.envelope.calorieFloor}–{plan.envelope.calorieCeiling} kcal</dd></div>
                <div><dt>{es ? 'Máximo de carbos' : 'Maximum carbs'}</dt><dd>{plan.groups.length > 0 ? `${plan.envelope.maxNetCarbsG}/${plan.envelope.carbCeilingG} g` : `—/${plan.envelope.carbCeilingG} g`}</dd></div>
              </dl>
            </section>

            <section>
              <span>{es ? 'Reglas aplicadas' : 'Applied rules'}</span>
              <ul className={styles.ruleList}>
                <li>{es ? 'Seguridad antes que preferencias' : 'Safety before preferences'}</li>
                <li>{es ? 'Máximo 3 opciones por comida' : 'Maximum 3 choices per meal'}</li>
                <li>{es ? 'Máximo 2 complementos' : 'Maximum 2 complements'}</li>
                <li>{es ? 'Sin repetición forzada de familias' : 'No forced family repetition'}</li>
              </ul>
            </section>

            <div className={styles.disabledActions}>
              <button type="button" disabled>{es ? 'Guardar borrador' : 'Save draft'}</button>
              <button type="button" disabled>{es ? 'Aprobar y publicar' : 'Approve and publish'}</button>
              <p>{es
                ? 'Controles desconectados: esta etapa no escribe en Airtable ni publica a usuarios.'
                : 'Disconnected controls: this stage neither writes to Airtable nor publishes to users.'}</p>
            </div>
          </aside>
        </div>
      </div>
    </DashboardShell>
  )
}
