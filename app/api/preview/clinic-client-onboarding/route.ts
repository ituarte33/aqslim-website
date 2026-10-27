import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/auth'
import { clinicRuntimeEnvironment, clinicRuntimeMode, isClinicRuntimeFounderIdentity } from '@/lib/clinic-runtime-policy'
import { resolveClinicClientOnboarding, executeClinicClientOnboarding } from '@/lib/clinic-client-onboarding'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Authorization' }
async function requireFounder() {
  const environment = clinicRuntimeEnvironment()
  if (!['candidate', 'production'].includes(clinicRuntimeMode(environment) ?? '')) throw new Error('NOT_FOUND')
  const actor = await getActor()
  if (!actor) throw new Error('UNAUTHENTICATED')
  if (!isClinicRuntimeFounderIdentity({ email: actor.email, environment })) throw new Error('FORBIDDEN')
  return actor
}
function failure(error: unknown) {
  const code = error instanceof Error ? error.message : 'UNAVAILABLE'
  const status = code === 'NOT_FOUND' || code === 'PATIENT_NOT_FOUND' ? 404 : code === 'UNAUTHENTICATED' ? 401 : code === 'FORBIDDEN' ? 403 : 409
  // Do not expose provider errors, metadata, account IDs, or credentials.
  const safe = ['NOT_FOUND', 'PATIENT_NOT_FOUND', 'UNAUTHENTICATED', 'FORBIDDEN', 'INVALID_PATIENT', 'REVIEW_CHANGED', 'ONBOARDING_BLOCKED', 'CLIENT_ONBOARDING_READ_ONLY', 'CONFIRMATION_REQUIRED'].includes(code) ? code : 'ONBOARDING_UNAVAILABLE'
  return NextResponse.json({ ok: false, error: safe }, { status, headers })
}
export async function GET(request: NextRequest) {
  try {
    await requireFounder()
    const { review } = await resolveClinicClientOnboarding(request.nextUrl.searchParams.get('patientId') ?? '')
    return NextResponse.json({ ok: true, review }, { headers })
  } catch (error) { return failure(error) }
}
export async function POST(request: NextRequest) {
  try {
    const actor = await requireFounder()
    if (request.headers.get('origin') !== request.nextUrl.origin) throw new Error('FORBIDDEN')
    if (clinicRuntimeMode() !== 'production') throw new Error('CLIENT_ONBOARDING_READ_ONLY')
    const body = await request.json() as Record<string, unknown>
    if (body.confirmation !== 'ALTA') throw new Error('CONFIRMATION_REQUIRED')
    if (typeof body.patientId !== 'string' || typeof body.fingerprint !== 'string') throw new Error('INVALID_PATIENT')
    const result = await executeClinicClientOnboarding({ patientId: body.patientId, fingerprint: body.fingerprint, actorEmail: actor.email })
    return NextResponse.json({ ok: true, result }, { headers })
  } catch (error) { return failure(error) }
}
