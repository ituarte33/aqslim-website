import { redirect } from 'next/navigation'
import { getPilotAccess } from '@/lib/pilot-access'
import { PilotView } from './pilot-view'

export const metadata = {
  title: 'MYAQ Soft Start 01 — AQSLIM',
  description: 'Private AQSLIM early-access pilot',
}

export default async function PilotPage() {
  const pilot = await getPilotAccess()
  if (!pilot) redirect('/my-aqslim')
  return <PilotView pilot={pilot} />
}
