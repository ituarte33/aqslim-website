import { redirect } from 'next/navigation'
import { getPatientPortalData } from '@/lib/patient-portal'
import { MyAqslimHomeView } from './home-view'

export default async function MyAqslimHomePage() {
  const data = await getPatientPortalData()
  if (!data) redirect('/onboarding')

  return <MyAqslimHomeView data={data} />
}
