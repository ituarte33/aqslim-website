'use client'

import Link from 'next/link'
import { PilotFeedback } from '@/app/pilot-feedback'
import type { Fast36Status } from '@/lib/fast36-policy'
import type { WeeklySummaryData } from '@/lib/weekly-summary'
import { usePortalLanguage } from '../../use-portal-language'
import styles from './weekly-summary.module.css'

const FAST36_LABELS: Record<Fast36Status, { es: string; en: string }> = {
  pending: { es: 'Programado', en: 'Scheduled' },
  active: { es: 'Activo', en: 'Active' },
  completed: { es: 'Completado y registrado', en: 'Completed and recorded' },
  ended_early: { es: 'Terminado antes', en: 'Ended early' },
  stopped_for_safety: { es: 'Interrumpido por seguridad', en: 'Stopped for safety' },
}

function formatRange(start: string, end: string, language: 'es' | 'en') {
  const locale = language === 'es' ? 'es-MX' : 'en-US'
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' }
  return `${new Intl.DateTimeFormat(locale, options).format(new Date(`${start}T12:00:00Z`))} — ${new Intl.DateTimeFormat(locale, options).format(new Date(`${end}T12:00:00Z`))}`
}

function shortDay(date: string, language: 'es' | 'en') {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`)).replace('.', '')
}

export function WeeklySummaryView({
  firstName,
  profileId,
  phase,
  initialLanguage,
  summary,
}: {
  firstName: string
  profileId: string
  phase: string | null
  initialLanguage: 'es' | 'en'
  summary: WeeklySummaryData
}) {
  const [language] = usePortalLanguage(initialLanguage, profileId)
  const es = language === 'es'
  const maxCarbs = Math.max(1, ...summary.days.map(day => day.carbs))
  const facts = buildFacts(summary, language)
  const review = buildReviewItems(summary, language)

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/my-aqslim/pilot" className={styles.back}>← {es ? 'Panel' : 'Dashboard'}</Link>
        <span className={styles.brand}>AQ<span>SLIM</span> · {es ? 'MI SEMANA' : 'MY WEEK'}</span>
      </header>

      <div className={styles.content}>
        <p className={styles.eyebrow}>{formatRange(summary.startDate, summary.endDate, language)} · {firstName.toUpperCase()}</p>
        <h1>{es ? 'Tu semana, en una sola vista.' : 'Your week, in one view.'}</h1>
        <p className={styles.lead}>
          {es
            ? 'Este resumen usa únicamente lo que registraste en MY AQSLIM. Te ayuda a observar patrones sin convertir datos incompletos en conclusiones.'
            : 'This summary uses only what you logged in MY AQSLIM. It helps you notice patterns without turning incomplete data into conclusions.'}
        </p>

        <section className={styles.metrics} aria-label={es ? 'Métricas de la semana' : 'Weekly metrics'}>
          <Metric value={String(summary.confirmedMeals)} label={es ? 'Comidas confirmadas' : 'Confirmed meals'} />
          <Metric value={`${summary.daysWithConfirmedMeals}/${summary.daysElapsed}`} label={es ? 'Días con registro' : 'Days with logs'} />
          <Metric value={`${summary.totalCarbs}g`} label={es ? 'Carbos registrados' : 'Logged carbs'} accent />
          <Metric value={String(summary.unconfirmed)} label={es ? 'Escaneos por confirmar' : 'Scans to confirm'} warn={summary.unconfirmed > 0} />
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div><small>{es ? 'REGISTRO POR DÍA' : 'LOGS BY DAY'}</small><h2>{es ? 'Lo que quedó confirmado' : 'What was confirmed'}</h2></div>
            <span>{es ? 'Carbos aproximados' : 'Approximate carbs'}</span>
          </div>
          <div className={styles.chart}>
            {summary.days.map(day => (
              <div key={day.date} className={`${styles.day}${day.isFuture ? ` ${styles.future}` : ''}`}>
                <div className={styles.barTrack}>
                  <span style={{ height: `${day.carbs ? Math.max(8, day.carbs / maxCarbs * 100) : 0}%` }} />
                </div>
                <strong>{day.carbs ? `${day.carbs}g` : '—'}</strong>
                <small>{shortDay(day.date, language)}</small>
                <em>{day.isFuture ? '·' : day.mealCount}</em>
              </div>
            ))}
          </div>
          <p className={styles.chartNote}>{es ? 'El número inferior indica comidas confirmadas. Los días futuros aparecen atenuados.' : 'The lower number is confirmed meals. Future days are dimmed.'}</p>
        </section>

        <div className={styles.twoColumns}>
          <section className={styles.panel}>
            <div className={styles.panelHeading}><div><small>{es ? 'LECTURA OBJETIVA' : 'OBJECTIVE READOUT'}</small><h2>{es ? 'Lo que muestran tus registros' : 'What your logs show'}</h2></div></div>
            <ul className={styles.factList}>{facts.map(fact => <li key={fact}>{fact}</li>)}</ul>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeading}><div><small>{es ? 'SIGUIENTE PASO' : 'NEXT STEP'}</small><h2>{es ? 'Para revisar' : 'To review'}</h2></div></div>
            <ul className={styles.reviewList}>{review.map(item => <li key={item}>{item}</li>)}</ul>
          </section>
        </div>

        <section className={styles.contextStrip}>
          <div><small>{es ? 'FASE REGISTRADA' : 'RECORDED PHASE'}</small><strong>{phase || (es ? 'Por confirmar' : 'Pending confirmation')}</strong></div>
          <div><small>FAST 36</small><strong>{summary.fast36 ? `${es ? 'Semana' : 'Week'} ${summary.fast36.week} · ${FAST36_LABELS[summary.fast36.status][language]}` : (es ? 'Sin sesión esta semana' : 'No session this week')}</strong></div>
        </section>

        <div className={styles.actions}>
          <Link href="/food-scanner">{es ? 'Abrir mis comidas' : 'Open my meals'} →</Link>
          {summary.fast36 ? <Link href="/my-aqslim/pilot/fast-36">{es ? 'Abrir Fast 36' : 'Open Fast 36'} →</Link> : null}
        </div>

        <aside className={styles.disclaimer}>
          <strong>{es ? 'Cómo interpretar este resumen' : 'How to read this summary'}</strong>
          <span>{es
            ? 'Solo cuenta comidas marcadas como consumidas. Las estimaciones pueden variar por porción e ingredientes; un día sin registro no significa que no comiste. Este resumen no modifica tu fase ni sustituye la revisión de AQSLIM.'
            : 'Only meals marked as consumed are counted. Estimates may vary by serving and ingredients; a day without a log does not mean you did not eat. This summary does not change your phase or replace an AQSLIM review.'}</span>
        </aside>

        <PilotFeedback
          tool="My AQSLIM"
          language={language}
          context={{ surface: 'weekly_summary', period: { start: summary.startDate, end: summary.endDate }, counts: { confirmed: summary.confirmedMeals, unconfirmed: summary.unconfirmed } }}
          standalone
        />
      </div>
    </main>
  )
}

function Metric({ value, label, accent = false, warn = false }: { value: string; label: string; accent?: boolean; warn?: boolean }) {
  return <div><strong className={accent ? styles.accent : warn ? styles.warn : ''}>{value}</strong><span>{label}</span></div>
}

function buildFacts(summary: WeeklySummaryData, language: 'es' | 'en'): string[] {
  const es = language === 'es'
  const facts = summary.confirmedMeals > 0
    ? [
        es ? `${summary.confirmedMeals} comida(s) confirmada(s) en ${summary.daysWithConfirmedMeals} día(s).` : `${summary.confirmedMeals} confirmed meal(s) across ${summary.daysWithConfirmedMeals} day(s).`,
        es ? `${summary.totalCalories} kcal y ${summary.totalCarbs} g de carbohidratos registrados; son estimaciones, no el consumo total de la semana.` : `${summary.totalCalories} kcal and ${summary.totalCarbs} g of logged carbohydrates; these are estimates, not the week's total intake.`,
        es ? `Promedio de ${summary.averageCarbsPerMeal} g de carbohidratos por comida confirmada.` : `Average of ${summary.averageCarbsPerMeal} g of carbohydrates per confirmed meal.`,
      ]
    : [es ? 'Aún no hay comidas confirmadas esta semana.' : 'There are no confirmed meals this week yet.']
  if (summary.referenceOnly > 0) facts.push(es ? `${summary.referenceOnly} escaneo(s) se guardaron solo como referencia.` : `${summary.referenceOnly} scan(s) were saved for reference only.`)
  if (summary.fast36) facts.push(es ? `Fast 36 está documentado como “${FAST36_LABELS[summary.fast36.status].es}”.` : `Fast 36 is documented as “${FAST36_LABELS[summary.fast36.status].en}.”`)
  return facts
}

function buildReviewItems(summary: WeeklySummaryData, language: 'es' | 'en'): string[] {
  const es = language === 'es'
  const items: string[] = []
  if (summary.unconfirmed > 0) items.push(es ? `Confirma o marca como referencia ${summary.unconfirmed} escaneo(s) pendiente(s).` : `Confirm or mark ${summary.unconfirmed} pending scan(s) as reference.`)
  if (summary.confirmedMeals === 0) items.push(es ? 'Registra y confirma una comida para comenzar a formar el resumen.' : 'Log and confirm a meal to start building the summary.')
  else if (summary.daysWithConfirmedMeals < summary.daysElapsed) items.push(es ? 'Si deseas una vista más completa, registra las comidas principales de los días restantes.' : 'For a more complete view, log the main meals on the remaining days.')
  if (summary.fast36?.status === 'ended_early' || summary.fast36?.status === 'stopped_for_safety') items.push(es ? 'Comenta con AQSLIM cómo terminó esta sesión Fast 36.' : 'Discuss with AQSLIM how this Fast 36 session ended.')
  if (!items.length) items.push(es ? 'Continúa registrando con naturalidad; no necesitas llenar datos retrospectivamente.' : 'Keep logging naturally; you do not need to backfill data.')
  return items
}
