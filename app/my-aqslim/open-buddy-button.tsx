'use client'

import { BuddyIcon } from './portal-icons'
import styles from './portal.module.css'

export function OpenBuddyButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className={styles.goldButton}
      onClick={() => window.dispatchEvent(new CustomEvent('aq-buddy-open'))}
    >
      <BuddyIcon />
      {label}
    </button>
  )
}
