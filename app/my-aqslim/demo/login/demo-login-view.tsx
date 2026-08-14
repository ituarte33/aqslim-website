'use client'

import Link from 'next/link'
import { MyAqslimAuthShell } from '../../auth-shell'
import styles from '../../auth.module.css'
import { usePortalLanguage } from '../../use-portal-language'

export function DemoLoginView() {
  const [language, setLanguage] = usePortalLanguage('es')
  const es = language === 'es'

  return (
    <MyAqslimAuthShell>
      <div className={styles.languageOptions} role="group" aria-label={es ? 'Idioma' : 'Language'}>
        <button type="button" className={es ? styles.selected : ''} onClick={() => setLanguage('es')}>Español</button>
        <button type="button" className={!es ? styles.selected : ''} onClick={() => setLanguage('en')}>English</button>
      </div>
      <div className={styles.intro}>
        <h1>{es ? 'Tu camino continúa aquí' : 'Your journey continues here'}</h1>
        <p>{es ? 'Ingresa para ver tu plan, progreso y acompañamiento personalizado.' : 'Sign in to view your plan, progress, and personalized support.'}</p>
      </div>
      <section className={styles.welcomeCard} aria-label={es ? 'Inicio de sesión de demostración' : 'Demo sign in'}>
        <span className={styles.languageLabel}>{es ? 'Correo electrónico' : 'Email address'}</span>
        <div className={styles.demoField}>maria@example.com</div>
        <Link href="/my-aqslim/demo/welcome" className={styles.continueButton}>{es ? 'Continuar' : 'Continue'}</Link>
      </section>
      <p className={styles.demoBanner}>{es ? 'Vista de demostración · No solicita credenciales reales.' : 'Demo view · No real credentials are requested.'}</p>
    </MyAqslimAuthShell>
  )
}
