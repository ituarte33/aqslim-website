import type { PatientPortalData } from '@/lib/patient-portal'
import { PortalShell } from '../portal-shell'
import styles from '../portal.module.css'

type BuddyViewProps = {
  data: PatientPortalData
  demo?: boolean
  demoProfileId?: string
}

export function BuddyView({ data, demo = false, demoProfileId }: BuddyViewProps) {
  return (
    <PortalShell firstName={data.firstName} profileId={data.clienteId} initialLanguage={data.language} demo={demo} demoProfileId={demoProfileId}>
      <div className={styles.buddyPageAnchor} aria-hidden="true" />
    </PortalShell>
  )
}
