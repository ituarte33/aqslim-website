import { redirect } from 'next/navigation'
import { getPatientPortalData } from '@/lib/patient-portal'
import { BuddyView } from './buddy-view'

export default async function BuddyPage() {
  const data = await getPatientPortalData()
  if (!data) redirect('/onboarding')

  return <BuddyView data={data} />
}
