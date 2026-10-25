import { assertClinicSourceWriteAllowed } from '@/lib/clinic-runtime-policy'
import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/auth'
import { getClienteById, getConsultasByPatientId, getCuestionariosByCliente } from '@/lib/airtable'
import { buildClinicRecordSnapshot } from '@/lib/clinic-record'
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
}

export async function GET(request: NextRequest) {
  try {
    await requireFounder()
    const patientId = request.nextUrl.searchParams.get('patientId')?.trim() ?? ''
    if (!/^rec[A-Za-z0-9]{14}$/.test(patientId)) {
      return NextResponse.json({ ok: false, error: 'invalid_patient' }, { status: 400 })
    }

    const patient = await getClienteById(patientId)
    const patientName = String(patient.fields['Nombre Completo'] ?? '').trim()
    if (!patientName) return NextResponse.json({ ok: false, error: 'patient_not_found' }, { status: 404 })

    const [consultations, questionnaires] = await Promise.all([
      getConsultasByPatientId(patientId, patientName),
      getCuestionariosByCliente(patientName, 100),
    ])

    return NextResponse.json({
      ok: true,
      readOnly: true,
      record: buildClinicRecordSnapshot({ patient, consultations, questionnaires }),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FORBIDDEN'
    const status = message === 'CLINIC_CANDIDATE_READ_ONLY' ? 409 : message === 'NOT_FOUND' ? 404 : message === 'UNAUTHENTICATED' ? 401 : 403
    return NextResponse.json({ ok: false }, { status })
  }
}
