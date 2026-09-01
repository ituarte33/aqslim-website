import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { firstProfileParam } from '@/lib/demo-profile-route'
import { buildSyntheticDemoContext } from '@/lib/patient-portal-demo'
import { MaterialsView } from '../../materials/materials-view'

type Props = {
  searchParams: Promise<{ profile?: string | string[] }>
}

export default async function DemoMaterialsPage({ searchParams }: Props) {
  if (await getRole() !== 'admin') redirect('/my-aqslim')
  const params = await searchParams
  const { data, plan } = buildSyntheticDemoContext(firstProfileParam(params.profile))

  return <MaterialsView
    data={data}
    materialsData={{ kenkhoTier: 'Start', materials: [] }}
    demo
    demoProfileId={plan.profile.id}
  />
}
