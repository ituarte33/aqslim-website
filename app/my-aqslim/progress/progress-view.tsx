'use client'

import Link from 'next/link'
import type { PatientPortalData } from '@/lib/patient-portal'
import {
  BuddyIcon,
  BuildingIcon,
  CalendarIcon,
  ChevronIcon,
  InfoIcon,
  ProgressIcon,
} from '../portal-icons'
import { PortalShell } from '../portal-shell'
import { usePortalLanguage } from '../use-portal-language'
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

function formatSource(source: string | undefined, language: 'es' | 'en', demo: boolean) {
  if (!source) return language === 'es' ? 'Origen no disponible' : 'Source unavailable'
  if (demo && source === 'AQSLIM (Consulta)') {
    return language === 'es' ? source : 'AQSLIM (Consultation)'
  }
  return source
}

type ProgressViewProps = {
  data: PatientPortalData
  demo?: boolean
}

export function ProgressView({ data, demo = false }: ProgressViewProps) {
  const [language] = usePortalLanguage(data.language, data.clienteId)
  const es = language === 'es'
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
    <PortalShell firstName={data.firstName} profileId={data.clienteId} initialLanguage={data.language} demo={demo}>
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
          <small>{formatDate(first?.date ?? null, language)}</small>
        </div>
        <div className={styles.changeRing} style={{ '--ring': `${Math.min(data.percentChange ?? 0, 100) * 3.6}deg` } as React.CSSProperties}>
          <strong>{change}</strong>
          <span>{es ? 'Cambio total' : 'Total change'}</span>
        </div>
        <div className={styles.progressMetric}>
          <span>{es ? 'Peso actual' : 'Current weight'}</span>
          <strong>{formatWeight(data.currentWeight, data.unit)}</strong>
          <small>{formatDate(latest?.date ?? null, language)}</small>
          <b>{percent}</b>
          <em>{es ? 'de tu peso inicial' : 'of starting weight'}</em>
        </div>
      </section>

      <section id="tendencia" className={`${styles.panel} ${styles.chartPanel}`}>
        <div className={styles.sectionHeading}>
          <h2>{es ? 'Tendencia de peso' : 'Weight trend'}</h2>
          <span>{es ? 'Últimas mediciones' : 'Latest measurements'}</span>
        </div>
        <ProgressChart measurements={data.measurements} language={language} unit={data.unit} />
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
            <span>{formatDate(latest?.date ?? null, language)}</span>
            <b>{formatSource(latest?.source, language, demo)}</b>
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
          <span><CalendarIcon /><span>{es ? 'Próxima revisión' : 'Next review'}<b>{formatDate(data.nextReview, language, false)}</b></span></span>
          <Link href={demo ? '/my-aqslim/demo/buddy' : '/my-aqslim/buddy'} className={styles.buddyAction}><BuddyIcon /><span>{es ? 'Pregúntale a AQ Buddy' : 'Ask AQ Buddy'}</span></Link>
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
                <span>{formatDate(measurement.date, language)}</span>
                <strong>{formatWeight(measurement.weight, data.unit)}</strong>
                <small><BuildingIcon />{formatSource(measurement.source, language, demo)}</small>
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
        <Link href={demo ? '/my-aqslim/demo' : '/my-aqslim'}>{es ? 'Volver al inicio' : 'Back home'}</Link>
      </div>
    </PortalShell>
  )
}
