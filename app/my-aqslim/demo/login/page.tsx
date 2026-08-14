import { redirect } from 'next/navigation'
import { getRole } from '@/lib/auth'
import { DemoLoginView } from './demo-login-view'

export default async function DemoLoginPage() {
  if (await getRole() !== 'admin') redirect('/my-aqslim')

  return <DemoLoginView />
}
