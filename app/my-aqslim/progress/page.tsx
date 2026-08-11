import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPatientPortalData } from '@/lib/patient-portal'
import {
  BuddyIcon,
  BuildingIcon,
  CalendarIcon,
  ChevronIcon,
  InfoIcon,
  ProgressIcon,
} from '../portal-icons'
import { OpenBuddyButton } from '../open-buddy-button'
import { PortalShell } from '../portal-shell'
import styles from '../portal.module.css'
import { ProgressChart } from './progress-chart'

function formatDate(value: string | null, language: 'es' | 'en', includeYear = true) {
  if (!value) return language === 'es' ? 'Por confirmar' : 'To be confirmed'
  return new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    year: includeYear ? 'numeric' : undefined,
  }).format(new Date(value))
}

function formatWeight(value: number | null, unit: 'lb' | 'kg') {
  if (value === null) return '—'
  return `${Math.round(value * 10) / 10} ${unit}`
}

export default async function ProgressPage() {
  const data = await getPatientPortalData()
  if (!data) redirect('/onboarding')

  const es = data.language === 'es'
  const first = data.measurements[0] ?? null
  const latest = data.measurements.at(-1) ?? null
  const change = data.totalChange === null
    ? '—'
    : `${data.totalChange > 0 ? '+' : '−'}${Math.abs(Math.round(data.totalChange * 10) / 10)} ${data.unit}`
  const percent = data.percentChange === null ? '—' : `${data.percentChange.toFixed(1)}%`
  const daysSinceStart = first ? Math.floor((Date.now() - Date.parse(first.date)) / 86_400_000) : 0
  const poundsLost = data.totalChange !== null && data.totalChange < 0
    ? Math.abs(data.unit === 'lb' ? data.totalChange : data.totalChange * 2.2046226218)
    : 0

  return (
    <PortalShell firstName={data.firstName} initialLanguage={data.language}>
      <section className={styles.progressHeader}>
        <div>
          <h1>{es ? 'Mi Progreso' : 'My Progress'}</h1>
          <p>{es ? 'Tu evolución hacia tu mejor versión.' : 'Your journey toward your best self.'}</p>
        </div>
        <a href="#historial" className={styles.outlineButton}>
          {es ? 'Ver historial completo' : 'View full history'} <ChevronIcon />
        </a>
      </section>

      <section className={`${styles.panel} ${styles.progressHero}`}>
        <div className={styles.progressMetric}>
          <span>{es ? 'Peso inicial' : 'Starting weight'}</span>
          <strong>{formatWeight(data.initialWeight, data.unit)}</strong>
          <small>{formatDate(first?.date ?? null, data.language)}</small>
        </div>
        <div className={styles.changeRing} style={{ '--ring': `${Math.min(data.percentChange ?? 0, 100) * 3.6}deg` } as React.CSSProperties}>
          <strong>{change}</strong>
          <span>{es ? 'Cambio total' : 'Total change'}</span>
        </div>
        <div className={styles.progressMetric}>
          <span>{es ? 'Peso actual' : 'Current weight'}</span>
          <strong>{formatWeight(data.currentWeight, data.unit)}</strong>
          <small>{formatDate(latest?.date ?? null, data.language)}</small>
          <b>{percent}</b>
          <em>{es ? 'de tu peso inicial' : 'of starting weight'}</em>
        </div>
      </section>

      <section id="tendencia" className={`${styles.panel} ${styles.chartPanel}`}>
        <div className={styles.sectionHeading}>
          <h2>{es ? 'Tendencia de peso' : 'Weight trend'}</h2>
          <span>{es ? 'Últimas mediciones' : 'Latest measurements'}</span>
        </div>
        <ProgressChart measurements={data.measurements} language={data.language} unit={data.unit} />
        <p className={styles.encouragement}>
          <span aria-hidden="true">↓</span>
          {data.totalChange !== null && data.totalChange <= 0
            ? (es ? 'Vas muy bien. ¡Sigue enfocado!' : 'You are doing great. Stay focused!')
            : (es ? 'Cada medición ayuda a entender tu camino.' : 'Every measurement helps show your journey.')}
        </p>
      </section>

      <section className={`${styles.panel} ${styles.latestMeasurement}`}>
        <p className={styles.eyebrow}>{es ? 'Última medición' : 'Latest measurement'}</p>
        <div className={styles.measurementBody}>
          <div className={styles.roundIcon}><BuildingIcon /></div>
          <div className={styles.measurementValue}>
            <strong>{formatWeight(data.currentWeight, data.unit)}</strong>
            <span>{formatDate(latest?.date ?? null, data.language)}</span>
            <b>{latest?.source ?? (es ? 'Origen no disponible' : 'Source unavailable')}</b>
          </div>
          <div className={styles.sourceText}>
            <span>{es ? 'Registrado en tu consulta con el equipo AQSLIM.' : 'Recorded during your consultation with the AQSLIM team.'}</span>
            <b><i />{es ? 'Dato verificado' : 'Verified data'}</b>
          </div>
        </div>
      </section>

      <section className={`${styles.panel} ${styles.actionsPanel}`}>
        <p className={styles.eyebrow}>{es ? 'Acciones disponibles' : 'Available actions'}</p>
        <div className={styles.actionGrid}>
          <a href="#historial"><ProgressIcon /><span>{es ? 'Ver historial de mediciones' : 'View measurement history'}</span></a>
          <a href="#tendencia"><ProgressIcon /><span>{es ? 'Ver tendencia detallada' : 'View detailed trend'}</span></a>
          <span><CalendarIcon /><span>{es ? 'Próxima revisión' : 'Next review'}<b>{formatDate(data.nextReview, data.language, false)}</b></span></span>
          <OpenBuddyButton label={es ? 'Pregúntale a AQ Buddy' : 'Ask AQ Buddy'} />
        </div>
      </section>

      <section className={`${styles.panel} ${styles.achievements}`}>
        <p className={styles.eyebrow}>{es ? 'Tus logros' : 'Your achievements'}</p>
        <div className={styles.achievementGrid}>
          <div className={daysSinceStart >= 7 ? styles.achievementDone : ''}><span>★</span><p>{es ? 'Primera semana' : 'First week'}<small>{daysSinceStart >= 7 ? (es ? '¡Completada!' : 'Completed!') : (es ? 'En progreso' : 'In progress')}</small></p></div>
          <div className={poundsLost >= 5 ? styles.achievementDone : ''}><span>★</span><p>{es ? 'Primeras 5 lb' : 'First 5 lb'}<small>{poundsLost >= 5 ? (es ? '¡Logrado!' : 'Achieved!') : (es ? 'En progreso' : 'In progress')}</small></p></div>
          <div className={(data.goalProgress ?? 0) >= 100 ? styles.achievementDone : ''}><span>★</span><p>{es ? 'Tu meta personal' : 'Your personal goal'}<small>{data.goalProgress !== null ? `${Math.round(data.goalProgress)}%` : (es ? 'Por definir' : 'To be defined')}</small></p></div>
        </div>
      </section>

      <section id="historial" className={`${styles.panel} ${styles.historyPanel}`}>
        <div className={styles.sectionHeading}>
          <h2>{es ? 'Historial de mediciones' : 'Measurement history'}</h2>
          <span>{data.measurements.length}</span>
        </div>
        {data.measurements.length ? (
          <div className={styles.historyRows}>
            {[...data.measurements].reverse().map(measurement => (
              <div key={measurement.id}>
                <span>{formatDate(measurement.date, data.language)}</span>
                <strong>{formatWeight(measurement.weight, data.unit)}</strong>
                <small><BuildingIcon />{measurement.source}</small>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyHistory}>{es ? 'Todavía no hay mediciones disponibles.' : 'No measurements are available yet.'}</p>
        )}
      </section>

      <div className={styles.dataNotice}>
        <InfoIcon />
        <p>{es ? 'La información mostrada proviene de fuentes autorizadas de AQSLIM.' : 'The information shown comes from authorized AQSLIM sources.'}</p>
        <Link href="/my-aqslim">{es ? 'Volver al inicio' : 'Back home'}</Link>
      </div>
    </PortalShell>
  )
}
