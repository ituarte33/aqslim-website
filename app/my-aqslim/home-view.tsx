'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { PatientPortalData } from '@/lib/patient-portal'
import { demoProfilePath } from '@/lib/demo-profile-route'
import { CalendarIcon, ChevronIcon, MaterialsIcon } from './portal-icons'
import { PortalShell } from './portal-shell'
import { usePortalLanguage } from './use-portal-language'
import styles from './portal.module.css'

function formatDate(value: string | null, language: 'es' | 'en', options?: Intl.DateTimeFormatOptions) {
  if (!value) return language === 'es' ? 'Por confirmar' : 'To be confirmed'
  return new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(new Date(value))
}

function formatWeight(value: number | null, unit: 'lb' | 'kg') {
  if (value === null) return '—'
  return `${Math.round(value * 10) / 10} ${unit}`
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

type HomeViewProps = {
  data: PatientPortalData
  demo?: boolean
  demoProfileId?: string
}

export function MyAqslimHomeView({ data, demo = false, demoProfileId }: HomeViewProps) {
  const [language] = usePortalLanguage(data.language, data.clienteId)
  const es = language === 'es'
  const today = new Intl.DateTimeFormat(es ? 'es-MX' : 'en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
  const change = data.totalChange === null
    ? '—'
    : `${data.totalChange > 0 ? '+' : '−'}${Math.abs(Math.round(data.totalChange * 10) / 10)} ${data.unit}`
  const percent = data.percentChange === null ? '—' : `${data.percentChange.toFixed(1)}%`
  const plan = data.planName || data.phase || (es ? 'Por confirmar' : 'To be confirmed')
  const isFast36Hypocaloric = plan.toLowerCase().includes('fast 36') && plan.toLowerCase().includes('hipocal')
  const planTitle = isFast36Hypocaloric ? 'FAST 36' : plan

  return (
    <PortalShell firstName={data.firstName} profileId={data.clienteId} initialLanguage={data.language} demo={demo} demoProfileId={demoProfileId}>
      <section className={styles.welcome}>
        <p>{es ? `Hola, ${data.firstName}` : `Hello, ${data.firstName}`}</p>
        <span>{capitalize(today)}</span>
        <small className={styles.profileIdentity}>
          {es ? 'Perfil vinculado' : 'Linked profile'}: <strong>{data.fullName}</strong>
        </small>
      </section>

      <section className={`${styles.panel} ${styles.phasePanel}`}>
        <div>
          <p className={styles.eyebrow}>{es ? 'Tu plan actual' : 'Your current plan'}</p>
          <h1>{planTitle}</h1>
          <p className={styles.phaseWeek}>
            {isFast36Hypocaloric ? `${es ? 'Plan Hipocalórico' : 'Hypocaloric Plan'} · ` : ''}
            {data.weekInPhase
              ? `${es ? 'Semana' : 'Week'} ${data.weekInPhase}`
              : (es ? 'Semana por confirmar' : 'Week to be confirmed')}
          </p>
          <Link href={demoProfilePath(demo ? '/my-aqslim/demo/plan' : '/my-aqslim/plan', demo, demoProfileId)} className={styles.phaseLinkText}>{es ? 'Ver mi plan' : 'View my plan'} <ChevronIcon /></Link>
        </div>
        <div className={styles.phaseSeal} aria-hidden="true">
          <span>{planTitle.slice(0, 1).toUpperCase()}</span>
          <small>MY AQSLIM</small>
        </div>
      </section>

      <section className={`${styles.panel} ${styles.mealHub}`}>
        <div>
          <p className={styles.eyebrow}>{es ? 'Tus comidas' : 'Your meals'}</p>
          <h2>{es ? 'Registra o revisa una comida' : 'Log or review a meal'}</h2>
          <p>{es
            ? 'Elige cómo deseas registrar lo que vas a comer.'
            : 'Choose how you would like to log what you plan to eat.'}</p>
        </div>
        <div className={styles.mealActions}>
          <Link href="/food-scanner?mode=photo" className={styles.goldButton}>
            {es ? 'Con fotografía' : 'With a photo'}
          </Link>
          <Link href="/food-scanner?mode=description" className={styles.mealSecondary}>
            {es ? 'Sin fotografía' : 'Without a photo'}
          </Link>
          <Link href="/food-scanner#food-history" className={styles.mealHistory}>
            {es ? 'Ver historial' : 'View history'} <ChevronIcon />
          </Link>
          <div className={styles.mealExplore}>
            <p>{es ? 'Explora antes de elegir' : 'Explore before choosing'}</p>
            <Link href="/my-aqslim/pilot/restaurant" className={styles.mealExploreLink}>
              <span>{es ? '¿Qué puedo comer aquí?' : 'What can I eat here?'}</span>
              <ChevronIcon />
            </Link>
            <Link href="/my-aqslim/pilot/fridge" className={styles.mealExploreLink}>
              <span>{es ? 'Recetas de mi refrigerador' : 'Recipes from my refrigerator'}</span>
              <ChevronIcon />
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <p className={styles.eyebrow}>{es ? 'Tu próximo paso' : 'Your next step'}</p>
        <div className={styles.nextStep}>
          <div className={styles.roundIcon}><CalendarIcon /></div>
          <div>
            <strong>{es ? `Continúa con tu plan ${plan}.` : `Continue with your ${plan} plan.`}</strong>
            <span>{es ? 'Próxima revisión' : 'Next review'}</span>
            <b>{formatDate(data.nextReview, language)}</b>
          </div>
        </div>
      </section>

      <Link href={demoProfilePath(demo ? '/my-aqslim/demo/progress' : '/my-aqslim/progress', demo, demoProfileId)} className={`${styles.panel} ${styles.progressSummary}`}>
        <div>
          <p className={styles.eyebrow}>{es ? 'Tu progreso' : 'Your progress'}</p>
          <div className={styles.weightRow}>
            <span>{es ? 'Inicio' : 'Start'}<b>{formatWeight(data.initialWeight, data.unit)}</b></span>
            <ChevronIcon />
            <span>{es ? 'Actual' : 'Current'}<b>{formatWeight(data.currentWeight, data.unit)}</b></span>
          </div>
          <strong className={styles.change}>{change}</strong>
          <small>{data.totalChange !== null && data.totalChange <= 0 ? (es ? '¡Vas muy bien!' : 'You are doing great!') : (es ? 'Tu evolución, paso a paso.' : 'Your progress, step by step.')}</small>
        </div>
        <div className={styles.progressRing} style={{ '--progress': `${Math.min(data.percentChange ?? 0, 100) * 3.6}deg` } as React.CSSProperties}>
          <span>{percent}</span>
          <small>{es ? 'de tu peso inicial' : 'of starting weight'}</small>
        </div>
      </Link>

      <section className={`${styles.panel} ${styles.buddyPanel}`}>
        <Image
          src="/Aqslim_Buddy_Pics/aqslim_buddy_open_arms.png"
          alt="AQ Buddy"
          width={180}
          height={180}
        />
        <div>
          <p className={styles.eyebrow}>AQ Buddy</p>
          <h2>{es ? '¿Cómo puedo ayudarte hoy?' : 'How can I help you today?'}</h2>
          <Link href={demoProfilePath(demo ? '/my-aqslim/demo/buddy' : '/my-aqslim/buddy', demo, demoProfileId)} className={styles.goldButton}>{es ? 'Hablar con AQ Buddy' : 'Talk to AQ Buddy'}</Link>
        </div>
      </section>

      <Link href={demoProfilePath(demo ? '/my-aqslim/demo/materials' : '/my-aqslim/materials', demo, demoProfileId)} className={styles.materialsPreviewLink}>
      <section className={styles.materialsPreview}>
        <div className={styles.sectionHeading}>
          <h2>{es ? 'Tus materiales' : 'Your materials'}</h2>
          <span>{es ? 'Vista previa' : 'Preview'}</span>
        </div>
        <div className={styles.materialRows}>
          <div><MaterialsIcon /><span><b>{es ? `Guía ${planTitle}` : `${planTitle} Guide`}</b><small>{es ? 'Guía del plan' : 'Plan guide'}</small></span></div>
          <div><MaterialsIcon /><span><b>{es ? 'Manual del Participante' : 'Participant Manual'}</b><small>{es ? 'Manual' : 'Manual'}</small></span></div>
        </div>
      </section>
      </Link>
    </PortalShell>
  )
}
