import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { MyAqslimAuthShell } from '../../auth-shell'
import styles from '../../auth.module.css'

export default async function DemoLoginPage() {
  if (await getRole() !== 'admin') redirect('/my-aqslim')

  return (
    <MyAqslimAuthShell>
      <div className={styles.intro}>
        <h1>Tu camino continúa aquí</h1>
        <p>Ingresa para ver tu plan, progreso y acompañamiento personalizado.</p>
      </div>
      <section className={styles.welcomeCard} aria-label="Inicio de sesión de demostración">
        <span className={styles.languageLabel}>Correo electrónico</span>
        <div className={styles.demoField}>
          maria@ejemplo.com
        </div>
        <Link href="/my-aqslim/demo/welcome" className={styles.continueButton}>Continuar</Link>
      </section>
      <p className={styles.demoBanner}>Vista de demostración · No solicita credenciales reales.</p>
    </MyAqslimAuthShell>
  )
}
