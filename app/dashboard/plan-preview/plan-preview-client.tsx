'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { GuidedPlan, MealSlot } from '@/lib/nutrition/types'
import { DashboardShell } from '../dashboard-shell'
import styles from './plan-preview.module.css'

const SLOT_LABEL: Record<MealSlot, { es: string; en: string }> = {
  first_meal: { es: 'Primera comida', en: 'First meal' },
  lunch: { es: 'Comida', en: 'Lunch' },
  dinner: { es: 'Cena', en: 'Dinner' },
}

type Props = {
  user: { firstName: string | null; lastName: string | null } | null
  plan: GuidedPlan
  recipeVariantCount: number
  componentCount: number
}

export function PlanPreviewClient({ user, plan, recipeVariantCount, componentCount }: Props) {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const es = lang === 'es'
  const combinationCount = useMemo(
    () => plan.groups.reduce((total, group) => total * group.options.length, 1),
    [plan.groups],
  )

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      <div className={styles.page}>
        <header className={styles.intro}>
          <div>
            <div className={styles.kicker}>{es ? 'MYAQ-001-REC-001 · Preview aislado' : 'MYAQ-001-REC-001 · Isolated Preview'}</div>
            <h1>{es ? 'Constructor de planes' : 'Plan builder'}</h1>
            <p>{es
              ? 'Revisión humana de libertad guiada. Todos los datos de esta pantalla son sintéticos.'
              : 'Human review for guided freedom. All data on this screen is synthetic.'}</p>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.syntheticBadge}>{es ? 'Datos sintéticos' : 'Synthetic data'}</span>
            <Link href="/my-aqslim/demo/plan" className={styles.previewLink}>{es ? 'Abrir vista del cliente ↗' : 'Open client view ↗'}</Link>
          </div>
        </header>

        <section className={styles.summaryGrid}>
          <article className={styles.profileCard}>
            <span>{es ? 'Perfil de prueba' : 'Test profile'}</span>
            <strong>{plan.profile.firstName}</strong>
            <small>{plan.profile.phase} · {plan.profile.mealSlots.length} {es ? 'comidas' : 'meals'} · {plan.profile.calorieTarget.toLocaleString()} kcal</small>
          </article>
          <article>
            <span>{es ? 'Biblioteca activa' : 'Active library'}</span>
            <strong>{recipeVariantCount}</strong>
            <small>{es ? 'variantes calculadas' : 'calculated variants'}</small>
          </article>
          <article>
            <span>{es ? 'Componentes' : 'Components'}</span>
            <strong>{componentCount}</strong>
            <small>{es ? 'complementos sintéticos' : 'synthetic complements'}</small>
          </article>
          <article>
            <span>{es ? 'Combinaciones diarias' : 'Daily combinations'}</span>
            <strong>{combinationCount}</strong>
            <small>{es ? 'todas validadas' : 'all validated'}</small>
          </article>
        </section>

        <div className={styles.workspace}>
          <main className={styles.groups}>
            {plan.groups.map(group => (
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
            ))}
          </main>

          <aside className={styles.inspector}>
            <div className={styles.statusCard}>
              <span className={styles.statusDot} />
              <div>
                <small>{es ? 'Estado del plan' : 'Plan status'}</small>
                <strong>{es ? 'Listo para revisión humana' : 'Ready for human review'}</strong>
              </div>
            </div>

            <section>
              <span>{es ? 'Sobre de compatibilidad' : 'Compatibility envelope'}</span>
              <h2>{plan.envelope.passes ? (es ? 'Todas pasan' : 'All pass') : (es ? 'Requiere ajustes' : 'Needs changes')}</h2>
              <dl>
                <div><dt>{es ? 'Energía posible' : 'Possible energy'}</dt><dd>{plan.envelope.minCalories}–{plan.envelope.maxCalories} kcal</dd></div>
                <div><dt>{es ? 'Rango permitido' : 'Allowed range'}</dt><dd>{plan.envelope.calorieFloor}–{plan.envelope.calorieCeiling} kcal</dd></div>
                <div><dt>{es ? 'Máximo de carbos' : 'Maximum carbs'}</dt><dd>{plan.envelope.maxNetCarbsG}/{plan.envelope.carbCeilingG} g</dd></div>
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
