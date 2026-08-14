'use client'

import { usePortalLanguage } from './use-portal-language'
import styles from './portal.module.css'

export function BuddyLoading({ demo = false }: { demo?: boolean }) {
  const [language] = usePortalLanguage('es')
  const es = language === 'es'

  return (
    <div className={`${styles.buddyLoading} ${demo ? styles.buddyLoadingDemo : ''}`} role="status" aria-live="polite">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/Aqslim_Buddy_Pics/aqslim_buddy_open_arms.png" alt="AQ Buddy" />
      <strong>{es ? 'Abriendo AQ Buddy…' : 'Opening AQ Buddy…'}</strong>
      <span>{es ? 'Preparando tu espacio de conversación.' : 'Preparing your conversation space.'}</span>
      <i aria-hidden="true" />
    </div>
  )
}
