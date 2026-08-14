'use client'

import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import type { AuthenticatedPilot } from '@/lib/pilot-access'
import type { PilotFeature } from '@/lib/pilot-policy'
import { usePortalLanguage } from '../use-portal-language'
import styles from './pilot.module.css'

type FeatureDefinition = {
  id: PilotFeature
  icon: string
  title: { es: string; en: string }
  description: { es: string; en: string }
  href?: string
  released: boolean
}

const FEATURES: FeatureDefinition[] = [
  {
    id: 'patient_portal',
    icon: '◈',
    title: { es: 'Mi portal personal', en: 'My personal portal' },
    description: { es: 'Fase, progreso, plan y materiales asignados.', en: 'Phase, progress, plan, and assigned materials.' },
    href: '/my-aqslim',
    released: true,
  },
  {
    id: 'aq_buddy',
    icon: '💬',
    title: { es: 'AQ Buddy', en: 'AQ Buddy' },
    description: { es: 'Acompañamiento bilingüe entre consultas.', en: 'Bilingual support between consultations.' },
    href: '/my-aqslim/pilot/buddy',
    released: true,
  },
  {
    id: 'food_scan',
    icon: '📷',
    title: { es: 'Registro por fotografía', en: 'Photo meal log' },
    description: { es: 'Estimaciones nutricionales y registro de comidas.', en: 'Nutrition estimates and meal tracking.' },
    href: '/food-scanner',
    released: true,
  },
  {
    id: 'restaurant_advisor',
    icon: '🍽',
    title: { es: '¿Qué puedo comer aquí?', en: 'What can I eat here?' },
    description: { es: 'Orientación de AQ Buddy a partir del menú del restaurante.', en: 'AQ Buddy guidance from a restaurant menu.' },
    released: false,
  },
  {
    id: 'fridge_recipes',
    icon: '🥬',
    title: { es: 'Recetas de mi refrigerador', en: 'Recipes from my refrigerator' },
    description: { es: 'Ideas compatibles con tu fase usando lo que ya tienes.', en: 'Phase-compatible ideas using what you already have.' },
    released: false,
  },
  {
    id: 'weekly_summary',
    icon: '📈',
    title: { es: 'Resumen semanal', en: 'Weekly summary' },
    description: { es: 'Patrones, constancia y temas para revisar con AQSLIM.', en: 'Patterns, consistency, and topics to review with AQSLIM.' },
    released: false,
  },
]

export function PilotView({ pilot }: { pilot: AuthenticatedPilot }) {
  const [language, setLanguage] = usePortalLanguage(pilot.language)
  const es = language === 'es'

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>AQ<span>SLIM</span></Link>
        <div className={styles.controls}>
          <div className={styles.language} aria-label={es ? 'Idioma' : 'Language'}>
            <button type="button" className={es ? styles.activeLanguage : ''} onClick={() => setLanguage('es')}>ES</button>
            <span>/</span>
            <button type="button" className={!es ? styles.activeLanguage : ''} onClick={() => setLanguage('en')}>EN</button>
          </div>
          <UserButton />
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.cohort}>MYAQ SOFT START 01 · {es ? 'ACCESO PRIVADO' : 'PRIVATE ACCESS'}</div>
        <h1>{es ? `Hola, ${pilot.firstName}` : `Hello, ${pilot.firstName}`}</h1>
        <p className={styles.intro}>
          {es
            ? 'Este es nuestro espacio de prueba anticipada. Las funciones activas están listas para usarse; las demás aparecerán aquí conforme pasen a revisión.'
            : 'This is our early-access testing space. Active features are ready to use; the rest will appear here as they move into review.'}
        </p>

        <section className={styles.featureGrid} aria-label={es ? 'Funciones del piloto' : 'Pilot features'}>
          {FEATURES.map(feature => {
            const enabled = feature.released && pilot.enabledFeatures.has(feature.id)
            const card = (
              <>
                <div className={styles.featureTop}>
                  <span className={styles.icon} aria-hidden="true">{feature.icon}</span>
                  <span className={`${styles.status} ${enabled ? styles.enabled : styles.planned}`}>
                    {enabled ? (es ? 'Activa' : 'Active') : (es ? 'Próximamente' : 'Coming soon')}
                  </span>
                </div>
                <h2>{feature.title[language]}</h2>
                <p>{feature.description[language]}</p>
                {enabled ? <span className={styles.open}>{es ? 'Abrir' : 'Open'} →</span> : null}
              </>
            )
            return enabled && feature.href ? (
              <Link key={feature.id} href={feature.href} className={`${styles.featureCard} ${styles.clickable}`}>{card}</Link>
            ) : (
              <article key={feature.id} className={styles.featureCard}>{card}</article>
            )
          })}
        </section>

        <aside className={styles.pilotNote}>
          <strong>{es ? 'Cómo probaremos' : 'How we will test'}</strong>
          <span>{es ? 'Úsala con naturalidad y anota: qué funcionó, qué confundió y qué te habría ayudado más.' : 'Use it naturally and note: what worked, what was confusing, and what would have helped more.'}</span>
        </aside>
      </div>
    </main>
  )
}
