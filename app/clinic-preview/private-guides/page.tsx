import { redirect } from 'next/navigation'
import { getActor } from '@/lib/auth'
import { clinicRuntimeEnvironment, isClinicRuntimeFounderIdentity } from '@/lib/clinic-runtime-policy'
import { PrivateGuideImport } from './private-guide-import'

export default async function PrivateGuidesPage() {
  const actor = await getActor()
  if (!actor) redirect('/clinic-preview/login')
  if (!isClinicRuntimeFounderIdentity({ email: actor.email, environment: clinicRuntimeEnvironment() })) redirect('/my-aqslim')
  return <PrivateGuideImport />
}
