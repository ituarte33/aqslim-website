import { redirect } from 'next/navigation'
import { getPatientPortalData } from '@/lib/patient-portal'
import { getPhaseGuide, phaseGuideDocument } from '@/lib/phase-materials'
import { PhaseGuideView } from './phase-guide-view'
import { isClinicRuntimeEnvironment } from '@/lib/clinic-runtime-policy'

export const dynamic = 'force-dynamic'

export default async function PhaseGuidePage() {
  const data = await getPatientPortalData()
  if (!data) redirect('/onboarding')

  const guide = getPhaseGuide(data.phase)
  if (!guide) redirect('/my-aqslim/materials')

  const previewReview = isClinicRuntimeEnvironment({ VERCEL_ENV: process.env.VERCEL_ENV, MYAQ_CLINIC_ENABLED: process.env.MYAQ_CLINIC_ENABLED, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF })
  return <PhaseGuideView data={data} guide={guide} previewReview={previewReview} fullGuide={previewReview ? phaseGuideDocument(data.phase) : null} />
}
