import 'server-only'
import { isClinicPreviewEnvironment } from './clinic-preview-policy.ts'
import { SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID } from './nutrition/synthetic-preview-policy.ts'
import { clinicPortalWeight } from './clinic-portal-weight.ts'
import type { PortalMeasurement } from './patient-portal'

// Read only. The caller supplies the patient resolved from the authenticated account.
export async function getClinicPortalWeights(patientId: string, unit: 'lb' | 'kg'): Promise<PortalMeasurement[]> {
  if (!isClinicPreviewEnvironment({ VERCEL_ENV: process.env.VERCEL_ENV, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF })
    || process.env.AIRTABLE_BASE_ID !== SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID
    || !process.env.AIRTABLE_PAT) return []
  if (!/^rec[A-Za-z0-9]{14}$/.test(patientId)) return []
  const weights = new Map<string, PortalMeasurement>()
  let offset: string | undefined
  do {
    const params = new URLSearchParams({
      pageSize: '100', returnFieldsByFieldId: 'true',
      filterByFormula: `AND({Patient Record ID} = "${patientId}", {Preview Only} = TRUE())`,
    })
    if (offset) params.set('offset', offset)
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/tbl0cTWsYqv4R5n3u?${params}`, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` }, cache: 'no-store',
    })
    if (!response.ok) throw new Error('CLINIC_PREVIEW_WEIGHTS_UNAVAILABLE')
    const data = await response.json()
    for (const record of data.records ?? []) {
      const measurement = clinicPortalWeight(record, patientId, unit)
      if (measurement) weights.set(measurement.id, measurement)
    }
    offset = data.offset
  } while (offset)
  return [...weights.values()]
}
