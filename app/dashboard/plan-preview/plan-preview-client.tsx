'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { buildGuidedPlan } from '@/lib/nutrition/assembler'
import {
  canPublishSyntheticDraft,
  confirmSyntheticReview,
  createSyntheticPublicationState,
  publishSyntheticDraft,
  saveSyntheticDraft,
  SYNTHETIC_REVIEWER,
} from '@/lib/nutrition/synthetic-publication'
import type { SyntheticPlanSnapshot } from '@/lib/nutrition/synthetic-publication'
import type {
  CompletionComponent,
  GuidedPlan,
  MealSlot,
  NutritionProfile,
  PlateOption,
  RecipeVariant,
} from '@/lib/nutrition/types'
import { GuidedPlanExperience } from '@/app/my-aqslim/plan/guided-plan-view'
import { hasPilotRecipeDetail, RecipeDetailDialog } from '@/app/my-aqslim/plan/recipe-detail-dialog'
import { DashboardShell } from '../dashboard-shell'
import styles from './plan-preview.module.css'
import { SyntheticQuestionnaire } from './synthetic-questionnaire'

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
  recipes: readonly RecipeVariant[]
  components: readonly CompletionComponent[]
  recipeVariantCount: number
  componentCount: number
}

function foodList(values: readonly string[], lang: 'es' | 'en') {
  return values.map(value => FOOD_LABEL[value]?.[lang] ?? value).join(', ')
}

