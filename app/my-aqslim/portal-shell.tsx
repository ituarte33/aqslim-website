'use client'

import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  BuddyIcon,
  HomeIcon,
  MaterialsIcon,
  PlanIcon,
  ProgressIcon,
} from './portal-icons'
import styles from './portal.module.css'

type Props = {
  firstName: string
  initialLanguage: 'es' | 'en'
  children: React.ReactNode
  demo?: boolean
}

const navItems = [
  { href: '/my-aqslim', es: 'Inicio', en: 'Home', icon: HomeIcon },
  { href: '/my-aqslim/progress', es: 'Progreso', en: 'Progress', icon: ProgressIcon },
  { href: '/my-aqslim/plan', es: 'Mi Plan', en: 'My Plan', icon: PlanIcon, pending: true },
  { href: '/my-aqslim/materials', es: 'Materiales', en: 'Materials', icon: MaterialsIcon, pending: true },
]

export function PortalShell({ firstName, initialLanguage, children, demo = false }: Props) {
  const pathname = usePathname()
  const [language, setLanguage] = useState(initialLanguage)
  const basePath = demo ? '/my-aqslim/demo' : '/my-aqslim'

  useEffect(() => {
    document.body.classList.remove('marketing')
    document.body.classList.toggle('lang-es', language === 'es')
    document.body.classList.toggle('lang-en', language === 'en')
    document.documentElement.lang = language
    window.dispatchEvent(new CustomEvent('aqslim-lang', { detail: language }))
  }, [language])

  function openBuddy() {
    window.dispatchEvent(new CustomEvent('aq-buddy-open'))
  }

  return (
    <div className={styles.portal} data-language={language}>
      <header className={styles.topbar}>
        <Link href={basePath} className={styles.brand} aria-label="My AQSLIM">
          <span className={styles.brandMark} aria-hidden="true">◈</span>
          <span>AQSLIM</span>
        </Link>
        <div className={styles.topbarControls}>
          <div className={styles.languageToggle} aria-label="Language">
            <button
              type="button"
              className={language === 'es' ? styles.languageActive : ''}
              onClick={() => setLanguage('es')}
            >
              ES
            </button>
            <span>/</span>
            <button
              type="button"
              className={language === 'en' ? styles.languageActive : ''}
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
          </div>
          <span className={styles.accountName}>{firstName}</span>
          <div className={styles.userButton}><UserButton /></div>
        </div>
      </header>

      {demo ? (
        <div className={styles.demoBanner} role="status">
          <strong>{language === 'es' ? 'Vista de demostración' : 'Demo view'}</strong>
          <span>{language === 'es' ? 'Los datos que aparecen son ficticios.' : 'The information shown is fictional.'}</span>
        </div>
      ) : null}

      <main className={styles.main}>{children}</main>

      <div className={styles.bottomNav} aria-label={language === 'es' ? 'Navegación principal' : 'Main navigation'}>
        {navItems.map(item => {
          const itemPath = item.href === '/my-aqslim'
            ? basePath
            : item.href.replace('/my-aqslim', basePath)
          const active = item.href === '/my-aqslim'
            ? pathname === itemPath
            : pathname.startsWith(itemPath)
          const Icon = item.icon
          if (item.pending) {
            return (
              <span key={item.href} className={`${styles.navItem} ${styles.navPending}`} aria-disabled="true">
                <Icon />
                <span>{item[language]}</span>
              </span>
            )
          }
          return (
            <Link key={item.href} href={itemPath} className={`${styles.navItem} ${active ? styles.navActive : ''}`}>
              <Icon />
              <span>{item[language]}</span>
            </Link>
          )
        })}
        <button type="button" className={styles.navItem} onClick={openBuddy}>
          <BuddyIcon />
          <span>AQ Buddy</span>
        </button>
      </div>

    </div>
  )
}
