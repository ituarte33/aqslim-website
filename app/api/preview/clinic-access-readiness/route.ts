import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/auth'
import { getClienteById } from '@/lib/airtable'
import { getClinicAccessReadiness } from '@/lib/clinic-access-readiness'
import { isClinicFounderIdentity, isClinicPreviewEnvironment } from '@/lib/clinic-preview-policy'
import { pendingPatientSubjectId } from '@/lib/p4-provisioning-policy'
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
}

export async function GET(request: NextRequest) {
  try {
    await requireFounder()
    const patientId = request.nextUrl.searchParams.get('patientId')?.trim() ?? ''
    if (!/^rec[A-Za-z0-9]{14}$/.test(patientId)) {
      return NextResponse.json({ ok: false, error: 'invalid_patient' }, { status: 400 })
    }

    const patient = await getClienteById(patientId).catch(() => null)
    if (!patient) return NextResponse.json({ ok: false, error: 'patient_not_found' }, { status: 404 })

    const pendingSubject = pendingPatientSubjectId(patientId)
    const source = await getPreviewEntitlementSourceRecordByPatientRecordId({
      patientRecordId: patientId,
      canonicalSubjectId: pendingSubject,
    })
    const fields = patient.fields
    const readiness = getClinicAccessReadiness({
      patientId,
      email: String(fields['Email'] ?? ''),
      phone: String(fields['Teléfono'] ?? ''),
      language: String(fields['Idioma Preferido'] ?? ''),
      entitlement: source ? {
        present: true,
        binding: source.storedSubjectId === pendingSubject ? 'pending' : 'linked',
        tier: source.record.tier,
        status: source.record.status,
      } : null,
    })

    return NextResponse.json({ ok: true, readiness })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FORBIDDEN'
    const status = message === 'NOT_FOUND' ? 404 : message === 'UNAUTHENTICATED' ? 401 : 403
    return NextResponse.json({ ok: false }, { status })
  }
}
