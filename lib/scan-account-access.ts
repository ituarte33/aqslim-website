import 'server-only'

import { cache } from 'react'
import { currentUser } from '@clerk/nextjs/server'
import { getOwnPatient } from '@/lib/auth'
import { hasAccountScanOverride } from '@/lib/scan-account-policy'
import { portalAccessIsRestricted } from '@/lib/portal-access-policy'
import { getPortalAccessRecordByPatientRecordId } from '@/lib/preview-entitlement-store'

export const hasActiveAccountScanOverride = cache(async (): Promise<boolean> => {
  if (!process.env.MYAQ_SCAN_OVERRIDE_EMAIL_SHA256?.trim()) return false
  const user = await currentUser()
  if (!hasAccountScanOverride(user, process.env.MYAQ_SCAN_OVERRIDE_EMAIL_SHA256)) return false
  try {
    const patient = await getOwnPatient()
    const access = await getPortalAccessRecordByPatientRecordId({ patientRecordId: patient.id, canonicalSubjectId: user!.id })
    return !portalAccessIsRestricted(access?.record)
  } catch {
    return false
  }
})
