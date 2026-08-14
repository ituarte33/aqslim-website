import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { demoPatientPortalData } from '@/lib/patient-portal-demo'
import { MyAqslimHomeView } from '../home-view'

export default async function MyAqslimDemoPage() {
  if (await getRole() !== 'admin') redirect('/my-aqslim')

  return <MyAqslimHomeView data={demoPatientPortalData} demo />
}
