import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { demoProfilePath, firstProfileParam } from '@/lib/demo-profile-route'
import { buildSyntheticDemoContext } from '@/lib/patient-portal-demo'
import { WelcomeView } from '../../welcome/welcome-view'

type Props = {
  searchParams: Promise<{ profile?: string | string[] }>
}

export default async function DemoWelcomePage({ searchParams }: Props) {
  if (await getRole() !== 'admin') redirect('/my-aqslim')
  const params = await searchParams
  const { data, plan } = buildSyntheticDemoContext(firstProfileParam(params.profile))

  return (
    <WelcomeView
      firstName={data.firstName}
      profileId={data.clienteId}
      initialLanguage={data.language}
      destination={demoProfilePath('/my-aqslim/demo', true, plan.profile.id)}
      demo
    />
  )
}
