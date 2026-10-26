import { redirect } from 'next/navigation'
import { getActor } from '@/lib/auth'
import { clinicRuntimeEnvironment, isClinicRuntimeFounderIdentity } from '@/lib/clinic-runtime-policy'
import { PrivateGuideImport } from './private-guide-import'
import { PRIVATE_GUIDE_MAX_BYTES, PRIVATE_PHASE_GUIDES } from '@/lib/private-phase-guide-policy'

export default async function PrivateGuidesPage() {
  const actor = await getActor()
  if (!actor) redirect('/clinic-preview/login')
  if (!isClinicRuntimeFounderIdentity({ email: actor.email, environment: clinicRuntimeEnvironment() })) redirect('/my-aqslim')
  return <PrivateGuideImport guides={Object.values(PRIVATE_PHASE_GUIDES).map(({ slug, phase, sha256 }) => ({ slug, phase, sha256 }))} maxBytes={PRIVATE_GUIDE_MAX_BYTES} />
}
