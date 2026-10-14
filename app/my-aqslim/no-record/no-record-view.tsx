'use client'

import { SignOutButton, UserButton } from '@clerk/nextjs'
import { MyAqslimAuthShell } from '../auth-shell'
import { usePortalLanguage } from '../use-portal-language'
import styles from '../auth.module.css'

export function MyAqslimNoRecordView() {
  const [language, setLanguage] = usePortalLanguage('es')
  const es = language === 'es'

  return (
    <MyAqslimAuthShell>
      <div className={styles.accountBar}>
        <span>{es ? 'Cuenta protegida' : 'Protected account'}</span>
        <UserButton />
      </div>

      <section className={styles.welcomeCard} aria-labelledby="no-record-title">
        <span className={styles.statusLabel}>{es ? 'Expediente por vincular' : 'Record awaiting connection'}</span>
        <h1 id="no-record-title">{es ? 'Tu cuenta está lista' : 'Your account is ready'}</h1>
        <p>
          {es
            ? 'Todavía necesitamos vincularla con tu expediente AQSLIM. Por seguridad, no mostraremos información hasta confirmar la coincidencia correcta.'
            : 'We still need to connect it to your AQSLIM record. For your safety, no information will be shown until the correct match is confirmed.'}
        </p>

        <span className={styles.languageLabel}>{es ? 'Idioma' : 'Language'}</span>
        <div className={styles.languageOptions} role="group" aria-label={es ? 'Idioma' : 'Language'}>
          <button type="button" className={es ? styles.selected : ''} onClick={() => setLanguage('es')}>Español</button>
          <button type="button" className={!es ? styles.selected : ''} onClick={() => setLanguage('en')}>English</button>
        </div>

        <a className={styles.continueButton} href="mailto:contact@aqslim.com?subject=Vincular%20mi%20cuenta%20My%20AQSLIM">
          {es ? 'Contactar a AQSLIM' : 'Contact AQSLIM'}
        </a>
        <p className={styles.helpText}>
          {es
            ? 'Escríbenos usando el mismo correo con el que ingresaste. El equipo verificará tu identidad antes de vincular el expediente.'
            : 'Write to us from the same email you used to sign in. The team will verify your identity before connecting the record.'}
        </p>

        <SignOutButton redirectUrl="/my-aqslim/login">
          <button type="button" className={styles.signOutButton}>{es ? 'Usar otra cuenta' : 'Use another account'}</button>
        </SignOutButton>
      </section>
    </MyAqslimAuthShell>
  )
}
