import Link from 'next/link'
import styles from './auth.module.css'

export function MyAqslimAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.screen}>
      <div className={styles.frame}>
        <Link href="/" className={styles.brand} aria-label="AQSLIM">
          <span className={styles.brandMark} aria-hidden="true">◈</span>
          <span>AQSLIM</span>
        </Link>
        {children}
      </div>
    </main>
  )
}
