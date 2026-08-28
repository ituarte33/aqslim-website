import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { demoPatientPortalData } from '@/lib/patient-portal-demo'
import { buildSyntheticGuidedPlan } from '@/lib/nutrition/preview'
import { GuidedPlanView } from '../../plan/guided-plan-view'

export default async function DemoPlanPage() {
  const isVercelPreview = process.env.VERCEL_ENV === 'preview'
  if (!isVercelPreview && await getRole() !== 'admin') redirect('/my-aqslim')

  return <GuidedPlanView data={demoPatientPortalData} plan={buildSyntheticGuidedPlan()} demo />
}
