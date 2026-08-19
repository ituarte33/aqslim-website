'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  effectiveFast36Status,
  fast36ProgressPercent,
  selectCurrentFast36Session,
  DEFAULT_FAST36_TIME_ZONE,
  type Fast36EffectiveStatus,
  type Fast36Session,
} from '@/lib/fast36-policy'
import { usePortalLanguage } from '../../use-portal-language'
import styles from './fast36.module.css'

const STATUS_LABELS: Record<Fast36EffectiveStatus, { es: string; en: string }> = {
  pending: { es: 'Próximo', en: 'Upcoming' },
  active: { es: 'Ayuno activo', en: 'Fast active' },
  awaiting_confirmation: { es: 'Pendiente de confirmación', en: 'Awaiting confirmation' },
  completed: { es: 'Completado', en: 'Completed' },
  ended_early: { es: 'Terminado antes', en: 'Ended early' },
  stopped_for_safety: { es: 'Interrumpido por seguridad', en: 'Stopped for safety' },
}

function formatDate(value: string, language: 'es' | 'en', timeZone = DEFAULT_FAST36_TIME_ZONE) {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function durationParts(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

export function Fast36View({
  firstName,
  profileId,
  initialLanguage,
  sessions,
}: {
  firstName: string
  profileId: string
  initialLanguage: 'es' | 'en'
  sessions: Fast36Session[]
}) {
  const [language] = usePortalLanguage(initialLanguage, profileId)
  const [now, setNow] = useState(() => Date.now())
  const es = language === 'es'

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const current = useMemo(() => selectCurrentFast36Session(sessions, now), [sessions, now])
  if (!current) return null

  const status = effectiveFast36Status(current, now)
  const progress = fast36ProgressPercent(current, now)
  const target = status === 'pending' ? Date.parse(current.startAt) : Date.parse(current.plannedEndAt)
  const remaining = durationParts(target - now)
  const timeZone = current.timeZone ?? DEFAULT_FAST36_TIME_ZONE
  const completedCount = sessions.filter(session =>
    effectiveFast36Status(session, now) === 'completed',
  ).length

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/my-aqslim/pilot" className={styles.back}>← {es ? 'Panel' : 'Dashboard'}</Link>
        <span className={styles.brand}>AQ<span>SLIM</span> · FAST 36</span>
      </header>

      <div className={styles.content}>
        <p className={styles.eyebrow}>{es ? `SEMANA ${current.week} DE 6 · ${firstName.toUpperCase()}` : `WEEK ${current.week} OF 6 · ${firstName.toUpperCase()}`}</p>
        <div className={styles.status}><span />{STATUS_LABELS[status][language]}</div>
        <h1>{status === 'active'
          ? (es ? 'Vas muy bien.' : 'You are doing great.')
          : status === 'awaiting_confirmation'
            ? (es ? 'Tu resultado está por confirmar.' : 'Your result is awaiting confirmation.')
            : (es ? 'Tu programa Fast 36.' : 'Your Fast 36 program.')}</h1>
        <p className={styles.lead}>
          {status === 'active'
            ? (es ? 'Tu sesión está vinculada de forma segura a tu expediente MY AQSLIM.' : 'Your session is securely linked to your MY AQSLIM patient record.')
            : status === 'awaiting_confirmation'
              ? (es ? 'El horario programado terminó, pero MY AQSLIM no marcará el ayuno como completado hasta que exista una confirmación.' : 'The scheduled window ended, but MY AQSLIM will not mark the fast completed until it is confirmed.')
            : (es ? 'Aquí encontrarás tu horario y progreso semana a semana.' : 'Your schedule and weekly progress live here.')}
        </p>

        <section className={styles.timerCard}>
          <p>{status === 'pending' ? (es ? 'COMIENZA EN' : 'STARTS IN') : status === 'awaiting_confirmation' ? (es ? 'HORARIO FINALIZADO' : 'SCHEDULE ENDED') : (es ? 'TIEMPO RESTANTE' : 'TIME REMAINING')}</p>
          {status === 'awaiting_confirmation' ? (
            <div className={styles.confirmationMessage}>
              <strong>{es ? 'Pendiente de confirmación' : 'Awaiting confirmation'}</strong>
              <span>{es ? 'No se ha inferido un resultado.' : 'No result has been inferred.'}</span>
            </div>
          ) : (
            <div className={styles.timer}>
              <strong>{String(remaining.hours).padStart(2, '0')}</strong><span>:</span>
              <strong>{String(remaining.minutes).padStart(2, '0')}</strong><span>:</span>
              <strong>{String(remaining.seconds).padStart(2, '0')}</strong>
            </div>
          )}
          <div className={styles.progress}><span style={{ width: `${progress}%` }} /></div>
          <div className={styles.timerMeta}><span>{Math.round(progress)}% {es ? 'del horario' : 'of schedule'}</span><span>36 {es ? 'horas' : 'hours'}</span></div>
        </section>

        <section className={styles.schedule}>
          <div><small>{es ? 'ÚLTIMA COMIDA' : 'LAST MEAL'}</small><strong>{formatDate(current.startAt, language, timeZone)}</strong></div>
          <div><small>{es ? 'FIN PROGRAMADO' : 'SCHEDULED END'}</small><strong>{formatDate(current.plannedEndAt, language, timeZone)}</strong></div>
        </section>

        <section className={styles.weeks}>
          <div className={styles.sectionHeading}>
            <div><small>{es ? 'PROGRAMA' : 'PROGRAM'}</small><h2>{es ? 'Seis semanas, un registro.' : 'Six weeks, one record.'}</h2></div>
            <strong>{completedCount}/6</strong>
          </div>
          <div className={styles.weekGrid}>
            {sessions.map(session => {
              const sessionStatus = effectiveFast36Status(session, now)
              return (
                <article key={session.id} className={sessionStatus === 'active' ? styles.activeWeek : ''}>
                  <span>{es ? 'SEMANA' : 'WEEK'} {session.week}</span>
                  <strong>{STATUS_LABELS[sessionStatus][language]}</strong>
                  <small>{formatDate(session.startAt, language, session.timeZone)}</small>
                </article>
              )
            })}
          </div>
        </section>

        <p className={styles.note}>{es ? 'Primera integración: horarios y avance ya están protegidos en tu expediente. Los controles de registro se habilitarán en la siguiente revisión.' : 'First integration: your schedule and progress are now protected in your patient record. Logging controls will be enabled in the next review.'}</p>
      </div>
    </main>
  )
}
