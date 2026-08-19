'use client'

import Link from 'next/link'
import type { PatientPortalData } from '@/lib/patient-portal'
import { CalendarIcon, ChevronIcon, InfoIcon, PlanIcon } from '../portal-icons'
import { PortalShell } from '../portal-shell'
import { usePortalLanguage } from '../use-portal-language'
import styles from '../portal.module.css'

function formatDate(value: string | null, language: 'es' | 'en') {
  if (!value) return language === 'es' ? 'Por confirmar' : 'To be confirmed'
  return new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

type PlanViewProps = {
  data: PatientPortalData
  demo?: boolean
}

export function PlanView({ data, demo = false }: PlanViewProps) {
  const [language] = usePortalLanguage(data.language, data.clienteId)
  const es = language === 'es'
  const phase = data.phase || (es ? 'Por confirmar' : 'To be confirmed')
  const week = data.weekInPhase
  const buddyPath = demo ? '/my-aqslim/demo/buddy' : '/my-aqslim/buddy'
  const materialsPath = demo ? '/my-aqslim/demo/materials' : '/my-aqslim/materials'

  return (
    <PortalShell firstName={data.firstName} profileId={data.clienteId} initialLanguage={data.language} demo={demo}>
      <section className={styles.pageIntro}>
        <div>
          <h1>{es ? 'Mi Plan' : 'My Plan'}</h1>
          <p>{es ? 'Tu camino actual, organizado paso a paso.' : 'Your current path, organized step by step.'}</p>
        </div>
      </section>

      <section className={`${styles.panel} ${styles.planHero}`}>
        <div className={styles.phaseSeal} aria-hidden="true">
          <span>{phase.slice(0, 1).toUpperCase()}</span>
          <small>MY AQSLIM</small>
        </div>
        <div>
          <p className={styles.eyebrow}>{es ? 'Tu fase actual' : 'Your current phase'}</p>
          <h2>{phase}</h2>
          <p>{week ? `${es ? 'Semana' : 'Week'} ${week}` : (es ? 'Semana por confirmar' : 'Week to be confirmed')}</p>
        </div>
      </section>

      <section className={`${styles.panel} ${styles.planTimeline}`}>
        <p className={styles.eyebrow}>{es ? 'Tu recorrido' : 'Your path'}</p>
        <div className={styles.timelineRows}>
          <div>
            <span className={styles.timelineIcon}><PlanIcon /></span>
            <p><small>{es ? 'Inicio de la fase' : 'Phase started'}</small><strong>{formatDate(data.phaseStartDate, language)}</strong></p>
          </div>
          <div>
            <span className={styles.timelineIcon}><CalendarIcon /></span>
            <p><small>{es ? 'Próxima revisión' : 'Next review'}</small><strong>{formatDate(data.nextReview, language)}</strong></p>
          </div>
          <div>
            <span className={styles.timelineIcon}><ChevronIcon /></span>
            <p>
              <small>{es ? 'Siguiente fase' : 'Next phase'}</small>
              <strong>{data.nextPhase || (es ? 'Se definirá en tu revisión' : 'Will be set at your review')}</strong>
              {data.estimatedPhaseChange ? <em>{es ? 'Fecha estimada: ' : 'Estimated date: '}{formatDate(data.estimatedPhaseChange, language)}</em> : null}
            </p>
          </div>
        </div>
      </section>

      <section className={`${styles.panel} ${styles.instructionsPanel}`}>
        <p className={styles.eyebrow}>{es ? 'Indicaciones para ti' : 'Your instructions'}</p>
        <p>{demo
          ? (es
            ? 'Continúa con la guía de tu fase actual y lleva tus preguntas a tu próxima revisión.'
            : 'Continue with your current phase guide and bring your questions to your next review.')
          : data.specialInstructions || (es
          ? 'Sigue las indicaciones que recibiste del equipo AQSLIM. Tu plan se actualizará cuando exista una nueva indicación autorizada.'
          : 'Follow the guidance you received from the AQSLIM team. Your plan will update when new authorized guidance is available.')}</p>
      </section>

      <div className={styles.planActions}>
        <Link href={materialsPath} className={styles.outlineAction}>{es ? 'Ver mis materiales' : 'View my materials'} <ChevronIcon /></Link>
        <Link href={buddyPath} className={styles.goldButton}>{es ? 'Preguntar a AQ Buddy' : 'Ask AQ Buddy'}</Link>
      </div>

      <div className={styles.dataNotice}>
        <InfoIcon />
        <p>{es ? 'Tu fase solo cambia cuando el equipo AQSLIM registra una actualización autorizada.' : 'Your phase changes only when the AQSLIM team records an authorized update.'}</p>
      </div>
    </PortalShell>
  )
}
