'use client'

import Link from 'next/link'
import { MyAqslimAuthShell } from '../auth-shell'
import { usePortalLanguage } from '../use-portal-language'
import styles from '../auth.module.css'

type Props = {
  firstName: string
  profileId: string
  initialLanguage: 'es' | 'en'
  destination?: string
  demo?: boolean
}

export function WelcomeView({ firstName, profileId, initialLanguage, destination = '/my-aqslim', demo = false }: Props) {
  const [language, setLanguage] = usePortalLanguage(initialLanguage, profileId)
  const es = language === 'es'

  return (
    <MyAqslimAuthShell>
      <section className={styles.welcomeCard} aria-labelledby="welcome-title">
        <h1 id="welcome-title">{es ? `Hola, ${firstName}` : `Hello, ${firstName}`}</h1>
        <p>
          {es
            ? 'Este es tu espacio personal para acompañarte entre consultas, entender tu plan y seguir tu progreso.'
            : 'This is your personal space to support you between consultations, understand your plan, and follow your progress.'}
        </p>

        <span className={styles.languageLabel}>
          {es ? 'Elige tu idioma' : 'Choose your language'}
        </span>
        <div className={styles.languageOptions} role="group" aria-label={es ? 'Idioma' : 'Language'}>
          <button type="button" className={language === 'es' ? styles.selected : ''} onClick={() => setLanguage('es')}>
            Español
          </button>
          <button type="button" className={language === 'en' ? styles.selected : ''} onClick={() => setLanguage('en')}>
            English
          </button>
        </div>

        <Link
          href={destination}
          className={styles.continueButton}
        >
          {es ? 'Entrar a My AQSLIM' : 'Enter My AQSLIM'}
        </Link>
      </section>
      {demo ? (
        <p className={styles.demoBanner}>
          {es ? 'Vista de demostración · Los datos son ficticios.' : 'Demo view · The information is fictional.'}
        </p>
      ) : null}
    </MyAqslimAuthShell>
  )
}
