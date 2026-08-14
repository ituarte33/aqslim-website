import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { demoPatientPortalData } from '@/lib/patient-portal-demo'
import { BuddyView } from '../../buddy/buddy-view'

export default async function DemoBuddyPage() {
  if (await getRole() !== 'admin') redirect('/my-aqslim')

  return <BuddyView data={demoPatientPortalData} demo />
}
