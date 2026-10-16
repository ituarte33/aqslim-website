import { redirect } from 'next/navigation'
import { getPatientPortalData } from '@/lib/patient-portal'
import { getPhaseGuide } from '@/lib/phase-materials'
import { PhaseGuideView } from './phase-guide-view'

export const dynamic = 'force-dynamic'

export default async function PhaseGuidePage() {
  const data = await getPatientPortalData()
  if (!data) redirect('/onboarding')

  const guide = getPhaseGuide(data.phase)
  if (!guide) redirect('/my-aqslim/materials')

  return <PhaseGuideView data={data} guide={guide} />
}
