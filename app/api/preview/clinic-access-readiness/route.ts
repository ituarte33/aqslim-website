import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { getActor } from '@/lib/auth'
import { getClienteById } from '@/lib/airtable'
import { getClinicAccessActivationReadiness } from '@/lib/clinic-access-activation-readiness'
import { getClinicAccessAuthorizationGate } from '@/lib/clinic-access-authorization'
import { getClinicAccessReconciliation } from '@/lib/clinic-access-reconciliation'
import { getClinicAccessReadiness } from '@/lib/clinic-access-readiness'
import { getClinicEntitlementDecision } from '@/lib/clinic-entitlement-decision'
import { isClinicFounderIdentity, isClinicPreviewEnvironment } from '@/lib/clinic-preview-policy'
import { isSyntheticPreviewEnvironment } from '@/lib/nutrition/synthetic-preview-policy'
import { pendingPatientSubjectId } from '@/lib/p4-provisioning-policy'
import { isP5FounderCanaryEnvironment } from '@/lib/p5-founder-canary-policy'
import { pilotAccessFromMetadata } from '@/lib/pilot-policy'
import { getPreviewEntitlementSourceRecordByPatientRecordId } from '@/lib/preview-entitlement-store'

function clinicEnvironment() {
  return {
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
  }
}

async function requireFounder() {
  const environment = clinicEnvironment()
  if (!isClinicPreviewEnvironment(environment)) throw new Error('NOT_FOUND')
  const actor = await getActor()
  if (!actor) throw new Error('UNAUTHENTICATED')
  if (!isClinicFounderIdentity({ email: actor.email, environment })) throw new Error('FORBIDDEN')
  return actor
}

export async function GET(request: NextRequest) {
  try {
    const actor = await requireFounder()
    const patientId = request.nextUrl.searchParams.get('patientId')?.trim() ?? ''
    if (!/^rec[A-Za-z0-9]{14}$/.test(patientId)) {
      return NextResponse.json({ ok: false, error: 'invalid_patient' }, { status: 400 })
    }

    const patient = await getClienteById(patientId).catch(() => null)
    if (!patient) return NextResponse.json({ ok: false, error: 'patient_not_found' }, { status: 404 })

    const fields = patient.fields
    const email = String(fields['Email'] ?? '').trim().toLowerCase()
    const pendingSubject = pendingPatientSubjectId(patientId)
    const pilotPolicyEnvironment = {
      ...clinicEnvironment(),
      MYAQ_P5_FOUNDER_CANARY: process.env.MYAQ_P5_FOUNDER_CANARY,
    }
    const legacyPilotPolicyApplies = isSyntheticPreviewEnvironment(pilotPolicyEnvironment)
      || isP5FounderCanaryEnvironment(pilotPolicyEnvironment)
    const [sourceResult, accountResult] = await Promise.allSettled([
      getPreviewEntitlementSourceRecordByPatientRecordId({
        patientRecordId: patientId,
        canonicalSubjectId: pendingSubject,
      }),
      email
        ? clerkClient().then(async clerk => {
            const result = await clerk.users.getUserList({ emailAddress: [email], limit: 3 })
            return result.data
              .filter(user => user.emailAddresses.some(address => address.emailAddress.trim().toLowerCase() === email))
              .map(user => {
                const boundPatientId = typeof user.privateMetadata?.aqslimPatientId === 'string'
                  ? user.privateMetadata.aqslimPatientId.trim() || null
                  : null
                const hasExplicitPilot = pilotAccessFromMetadata(user.privateMetadata) !== null
                const isCurrentSession = user.id === actor.clerkUserId
                const hasCurrentFounderPilot = isCurrentSession && actor.shadowPilotFeatures !== null
                return {
                  boundPatientId,
                  hasPilotAccess: hasExplicitPilot || hasCurrentFounderPilot,
                  isCurrentSession,
                  hasExplicitPilotMetadata: hasExplicitPilot,
                  legacyPilotPolicyApplies: isCurrentSession && legacyPilotPolicyApplies,
                }
              })
          })
        : Promise.resolve(null),
    ])
    const source = sourceResult.status === 'fulfilled' ? sourceResult.value : null
    const readiness = getClinicAccessReadiness({
      patientId,
      email,
      phone: String(fields['Teléfono'] ?? ''),
      language: String(fields['Idioma Preferido'] ?? ''),
      entitlement: source ? {
        present: true,
        binding: source.storedSubjectId === pendingSubject ? 'pending' : 'linked',
        tier: source.record.tier,
        status: source.record.status,
      } : null,
    })
    const reconciliation = getClinicAccessReconciliation({
      patientId,
      accounts: accountResult.status === 'fulfilled' ? accountResult.value : null,
    })
    const pilotRecognitionAuthorized = email === actor.email.trim().toLowerCase()
      && reconciliation.provenance.checks.some(check => check.key === 'session_identity' && check.state === 'confirmed')
    const entitlementDecision = getClinicEntitlementDecision({
      readiness,
      reconciliation,
      pilotRecognitionAuthorized,
    })
    const activation = getClinicAccessActivationReadiness({
      readiness,
      reconciliation,
      pilotRecognitionAuthorized,
      entitlementDecision,
    })
    const authorization = getClinicAccessAuthorizationGate({
      patientId,
      patientEmail: email,
      activation,
      entitlementDecision,
    })

    return NextResponse.json({ ok: true, readiness: { ...readiness, reconciliation, entitlementDecision, activation, authorization } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FORBIDDEN'
    const status = message === 'NOT_FOUND' ? 404 : message === 'UNAUTHENTICATED' ? 401 : 403
    return NextResponse.json({ ok: false }, { status })
  }
}
