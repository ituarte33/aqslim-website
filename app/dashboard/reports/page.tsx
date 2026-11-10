import { currentUser } from '@clerk/nextjs/server'
import { requireCapability } from '@/lib/auth'
import { getConsultasFinanceData } from '@/lib/airtable'
import { ReportsClient } from './reports-client'

export default async function ReportsPage() {
  await requireCapability('consultations:read:any')
  const user = await currentUser()
  let records: Awaited<ReturnType<typeof getConsultasFinanceData>> = []
  let loadError = false
  try { records = await getConsultasFinanceData() } catch { loadError = true }
  return <ReportsClient user={user ? { firstName: user.firstName, lastName: user.lastName } : null} records={records} loadError={loadError} />
}
