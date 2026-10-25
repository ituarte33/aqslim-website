import { assertClinicSourceWriteAllowed, clinicUsesPreviewRecords, clinicRecordKey, clinicRecordFilter, clinicRecordInScope } from './clinic-runtime-policy.ts'
import 'server-only'
import { isClinicRuntimeEnvironment } from './clinic-runtime-policy.ts'
import { SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID } from './nutrition/synthetic-preview-policy.ts'
import { decodeClinicMaterialEvent, type ClinicMaterialEvent } from './clinic-plan-materials.ts'

const TABLE = 'tbljMLa7RCRzBYZBI'
const F = { key: 'fldRePC6iOWS18huz', patient: 'fldelIlWTfLuMEqfQ', patientId: 'fldbQwEqdKsNFn3Ke', at: 'fldlHBasIVIsc9O02', author: 'fldDXLZpA5kyN4zdJ', label: 'fldR7Pwa37N8UTIFC', type: 'fldRU6tGS0VkbkpU2', note: 'fldsYW351kG68jXLk', preview: 'fldXhnn0sn0z3XMSX' }
export function clinicMaterialStoreEnabled() {
  return isClinicRuntimeEnvironment({ VERCEL_ENV: process.env.VERCEL_ENV, MYAQ_CLINIC_ENABLED: process.env.MYAQ_CLINIC_ENABLED, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF })
    && process.env.AIRTABLE_BASE_ID === SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID && Boolean(process.env.AIRTABLE_PAT)
}
async function request(path: string, init?: RequestInit) {
  if (init?.method && init.method !== 'GET') assertClinicSourceWriteAllowed()
  if (!clinicMaterialStoreEnabled()) throw new Error('MATERIAL_PREVIEW_DISABLED')
  const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${TABLE}${path}`, {
    ...init, cache: 'no-store', headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}`, 'Content-Type': 'application/json' },
  })
  if (!response.ok) throw new Error('MATERIAL_STORE_UNAVAILABLE')
  return response.json()
}
export async function getClinicMaterialEvents(patientId: string): Promise<ClinicMaterialEvent[]> {
  if (!clinicMaterialStoreEnabled()) return []
  if (!/^rec[A-Za-z0-9]{14}$/.test(patientId)) throw new Error('INVALID_PATIENT')
  const events: ClinicMaterialEvent[] = []
  let offset: string | undefined
  do {
    const params = new URLSearchParams({ pageSize: '100', returnFieldsByFieldId: 'true',
      filterByFormula: clinicRecordFilter(patientId, 'Note Key'),
      'sort[0][field]': 'Note At', 'sort[0][direction]': 'desc' })
    if (offset) params.set('offset', offset)
    const data = await request(`?${params}`)
    for (const record of data.records ?? []) {
      if (!clinicRecordInScope(record.fields ?? {}, patientId, F)
        || !record.fields?.[F.patient]?.includes(patientId)) continue
      const event = decodeClinicMaterialEvent(record.fields[F.note])
      if (event) events.push(event)
    }
    offset = data.offset
  } while (offset)
  return events
}
export async function saveClinicMaterialEvent(patientId: string, event: ClinicMaterialEvent, author: string) {
  if (!/^rec[A-Za-z0-9]{14}$/.test(patientId)) throw new Error('INVALID_PATIENT')
  const note = JSON.stringify(event)
  if (!decodeClinicMaterialEvent(note)) throw new Error('INVALID_MATERIAL_EVENT')
  const data = await request('?returnFieldsByFieldId=true', { method: 'POST', body: JSON.stringify({ records: [{ fields: {
    [F.key]: clinicRecordKey(`${patientId}:materials:${event.action}:${event.at}`), [F.patient]: [patientId], [F.patientId]: patientId,
    [F.at]: event.at, [F.author]: author, [F.label]: 'Clinic · materiales e historial',
    [F.type]: 'General', [F.note]: note, [F.preview]: clinicUsesPreviewRecords(),
  } }] }) })
  const id = data.records?.[0]?.id
  if (!/^rec[A-Za-z0-9]{14}$/.test(id ?? '')) throw new Error('MATERIAL_SAVE_UNVERIFIED')
  const readback = await request(`/${id}?returnFieldsByFieldId=true`)
  if (!clinicRecordInScope(readback.fields ?? {}, patientId, F)
    || !readback.fields?.[F.patient]?.includes(patientId) || readback.fields?.[F.note] !== note) throw new Error('MATERIAL_SAVE_UNVERIFIED')
}
