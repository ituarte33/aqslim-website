import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { firstProfileParam, type DemoProfileOption } from '@/lib/demo-profile-route'
import { SYNTHETIC_PERSONALIZATION_PROFILES } from '@/lib/nutrition/fixtures'
import { buildSyntheticDemoContext } from '@/lib/patient-portal-demo'
import { GuidedPlanView } from '../../plan/guided-plan-view'

type Props = {
  searchParams: Promise<{ profile?: string | string[] }>
}

export default async function DemoPlanPage({ searchParams }: Props) {
  const isVercelPreview = process.env.VERCEL_ENV === 'preview'
  if (!isVercelPreview && await getRole() !== 'admin') redirect('/my-aqslim')

  const params = await searchParams
  const { data, plan } = buildSyntheticDemoContext(firstProfileParam(params.profile))
  if (plan.status !== 'ready_for_review') redirect('/dashboard/plan-preview')

  const demoProfiles: DemoProfileOption[] = SYNTHETIC_PERSONALIZATION_PROFILES.map(profile => ({
    id: profile.id,
    firstName: profile.firstName,
    calorieTarget: profile.calorieTarget,
  }))

  return <GuidedPlanView data={data} plan={plan} demo demoProfiles={demoProfiles} />
}
