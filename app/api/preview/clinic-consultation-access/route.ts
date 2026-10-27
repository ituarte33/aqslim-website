import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/auth'
import { clinicRuntimeEnvironment, clinicRuntimeMode, isClinicRuntimeFounderIdentity } from '@/lib/clinic-runtime-policy'
import { reviewClinicAccessRenewal, executeClinicAccessRenewal } from '@/lib/clinic-access-renewal'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Authorization' }
async function founder() {
  const environment = clinicRuntimeEnvironment()
  if (!['candidate', 'production'].includes(clinicRuntimeMode(environment) ?? '')) throw new Error('NOT_FOUND')
  const actor = await getActor()
  if (!actor) throw new Error('UNAUTHENTICATED')
  if (!isClinicRuntimeFounderIdentity({ email: actor.email, environment })) throw new Error('FORBIDDEN')
  return actor
}
function failure(error: unknown) {
  const code = error instanceof Error ? error.message : ''
  const safe = ['NOT_FOUND', 'UNAUTHENTICATED', 'FORBIDDEN', 'ACCESS_RENEWAL_READ_ONLY', 'REVIEW_CHANGED', 'INVALID_PATIENT', 'CONFIRMATION_REQUIRED', 'ACCESS_RENEWAL_BLOCKED'].includes(code) ? code : 'ACCESS_RENEWAL_REQUIRES_REVIEW'
  return NextResponse.json({ ok: false, error: safe }, { headers, status: code === 'NOT_FOUND' ? 404 : code === 'UNAUTHENTICATED' ? 401 : code === 'FORBIDDEN' ? 403 : 409 })
}
export async function GET(request: NextRequest) {
  try {
    await founder()
    const { review } = await reviewClinicAccessRenewal({ patientId: request.nextUrl.searchParams.get('patientId') ?? '', consultationId: request.nextUrl.searchParams.get('consultationId') ?? '' })
    return NextResponse.json({ ok: true, review }, { headers })
  } catch (error) { return failure(error) }
}
export async function POST(request: NextRequest) {
  try {
    const actor = await founder()
    if (request.headers.get('origin') !== request.nextUrl.origin) throw new Error('FORBIDDEN')
    if (clinicRuntimeMode() !== 'production') throw new Error('ACCESS_RENEWAL_READ_ONLY')
    const body = await request.json() as Record<string, unknown>
    if (body.confirmation !== 'ACTUALIZAR ACCESO') throw new Error('CONFIRMATION_REQUIRED')
    if (typeof body.patientId !== 'string' || typeof body.consultationId !== 'string' || typeof body.fingerprint !== 'string' || !body.fingerprint) throw new Error('INVALID_PATIENT')
    const result = await executeClinicAccessRenewal({ patientId: body.patientId, consultationId: body.consultationId, fingerprint: body.fingerprint, actorEmail: actor.email })
    return NextResponse.json({ ok: true, result }, { headers })
  } catch (error) { return failure(error) }
}
