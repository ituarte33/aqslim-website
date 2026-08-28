import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { demoPatientPortalData } from '@/lib/patient-portal-demo'
import { buildSyntheticPersonalizationPlan } from '@/lib/nutrition/preview'
import { GuidedPlanView } from '../../plan/guided-plan-view'

type Props = {
  searchParams: Promise<{ profile?: string | string[] }>
}

export default async function DemoPlanPage({ searchParams }: Props) {
  const isVercelPreview = process.env.VERCEL_ENV === 'preview'
  if (!isVercelPreview && await getRole() !== 'admin') redirect('/my-aqslim')

  const params = await searchParams
  const requestedProfile = Array.isArray(params.profile) ? params.profile[0] : params.profile
  const plan = buildSyntheticPersonalizationPlan(requestedProfile)
  if (plan.status !== 'ready_for_review') redirect('/dashboard/plan-preview')

  const data = {
    ...demoPatientPortalData,
    clienteId: `demo-${plan.profile.id.toLowerCase()}`,
    firstName: plan.profile.firstName,
    fullName: `${plan.profile.firstName} · Perfil sintético`,
    calorieTarget: plan.profile.calorieTarget,
  }

  return <GuidedPlanView data={data} plan={plan} demo />
}
