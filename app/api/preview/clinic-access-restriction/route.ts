import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/auth'
import { resolveClinicAccessSnapshot } from '@/lib/clinic-access-snapshot'
import { executeClinicAccessRestriction } from '@/lib/clinic-access-restriction-executor'
import { isClinicFounderIdentity, isClinicPreviewEnvironment } from '@/lib/clinic-preview-policy'

function environment() {
  return {
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentEnvironment = environment()
    if (!isClinicPreviewEnvironment(currentEnvironment)) throw new Error('NOT_FOUND')
    const actor = await getActor()
    if (!actor) throw new Error('UNAUTHENTICATED')
    if (!isClinicFounderIdentity({ email: actor.email, environment: currentEnvironment })) throw new Error('FORBIDDEN')

    const body = await request.json() as Record<string, unknown>
    const patientId = typeof body.patientId === 'string' ? body.patientId.trim() : ''
    const action = body.action === 'suspend' || body.action === 'restore' ? body.action : null
    if (!/^rec[A-Za-z0-9]{14}$/.test(patientId) || !action) throw new Error('INVALID_REQUEST')
    const expectedConfirmation = action === 'suspend' ? 'RESTRINGIR' : 'RESTAURAR'
    if (body.confirmation !== expectedConfirmation) throw new Error('CONFIRMATION_REQUIRED')

    const snapshot = await resolveClinicAccessSnapshot({ actor, patientId })
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