function blockedMessage(status: GuidedPlan['status'], es: boolean) {
  if (status === 'blocked_safety_review') {
    return es
      ? 'Los datos energéticos o una señal de seguridad requieren revisión humana antes de generar opciones.'
      : 'The energy inputs or a safety signal require human review before generating choices.'
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

function pounds(kilograms: number) {
  return Math.round(kilograms * 2.20462)
}

function activityLabel(activity: GuidedPlan['profile']['energyInputs']['activityLevel'], es: boolean) {
  const labels = {
    sedentary: es ? 'Actividad baja' : 'Low activity',
    light: es ? 'Actividad ligera' : 'Light activity',
    moderate: es ? 'Actividad moderada' : 'Moderate activity',
  }
  return labels[activity]
}

function resetPreviewScroll() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}

function workflowDate(value: string, lang: 'es' | 'en') {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function PlanPreviewClient({ user, plans, recipes, components, recipeVariantCount, componentCount }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [selectedProfileId, setSelectedProfileId] = useState(plans[0]?.profile.id ?? '')
  const [questionnairePlan, setQuestionnairePlan] = useState<GuidedPlan | null>(null)
  const [openRecipe, setOpenRecipe] = useState<PlateOption | null>(null)
  const [showTemporaryExperience, setShowTemporaryExperience] = useState(false)
  const [experienceMode, setExperienceMode] = useState<'draft' | 'published'>('draft')
  const [experienceSnapshot, setExperienceSnapshot] = useState<SyntheticPlanSnapshot | null>(null)
  const [publication, setPublication] = useState(createSyntheticPublicationState)
  const es = lang === 'es'
  const availablePlans = useMemo(
    () => questionnairePlan ? [questionnairePlan, ...plans] : plans,
    [plans, questionnairePlan],
  )
  const plan = useMemo(
    () => availablePlans.find(item => item.profile.id === selectedProfileId) ?? availablePlans[0],
    [availablePlans, selectedProfileId],
  )
  const combinationCount = useMemo(
    () => plan.groups.length > 0
      ? plan.groups.reduce((total, group) => total * group.options.length, 1)
      : 0,
    [plan.groups],
  )
  const generationPassed = plan.status === 'ready_for_review'
  const isQuestionnairePlan = plan.profile.id === 'SYN-JING-QUESTIONNAIRE-DRAFT'
  const draftMatchesCurrentPlan = publication.draft?.plan === plan
  const hasUnpublishedDraft = Boolean(
    publication.draft && publication.published?.version !== publication.draft.version,
  )
  const reviewConfirmed = publication.review?.draftVersion === publication.draft?.version
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

  useEffect(() => {
    if (!showTemporaryExperience) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowTemporaryExperience(false)
    }
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [showTemporaryExperience])

  function selectProfile(profileId: string) {
    setShowTemporaryExperience(false)
    setSelectedProfileId(profileId)
    window.requestAnimationFrame(resetPreviewScroll)
  }

  function generateQuestionnairePlan(profile: NutritionProfile) {
    const generatedPlan = buildGuidedPlan({ profile, recipes, components })
    setShowTemporaryExperience(false)
    setExperienceSnapshot(null)
    setExperienceMode('draft')
    setQuestionnairePlan(generatedPlan)
    setSelectedProfileId(profile.id)
    window.requestAnimationFrame(resetPreviewScroll)
  }

  function openSyntheticExperience(
    mode: 'draft' | 'published',
    snapshot: SyntheticPlanSnapshot | null = mode === 'published' ? publication.published : publication.draft,
  ) {
    if (!snapshot) return
    setExperienceMode(mode)
    setExperienceSnapshot(snapshot)
    setShowTemporaryExperience(true)
  }

  function saveCurrentSyntheticDraft() {
    setPublication(current => saveSyntheticDraft(current, plan))
    setExperienceSnapshot(null)
    setExperienceMode('draft')
  }

  function publishCurrentSyntheticDraft() {
    setPublication(current => publishSyntheticDraft(current))
    setExperienceSnapshot(null)
    setExperienceMode('published')
  }

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang} isolatedPreview>
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
            {generationPassed && !isQuestionnairePlan ? (
              <Link
                href={{ pathname: '/my-aqslim/demo/plan', query: { profile: plan.profile.id } }}
                className={styles.previewLink}
                target="_blank"
                rel="noreferrer"
              >
                {es ? `Abrir vista de ${plan.profile.firstName} ↗` : `Open ${plan.profile.firstName}’s view ↗`}
              </Link>
            ) : isQuestionnairePlan && hasUnpublishedDraft ? (
              <button
                type="button"
                className={`${styles.previewLink} ${styles.previewLinkButton}`}
                onClick={() => openSyntheticExperience('draft')}
              >
                {es
                  ? `Revisar borrador v${publication.draft?.version} ↗`
                  : `Review draft v${publication.draft?.version} ↗`}
              </button>
            ) : isQuestionnairePlan && publication.published ? (
              <button
                type="button"
                className={`${styles.previewLink} ${styles.previewLinkButton}`}
                onClick={() => openSyntheticExperience('published')}
              >
                {es
                  ? `Abrir versión publicada v${publication.published.version} ↗`
                  : `Open published version v${publication.published.version} ↗`}
              </button>
            ) : isQuestionnairePlan ? (
              <span className={`${styles.previewLink} ${styles.previewLinkDisabled}`} aria-disabled="true">
                {generationPassed
                  ? (es ? 'Guarda el borrador para abrirlo' : 'Save the draft to open it')
                  : (es ? 'Experiencia temporal no disponible' : 'Temporary experience unavailable')}
              </span>
            ) : (
              <span className={`${styles.previewLink} ${styles.previewLinkDisabled}`} aria-disabled="true">
                {es ? `Vista de ${plan.profile.firstName} no disponible` : `${plan.profile.firstName}’s view unavailable`}
              </span>
            )}
          </div>
        </header>

        <SyntheticQuestionnaire lang={lang} onGenerate={generateQuestionnairePlan} />

        <section className={styles.profilePicker} aria-labelledby="synthetic-profile-title">
          <div className={styles.profilePickerIntro}>
            <div>
              <span>{es ? 'Prueba de personalización y publicación v0.6' : 'Personalization and publishing test v0.6'}</span>
              <h2 id="synthetic-profile-title">{es ? 'Cambia el perfil; AQ Buddy recalcula' : 'Change the profile; AQ Buddy recalculates'}</h2>
            </div>
            <p>{es
              ? 'Estos perfiles ficticios comprueban que fase, número de comidas, gustos y exclusiones cambian el resultado sin armar cada plan a mano.'
              : 'These fictional profiles verify that phase, meal count, preferences, and exclusions change the result without building every plan by hand.'}</p>
          </div>
          <div className={styles.profileOptions}>
            {availablePlans.map(item => {
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
                  <small>{item.profile.calorieTarget.toLocaleString()} kcal {es ? 'calculadas' : 'calculated'} · {item.profile.mealSlots.length} {es ? 'comidas' : 'meals'}</small>
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
                  <b>{group.options.length} {es ? 'de 3 opciones disponibles' : 'of 3 choices available'}</b>
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
                        {hasPilotRecipeDetail(option) ? (
                          <button type="button" className={styles.recipeReviewButton} onClick={() => setOpenRecipe(option)}>
                            {es ? 'Ver receta con foto ↗' : 'View photo recipe ↗'}
                          </button>
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
                  <strong className={publication.published && isQuestionnairePlan ? styles.publishedStatus : styles.reviewStatus}>
                    {hasUnpublishedDraft && isQuestionnairePlan
                      ? (es
                        ? `Borrador v${publication.draft?.version} · publicada v${publication.published?.version ?? '—'} sigue activa`
                        : `Draft v${publication.draft?.version} · published v${publication.published?.version ?? '—'} remains active`)
                      : publication.published && isQuestionnairePlan
                        ? (es ? `Publicada en simulación · v${publication.published.version}` : `Published in simulation · v${publication.published.version}`)
                        : publication.draft && isQuestionnairePlan
                        ? (es ? `Borrador v${publication.draft.version} · revisión pendiente` : `Draft v${publication.draft.version} · review pending`)
                        : generationPassed
                          ? (es ? 'Pendiente de revisión humana' : 'Pending human review')
                          : (es ? 'No disponible' : 'Unavailable')}
                  </strong>
                </div>
              </div>
            </div>

            <section>
              <span>{es ? 'Cálculo energético sintético' : 'Synthetic energy calculation'}</span>
              <h2>{plan.profile.calorieTarget.toLocaleString()} kcal</h2>
              <dl>
                <div><dt>{es ? 'Datos utilizados' : 'Inputs used'}</dt><dd>{plan.profile.energyInputs.ageYears} {es ? 'años' : 'years'} · {pounds(plan.profile.energyInputs.currentWeightKg)} lb · {plan.profile.energyInputs.heightCm} cm</dd></div>
                <div><dt>{es ? 'Actividad' : 'Activity'}</dt><dd>{activityLabel(plan.profile.energyInputs.activityLevel, es)}</dd></div>
                <div><dt>{es ? 'Mantenimiento estimado' : 'Estimated maintenance'}</dt><dd>{plan.energyEstimate.maintenanceCalories.toLocaleString()} kcal</dd></div>
                <div><dt>{es ? 'Déficit aplicado' : 'Applied deficit'}</dt><dd>{plan.energyEstimate.appliedDeficitCalories} kcal · {plan.energyEstimate.deficitPercent}%</dd></div>
                <div><dt>{es ? 'Proteína para revisión' : 'Protein review range'}</dt><dd>{plan.energyEstimate.proteinFloorG}–{plan.energyEstimate.proteinCeilingG} g/día</dd></div>
              </dl>
            </section>

            {coverageGap ? (
              <div className={styles.coverageNote}>
                <span>{es ? 'Cobertura piloto' : 'Pilot coverage'}</span>
                <strong>{SLOT_LABEL[coverageGap.slot][lang]}: {coverageGap.options.length} {es ? 'de 3 opciones disponibles' : 'of 3 choices available'}</strong>
                <p>{es ? 'La prueba muestra la limitación; no inventa una tercera opción.' : 'The test shows the limitation; it does not invent a third choice.'}</p>
              </div>
            ) : null}

            <section>
              <span>{es ? 'Cápsula semanal' : 'Weekly capsule'}</span>
              <h2>{plan.groups.reduce((total, group) => total + group.options.length, 0)} {es ? 'recetas activas' : 'active recipes'}</h2>
              <dl>
                <div><dt>{es ? 'Horizonte' : 'Horizon'}</dt><dd>{es ? '7 días' : '7 days'}</dd></div>
                <div><dt>{es ? 'Por horario' : 'Per meal slot'}</dt><dd>{es ? 'Máximo 3' : 'Maximum 3'}</dd></div>
                <div><dt>{es ? 'Lista de compra' : 'Grocery list'}</dt><dd>{es ? 'Sólo usos repetidos' : 'Repeated uses only'}</dd></div>
              </dl>
            </section>

            <section>
              <span>{es ? 'Sobre de compatibilidad' : 'Compatibility envelope'}</span>
              <h2>{plan.envelope.passes
                ? (es ? `${combinationCount} de ${combinationCount} combinaciones compatibles` : `${combinationCount} of ${combinationCount} compatible combinations`)
                : (es ? 'Generación detenida' : 'Generation stopped')}</h2>
              <dl>
                <div><dt>{es ? 'Energía posible' : 'Possible energy'}</dt><dd>{plan.groups.length > 0 ? `${plan.envelope.minCalories}–${plan.envelope.maxCalories} kcal` : '—'}</dd></div>
                <div><dt>{es ? 'Rango permitido' : 'Allowed range'}</dt><dd>{plan.envelope.calorieFloor}–{plan.envelope.calorieCeiling} kcal</dd></div>
                <div><dt>{es ? 'Máximo de carbos' : 'Maximum carbs'}</dt><dd>{plan.groups.length > 0 ? `${plan.envelope.maxNetCarbsG}/${plan.envelope.carbCeilingG} g` : `—/${plan.envelope.carbCeilingG} g`}</dd></div>
                <div><dt>{es ? 'Proteína posible' : 'Possible protein'}</dt><dd>{plan.groups.length > 0 ? `${plan.envelope.minProteinG}–${plan.envelope.maxProteinG} g` : '—'}</dd></div>
              </dl>
            </section>

            <section>
              <span>{es ? 'Reglas aplicadas' : 'Applied rules'}</span>
              <ul className={styles.ruleList}>
                <li>{es ? 'Seguridad antes que preferencias' : 'Safety before preferences'}</li>
                <li>{es ? 'Máximo 3 opciones por comida' : 'Maximum 3 choices per meal'}</li>
                <li>{es ? 'Favoritas priorizadas; “No repetir” no equivale a alergia' : 'Favorites prioritized; “Do not repeat” is not an allergy'}</li>
                <li>{es ? 'Ingredientes de compra utilizados en 2 o más comidas' : 'Grocery ingredients used in 2 or more meals'}</li>
                <li>{es ? 'Máximo 2 complementos' : 'Maximum 2 complements'}</li>
                <li>{es ? 'Sin repetición forzada de familias' : 'No forced family repetition'}</li>
                <li>{es ? 'Sin techo artificial de 2,000 kcal' : 'No artificial 2,000 kcal ceiling'}</li>
                <li>{es ? 'Déficit controlado de 500–750 kcal' : 'Controlled 500–750 kcal deficit'}</li>
              </ul>
            </section>

            {isQuestionnairePlan ? (
              <div className={styles.publicationActions} data-testid="synthetic-publication-controls">
                <div className={styles.publicationHeading}>
                  <span>{es ? 'Flujo de publicación sintético' : 'Synthetic publishing workflow'}</span>
                  <strong>{hasUnpublishedDraft
                    ? (es
                      ? `Borrador v${publication.draft?.version} · publicada v${publication.published?.version ?? '—'} activa`
                      : `Draft v${publication.draft?.version} · published v${publication.published?.version ?? '—'} active`)
                    : publication.published
                      ? (es ? `Publicado v${publication.published.version}` : `Published v${publication.published.version}`)
                      : publication.draft
                      ? (es ? `Borrador v${publication.draft.version}` : `Draft v${publication.draft.version}`)
                      : (es ? 'Sin guardar' : 'Not saved')}</strong>
                </div>
                <dl className={styles.workflowIdentity}>
                  <div><dt>{es ? 'Cliente vinculado' : 'Linked client'}</dt><dd>{publication.client.displayName}</dd></div>
                  <div><dt>ID sintético</dt><dd>{publication.client.id}</dd></div>
                </dl>
                <button
                  type="button"
                  className={styles.draftAction}
                  disabled={!generationPassed || draftMatchesCurrentPlan}
                  onClick={saveCurrentSyntheticDraft}
                >
                  {publication.draft
                    ? (es ? `Guardar como borrador v${publication.draft.version + 1}` : `Save as draft v${publication.draft.version + 1}`)
                    : (es ? 'Guardar borrador sintético' : 'Save synthetic draft')}
                </button>
                <label className={styles.reviewConfirmation}>
                  <input
                    type="checkbox"
                    checked={reviewConfirmed}
                    disabled={!hasUnpublishedDraft || !draftMatchesCurrentPlan}
                    onChange={event => setPublication(current => confirmSyntheticReview(current, event.target.checked))}
                  />
                  <span>{es
                    ? 'Confirmo que revisé calorías, exclusiones y la señal de medicamentos.'
                    : 'I confirm that I reviewed calories, exclusions, and the medication flag.'}</span>
                </label>
                <button
                  type="button"
                  className={styles.publishAction}
                  disabled={!canPublishSyntheticDraft(publication) || !draftMatchesCurrentPlan}
                  onClick={publishCurrentSyntheticDraft}
                >
                  {canPublishSyntheticDraft(publication)
                    ? (publication.published
                      ? (es ? `Publicar v${publication.draft?.version} y reemplazar v${publication.published.version}` : `Publish v${publication.draft?.version} and replace v${publication.published.version}`)
                      : (es ? 'Simular aprobación y publicación' : 'Simulate approval and publishing'))
                    : publication.published && !hasUnpublishedDraft
                      ? (es ? `Versión v${publication.published.version} publicada` : `Version v${publication.published.version} published`)
                      : (es ? 'Revisión humana requerida' : 'Human review required')}
                </button>
                {publication.review ? (
                  <div className={styles.reviewRecord}>
                    <span>{es ? 'Revisión registrada' : 'Review recorded'}</span>
                    <strong>{publication.review.reviewer.displayName}</strong>
                    <small>{workflowDate(publication.review.reviewedAt, lang)} · v{publication.review.draftVersion}</small>
                  </div>
                ) : null}
                {publication.publishedVersions.length > 0 ? (
                  <div className={styles.versionHistory}>
                    <span>{es ? 'Historial conservado' : 'Preserved history'}</span>
                    {[...publication.publishedVersions].reverse().map(version => (
                      <article key={version.version}>
                        <div>
                          <strong>v{version.version} {version.version === publication.published?.version
                            ? (es ? '· Activa' : '· Active')
                            : (es ? '· Reemplazada' : '· Replaced')}</strong>
                          <small>{workflowDate(version.publishedAt, lang)} · {version.publishedBy.displayName}</small>
                        </div>
                        <button type="button" onClick={() => openSyntheticExperience('published', version)}>
                          {es ? 'Abrir' : 'Open'}
                        </button>
                      </article>
                    ))}
                  </div>
                ) : null}
                {publication.auditTrail.length > 0 ? (
                  <details className={styles.auditTrail}>
                    <summary>{es ? `Ver bitácora (${publication.auditTrail.length})` : `View audit trail (${publication.auditTrail.length})`}</summary>
                    <ol>
                      {publication.auditTrail.map(event => (
                        <li key={event.id}>
                          <strong>{event.type === 'draft_saved'
                            ? (es ? 'Borrador guardado' : 'Draft saved')
                            : event.type === 'review_confirmed'
                              ? (es ? 'Revisión confirmada' : 'Review confirmed')
                              : (es ? 'Versión publicada' : 'Version published')}</strong>
                          <span>v{event.version} · {event.actor.displayName} · {workflowDate(event.at, lang)}</span>
                        </li>
                      ))}
                    </ol>
                  </details>
                ) : null}
                <p>{es
                  ? `Simulación en memoria por ${SYNTHETIC_REVIEWER.displayName}: no escribe en Airtable, no llega a clientes y se reinicia al refrescar.`
                  : `In-memory simulation by ${SYNTHETIC_REVIEWER.displayName}: it does not write to Airtable, reach clients, and resets on refresh.`}</p>
              </div>
            ) : (
              <div className={styles.disabledActions}>
                <button type="button" disabled>{es ? 'Guardar borrador' : 'Save draft'}</button>
                <button type="button" disabled>{es ? 'Aprobar y publicar' : 'Approve and publish'}</button>
                <p>{es
                  ? 'Controles desconectados: esta etapa no escribe en Airtable ni publica a usuarios.'
                  : 'Disconnected controls: this stage neither writes to Airtable nor publishes to users.'}</p>
              </div>
            )}
          </aside>
        </div>

        <RecipeDetailDialog option={openRecipe} language={lang} context="review" onClose={() => setOpenRecipe(null)} />
      </div>

      {showTemporaryExperience && isQuestionnairePlan && experienceSnapshot ? (
        <div className={styles.temporaryExperienceOverlay} role="dialog" aria-modal="true" aria-labelledby="temporary-experience-title">
          <header className={styles.temporaryExperienceHeader}>
            <div>
              <span>{experienceMode === 'published'
                ? (es
                  ? `Versión publicada simulada · v${experienceSnapshot.version}`
                  : `Simulated published version · v${experienceSnapshot.version}`)
                : (es
                  ? `Vista previa del borrador · v${experienceSnapshot.version}`
                  : `Draft preview · v${experienceSnapshot.version}`)}</span>
              <strong id="temporary-experience-title">{experienceMode === 'published'
                ? (es ? 'Así recibiría el cliente esta versión' : 'How the client would receive this version')
                : (es ? 'Revisión del borrador antes de publicar' : 'Draft review before publishing')}</strong>
            </div>
            <button type="button" onClick={() => setShowTemporaryExperience(false)} aria-label={es ? 'Cerrar experiencia temporal' : 'Close temporary experience'}>
              ×
            </button>
          </header>
          <main className={styles.temporaryExperienceBody}>
            <GuidedPlanExperience
              plan={experienceSnapshot.plan}
              language={lang}
              guidePath="/my-aqslim/demo/materials"
              persistPreferences={false}
              showGuideActions={false}
            />
          </main>
        </div>
      ) : null}
    </DashboardShell>
  )
}
