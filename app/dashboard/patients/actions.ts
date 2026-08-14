'use server'

import { requireCapability } from '@/lib/auth'
import { getClientesPage } from '@/lib/airtable'

export async function fetchPatientsPage({
  offset,
  query,
}: {
  offset?: string | null
  query?: string
}) {
  await requireCapability('patients:read:any')

  const safeOffset = offset && offset.length <= 300 ? offset : null
  const safeQuery = query?.trim().slice(0, 100) ?? ''
  return getClientesPage({ offset: safeOffset, query: safeQuery, pageSize: 50 })
}
