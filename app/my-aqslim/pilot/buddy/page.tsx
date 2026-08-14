import { redirect } from 'next/navigation'
import { getPilotAccess } from '@/lib/pilot-access'
import styles from '../pilot.module.css'

export default async function PilotBuddyPage() {
  const pilot = await getPilotAccess()
  if (!pilot || !pilot.enabledFeatures.has('aq_buddy')) redirect('/my-aqslim/pilot')
  return <main className={styles.buddyCanvas} aria-label="AQ Buddy" />
}
