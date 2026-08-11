import { SignIn } from '@clerk/nextjs'
import { MyAqslimAuthShell } from '../../auth-shell'
import styles from '../../auth.module.css'

export default function MyAqslimLoginPage() {
  return (
    <MyAqslimAuthShell>
      <div className={styles.intro}>
        <h1>Tu camino continúa aquí</h1>
        <p>Ingresa para ver tu plan, progreso y acompañamiento personalizado.</p>
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
        Tu información está protegida y solo se utiliza para brindarte los servicios de AQSLIM.
      </p>
    </MyAqslimAuthShell>
  )
}
