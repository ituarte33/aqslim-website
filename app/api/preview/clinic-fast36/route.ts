import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/auth'
import { getClienteById } from '@/lib/airtable'
import { isClinicFounderIdentity } from '@/lib/clinic-preview-policy'
import { buildClinicFast36 } from '@/lib/clinic-fast36'
import { clinicFast36StoreEnabled, getClinicFast36Sessions, saveClinicFast36Session } from '@/lib/clinic-fast36-store'

async function founder() {
  if (!clinicFast36StoreEnabled()) throw new Error('NOT_FOUND')
  const actor = await getActor()
  if (!actor || !isClinicFounderIdentity({ email: actor.email, environment: { VERCEL_ENV: process.env.VERCEL_ENV, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF } })) throw new Error('FORBIDDEN')
  return actor
}
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  return NextResponse.json({ ok: false }, { status: message === 'NOT_FOUND' ? 404 : message === 'FORBIDDEN' ? 403 : 500 })
}
export async function GET(request: NextRequest) {
  try {
    await founder()
    const patientId = request.nextUrl.searchParams.get('patientId') ?? ''
    if (!/^rec[A-Za-z0-9]{14}$/.test(patientId)) return NextResponse.json({ ok: false }, { status: 400 })
    return NextResponse.json({ ok: true, sessions: await getClinicFast36Sessions(patientId) })
  } catch (error) { return failure(error) }
}
export async function POST(request: NextRequest) {
  try {
    const actor = await founder()
    const body = await request.json()
    const session = buildClinicFast36(body)
    if (!session || !/^rec[A-Za-z0-9]{14}$/.test(body.patientId ?? '')) return NextResponse.json({ ok: false }, { status: 400 })
    if (!await getClienteById(body.patientId)) return NextResponse.json({ ok: false }, { status: 404 })
    const current = (await getClinicFast36Sessions(body.patientId)).find(item => item.week === session.week)
    if (current && !['pending', 'active'].includes(current.status)) return NextResponse.json({ ok: false, error: 'outcome_already_recorded' }, { status: 409 })
    if ((current?.id ?? '') !== (body.expectedId ?? '')) return NextResponse.json({ ok: false, error: 'session_changed' }, { status: 409 })
    if (current && current.startAt === session.startAt && current.provisional === session.provisional && current.timeZone === session.timeZone) return NextResponse.json({ ok: true, session: current })
    const saved = await saveClinicFast36Session(body.patientId, session, actor.email)
    return NextResponse.json({ ok: true, session: saved })
  } catch (error) { return failure(error) }
}
