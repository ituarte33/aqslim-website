import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/auth'
import { executeClinicAccessActivation } from '@/lib/clinic-access-activation-executor'
import {
  clinicAccessOperationIsExact,
  hasExplicitClinicAccessExecutionConfirmation,
  isClinicAccessExecutionEnabled,
} from '@/lib/clinic-access-execution-policy'
import { resolveClinicAccessSnapshot } from '@/lib/clinic-access-snapshot'
import { isClinicFounderIdentity, isClinicPreviewEnvironment } from '@/lib/clinic-preview-policy'

function environment() {
  return {
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
    AIRTABLE_PAT: process.env.AIRTABLE_PAT,
    MYAQ_CLINIC_ACCESS_EXECUTION: process.env.MYAQ_CLINIC_ACCESS_EXECUTION,
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
    const mode = body.mode === 'execute' ? 'execute' : body.mode === 'validate' ? 'validate' : null
    if (!mode) return NextResponse.json({ ok: false, error: 'invalid_mode' }, { status: 400 })

    const snapshot = await resolveClinicAccessSnapshot({ actor, patientId })
    const exact = clinicAccessOperationIsExact({
      actorEmail: actor.email,
      actorUserId: actor.clerkUserId,
      patientEmail: snapshot.patientEmail,
      accountUserId: snapshot.accountUserId,
      expectedFingerprint: snapshot.readiness.authorization.operationFingerprint,
      suppliedFingerprint: body.operationFingerprint,
      authorizationState: snapshot.readiness.authorization.state,
      acknowledgements: body.acknowledgements,
    })
    if (!exact) return NextResponse.json({ ok: false, error: 'authorization_mismatch' }, { status: 409 })

    const migrationExecutionAuthorized = snapshot.readiness.entitlementDecision.state === 'migration_recommended'
    const executionEnabled = migrationExecutionAuthorized || isClinicAccessExecutionEnabled(currentEnvironment)
    if (mode === 'validate') {
      return NextResponse.json({
        ok: true,
        validation: {
          state: 'validated',
          operationFingerprint: snapshot.readiness.authorization.operationFingerprint,
          executionEnabled,
          persisted: false,
        },
      })
    }

    if (!executionEnabled) {
      return NextResponse.json({ ok: false, error: 'execution_disabled' }, { status: 409 })
    }
    if (!hasExplicitClinicAccessExecutionConfirmation(body.executionConfirmation)) {
      return NextResponse.json({ ok: false, error: 'execution_confirmation_required' }, { status: 409 })
    }

    const result = await executeClinicAccessActivation({
      patientId,
      clerkUserId: actor.clerkUserId,
      fingerprint: snapshot.readiness.authorization.operationFingerprint as string,
      operation: migrationExecutionAuthorized ? 'migrate_p5_canary' : 'activate_internal_pilot',
    })
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FORBIDDEN'
    const status = message === 'NOT_FOUND' || message === 'PATIENT_NOT_FOUND'
      ? 404
      : message === 'INVALID_PATIENT'
        ? 400
        : message === 'UNAUTHENTICATED'
          ? 401
          : message === 'FORBIDDEN'
            ? 403
            : 409
    return NextResponse.json({ ok: false, error: 'activation_blocked' }, { status })
  }
}
