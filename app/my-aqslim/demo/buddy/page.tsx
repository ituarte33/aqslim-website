import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { firstProfileParam } from '@/lib/demo-profile-route'
import { buildSyntheticDemoContext } from '@/lib/patient-portal-demo'
import { BuddyView } from '../../buddy/buddy-view'

type Props = {
  searchParams: Promise<{ profile?: string | string[] }>
}

export default async function DemoBuddyPage({ searchParams }: Props) {
  if (await getRole() !== 'admin') redirect('/my-aqslim')
  const params = await searchParams
  const { data, plan } = buildSyntheticDemoContext(firstProfileParam(params.profile))

  return <BuddyView data={data} demo demoProfileId={plan.profile.id} />
}
