'use client'

import { SignIn } from '@clerk/nextjs'
import { MyAqslimAuthShell } from '../../auth-shell'
import styles from '../../auth.module.css'
import { usePortalLanguage } from '../../use-portal-language'

export function MyAqslimLoginView() {
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
        <p>
          {es
            ? 'Ingresa para ver tu plan, progreso y acompañamiento personalizado.'
            : 'Sign in to view your plan, progress, and personalized support.'}
        </p>
      </div>

      <div className={styles.clerkHost}>
        <SignIn
          path="/my-aqslim/login"
          routing="path"
          forceRedirectUrl="/my-aqslim/welcome"
          appearance={{
            variables: {
              colorPrimary: '#d4a72c',
              colorBackground: '#111210',
              colorInputBackground: '#171815',
              colorInputText: '#f5f2eb',
              colorText: '#f5f2eb',
              colorTextSecondary: '#aaa69e',
              borderRadius: '12px',
              fontFamily: 'Montserrat, sans-serif',
            },
            elements: {
              cardBox: styles.clerkCardBox,
              card: styles.clerkCard,
              headerTitle: styles.clerkHidden,
              headerSubtitle: styles.clerkHidden,
              socialButtonsBlockButton: styles.clerkSocialButton,
              formButtonPrimary: styles.clerkPrimaryButton,
              footerActionLink: styles.clerkFooterLink,
            },
          }}
        />
      </div>

      <p className={styles.privacy}>
        {es
          ? 'Tu información está protegida y solo se utiliza para brindarte los servicios de AQSLIM.'
          : 'Your information is protected and used only to provide AQSLIM services.'}
      </p>
    </MyAqslimAuthShell>
  )
}
