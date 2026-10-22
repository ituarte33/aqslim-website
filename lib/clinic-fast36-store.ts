import 'server-only'
import { isClinicPreviewEnvironment } from './clinic-preview-policy'
import { SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID } from './nutrition/synthetic-preview-policy'
import { decodeClinicFast36, encodeClinicFast36, type ClinicFast36Session } from './clinic-fast36'

const TABLE = 'tbljMLa7RCRzBYZBI'
const F = { key: 'fldRePC6iOWS18huz', patient: 'fldelIlWTfLuMEqfQ', patientId: 'fldbQwEqdKsNFn3Ke', at: 'fldlHBasIVIsc9O02', author: 'fldDXLZpA5kyN4zdJ', label: 'fldR7Pwa37N8UTIFC', type: 'fldRU6tGS0VkbkpU2', note: 'fldsYW351kG68jXLk', preview: 'fldXhnn0sn0z3XMSX' }
const validId = (id: string) => /^rec[A-Za-z0-9]{14}$/.test(id)
export function clinicFast36StoreEnabled() {
  return isClinicPreviewEnvironment({ VERCEL_ENV: process.env.VERCEL_ENV, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF }) && process.env.AIRTABLE_BASE_ID === SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID && Boolean(process.env.AIRTABLE_PAT)
}
async function request(path: string, init?: RequestInit) {
  if (!clinicFast36StoreEnabled()) throw new Error('FAST36_PREVIEW_DISABLED')
  const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${TABLE}${path}`, { ...init, cache: 'no-store', headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}`, 'Content-Type': 'application/json' } })
  if (!response.ok) throw new Error('FAST36_STORE_FAILED')
  return response.json()
}
export async function getClinicFast36Sessions(patientId: string): Promise<ClinicFast36Session[]> {
  if (!clinicFast36StoreEnabled()) return []
  if (!validId(patientId)) throw new Error('INVALID_PATIENT')
  const latest = new Map<number, ClinicFast36Session>()
  let offset: string | undefined
  do {
    const params = new URLSearchParams({ pageSize: '100', returnFieldsByFieldId: 'true', filterByFormula: `AND({Patient Record ID} = "${patientId}", {Preview Only} = TRUE())`, 'sort[0][field]': 'Note At', 'sort[0][direction]': 'desc' })
    if (offset) params.set('offset', offset)
    const data = await request(`?${params}`)
    for (const record of data.records ?? []) {
      if (record.fields?.[F.patientId] !== patientId || record.fields?.[F.preview] !== true) continue
      const session = decodeClinicFast36(record.fields[F.note], record.id)
      if (session && !latest.has(session.week)) latest.set(session.week, session)
    }
    offset = data.offset
  } while (offset)
  return [...latest.values()].sort((a, b) => a.week - b.week)
}
export async function saveClinicFast36Session(patientId: string, session: ClinicFast36Session, author: string) {
  if (!validId(patientId)) throw new Error('INVALID_PATIENT')
  const note = encodeClinicFast36(session)
  const data = await request('?returnFieldsByFieldId=true', { method: 'POST', body: JSON.stringify({ records: [{ fields: {
    [F.key]: `${patientId}:fast36:${session.week}:${Date.now()}`, [F.patient]: [patientId], [F.patientId]: patientId,
    [F.at]: new Date().toISOString(), [F.author]: author, [F.label]: 'FAST 36 Preview', [F.type]: 'General', [F.note]: note, [F.preview]: true,
  } }] }) })
  const id = data.records?.[0]?.id
  if (!id || !validId(id)) throw new Error('SAVE_UNVERIFIED')
  const readback = await request(`/${id}?returnFieldsByFieldId=true`)
  if (readback.fields?.[F.patientId] !== patientId || readback.fields?.[F.preview] !== true || readback.fields?.[F.note] !== note) throw new Error('SAVE_UNVERIFIED')
  return { ...session, id }
}
