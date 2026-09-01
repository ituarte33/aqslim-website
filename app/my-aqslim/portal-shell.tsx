'use client'

import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import {
  BuddyIcon,
  HomeIcon,
  MaterialsIcon,
  PlanIcon,
  ProgressIcon,
} from './portal-icons'
import { usePortalLanguage } from './use-portal-language'
import { demoProfilePath } from '@/lib/demo-profile-route'
import styles from './portal.module.css'

type Props = {
  firstName: string
  profileId: string
  initialLanguage: 'es' | 'en'
  children: React.ReactNode
  demo?: boolean
  demoProfileId?: string
}

const navItems = [
  { href: '/my-aqslim', es: 'Inicio', en: 'Home', icon: HomeIcon },
  { href: '/my-aqslim/progress', es: 'Progreso', en: 'Progress', icon: ProgressIcon },
  { href: '/my-aqslim/plan', es: 'Mi Plan', en: 'My Plan', icon: PlanIcon },
  { href: '/my-aqslim/materials', es: 'Materiales', en: 'Materials', icon: MaterialsIcon },
  { href: '/my-aqslim/buddy', es: 'AQ Buddy', en: 'AQ Buddy', icon: BuddyIcon },
]

export function PortalShell({ firstName, profileId, initialLanguage, children, demo = false, demoProfileId }: Props) {
  const pathname = usePathname()
  const [language, setLanguage] = usePortalLanguage(initialLanguage, profileId)
  const basePath = demo ? '/my-aqslim/demo' : '/my-aqslim'
  const isBuddyPage = pathname.endsWith('/buddy')

  return (
    <div className={`${styles.portal} ${isBuddyPage ? styles.buddyPortal : ''}`} data-language={language}>
      <header className={styles.topbar}>
        <Link href={demoProfilePath(basePath, demo, demoProfileId)} className={styles.brand} aria-label="My AQSLIM">
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
          return (
            <Link key={item.href} href={demoProfilePath(itemPath, demo, demoProfileId)} className={`${styles.navItem} ${active ? styles.navActive : ''}`}>
              <Icon />
              <span>{item[language]}</span>
            </Link>
          )
        })}
      </div>

    </div>
  )
}
