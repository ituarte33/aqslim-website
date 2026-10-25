import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/auth'
import { resolveClinicAccessSnapshot } from '@/lib/clinic-access-snapshot'
import { isClinicRuntimeFounderIdentity, isClinicRuntimeEnvironment } from '@/lib/clinic-runtime-policy'

function clinicEnvironment() {
  return {
    VERCEL_ENV: process.env.VERCEL_ENV,
    MYAQ_CLINIC_ENABLED: process.env.MYAQ_CLINIC_ENABLED, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
  }
}

async function requireFounder() {
  const environment = clinicEnvironment()
  if (!isClinicRuntimeEnvironment(environment)) throw new Error('NOT_FOUND')
  const actor = await getActor()
  if (!actor) throw new Error('UNAUTHENTICATED')
  if (!isClinicRuntimeFounderIdentity({ email: actor.email, environment })) throw new Error('FORBIDDEN')
  return actor
}

export async function GET(request: NextRequest) {
  try {
    const actor = await requireFounder()
    const patientId = request.nextUrl.searchParams.get('patientId')?.trim() ?? ''
    const snapshot = await resolveClinicAccessSnapshot({ actor, patientId })
    return NextResponse.json({ ok: true, readiness: snapshot.readiness })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FORBIDDEN'
    const status = message === 'NOT_FOUND' || message === 'PATIENT_NOT_FOUND'
      ? 404
      : message === 'INVALID_PATIENT'
        ? 400
        : message === 'UNAUTHENTICATED'
          ? 401
          : 403
    return NextResponse.json({ ok: false }, { status })
  }
}
