import { assertClinicSourceWriteAllowed } from '@/lib/clinic-runtime-policy'
import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/auth'
import { resolveClinicAccessSnapshot } from '@/lib/clinic-access-snapshot'
import { executeClinicAccessRestriction } from '@/lib/clinic-access-restriction-executor'
import { isClinicRuntimeFounderIdentity, isClinicRuntimeEnvironment } from '@/lib/clinic-runtime-policy'

function environment() {
  return {
    VERCEL_ENV: process.env.VERCEL_ENV,
    MYAQ_CLINIC_ENABLED: process.env.MYAQ_CLINIC_ENABLED, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
  }
}

export async function POST(request: NextRequest) {
  try {
    assertClinicSourceWriteAllowed()
    const currentEnvironment = environment()
    if (!isClinicRuntimeEnvironment(currentEnvironment)) throw new Error('NOT_FOUND')
    const actor = await getActor()
    if (!actor) throw new Error('UNAUTHENTICATED')
    if (!isClinicRuntimeFounderIdentity({ email: actor.email, environment: currentEnvironment })) throw new Error('FORBIDDEN')

    if (request.headers.get('origin') !== request.nextUrl.origin) throw new Error('FORBIDDEN')
    const body = await request.json() as Record<string, unknown>
    const patientId = typeof body.patientId === 'string' ? body.patientId.trim() : ''
    const action = body.action === 'suspend' || body.action === 'restore' ? body.action : null
    if (!/^rec[A-Za-z0-9]{14}$/.test(patientId) || !action) throw new Error('INVALID_REQUEST')
    const expectedConfirmation = action === 'suspend' ? 'RESTRINGIR' : 'RESTAURAR'
    if (body.confirmation !== expectedConfirmation) throw new Error('CONFIRMATION_REQUIRED')

    const snapshot = await resolveClinicAccessSnapshot({ actor, patientId })
    if (snapshot.readiness.reconciliation.binding.state !== 'matched') throw new Error('ACCOUNT_NOT_RESOLVED')
    if (!snapshot.accountUserId) throw new Error('ACCOUNT_NOT_RESOLVED')
    if (!snapshot.existingEntitlement) throw new Error('ENTITLEMENT_NOT_FOUND')

    const result = await executeClinicAccessRestriction({
      patientId,
      clerkUserId: snapshot.accountUserId,
      action,
      actorEmail: actor.email,
    })
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FORBIDDEN'
    const status = message === 'NOT_FOUND' || message === 'PATIENT_NOT_FOUND'
      ? 404
      : message === 'UNAUTHENTICATED'
        ? 401
        : message === 'FORBIDDEN'
          ? 403
          : 409
    console.error(JSON.stringify({
      level: 'error',
      message: 'clinic_access_restriction_blocked',
      code: message,
      requestId: request.headers.get('x-vercel-id'),
    }))
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
