import type { PatientPortalData } from '@/lib/patient-portal'
import { PortalShell } from '../portal-shell'
import styles from '../portal.module.css'

type BuddyViewProps = {
  data: PatientPortalData
  demo?: boolean
}

export function BuddyView({ data, demo = false }: BuddyViewProps) {
  return (
    <PortalShell firstName={data.firstName} initialLanguage={data.language} demo={demo}>
      <div className={styles.buddyPageAnchor} aria-hidden="true" />
    </PortalShell>
  )
}
