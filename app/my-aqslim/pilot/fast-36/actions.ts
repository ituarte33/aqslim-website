'use server'

import { clinicRuntimeMode } from '@/lib/clinic-runtime-policy'
import { patientActivePlanAllowsFast36 } from '@/lib/patient-active-plan'

import { getClinicFast36Sessions, saveClinicFast36Session } from '@/lib/clinic-fast36-store'
import { revalidatePath } from 'next/cache'
import {
  getFast36SessionsByPatient,
  updateFast36SessionOutcome,
} from '@/lib/airtable'
import { requireOwnPatient } from '@/lib/auth'
import {
  canConfirmFast36Outcome,
  isFast36ConfirmationOutcome,
  normalizeFast36Status,
  storedFast36StatusForOutcome,
  type Fast36Session,
} from '@/lib/fast36-policy'

const AIRTABLE_RECORD_ID = /^rec[A-Za-z0-9]{14}$/

export type Fast36ConfirmationResult =
  | { ok: true }
  | { ok: false; error: string }

export async function confirmFast36SessionAction(
  sessionId: string,
  outcome: unknown,
): Promise<Fast36ConfirmationResult> {
  try {
    const patient = await requireOwnPatient('fasting:write:self')
    if (clinicRuntimeMode() === 'candidate') return { ok: false, error: 'La candidata de publicación es de sólo lectura.' }
    if (!await patientActivePlanAllowsFast36(patient)) return { ok: false, error: 'FAST 36 no forma parte de tu plan actual.' }
    if (!AIRTABLE_RECORD_ID.test(sessionId) || !isFast36ConfirmationOutcome(outcome)) {
      return { ok: false, error: 'La confirmación no es válida.' }
    }

    const previewSessions = await getClinicFast36Sessions(patient.id)
    const previewSession = previewSessions.find(session => session.id === sessionId)
    if (previewSession) {
      if (!canConfirmFast36Outcome(previewSession, outcome)) return { ok: false, error: 'Confirma primero el horario con Clinic; esta sesión todavía no admite un resultado.' }
      const saved = await saveClinicFast36Session(patient.id, { ...previewSession, status: outcome, actualEndAt: outcome === 'completed' ? previewSession.plannedEndAt : null }, 'Paciente / confirmación propia')
      const readback = await getClinicFast36Sessions(patient.id)
      if (!readback.some(session => session.id === saved.id && session.status === outcome)) return { ok: false, error: 'No pudimos verificar la confirmación. Recarga antes de intentarlo nuevamente.' }
      revalidatePath('/my-aqslim/pilot/fast-36')
      return { ok: true }
    }
    // While Clinic Preview schedules exist, never fall through to a live write.
    if (previewSessions.length) return { ok: false, error: 'El horario cambió. Recarga y revisa la sesión vigente.' }

    const records = await getFast36SessionsByPatient(patient.id)
    const record = records.find(candidate => candidate.id === sessionId)
    if (!record) return { ok: false, error: 'No se encontró esta sesión en tu expediente.' }

    const startAt = record.fields['Inicio']
    const plannedEndAt = record.fields['Fin programado']
    if (!startAt || !plannedEndAt) {
      return { ok: false, error: 'La sesión no tiene un horario válido.' }
    }

    const session: Fast36Session = {
      id: record.id,
      week: record.fields['Semana'] ?? 0,
      startAt,
      plannedEndAt,
      actualEndAt: record.fields['Fin real'] ?? null,
      status: normalizeFast36Status(record.fields['Estado']),
    }
    const now = Date.now()
    if (!canConfirmFast36Outcome(session, outcome, now)) {
      return { ok: false, error: 'Esta sesión todavía no puede confirmarse o ya tiene un resultado.' }
    }

    // A completed 36-hour fast explicitly confirms the planned end. For an
    // early or safety stop, do not invent an exact end time the patient did
    // not provide; preserve the explicit outcome and leave Fin real untouched.
    const actualEndAt = outcome === 'completed'
      ? new Date(plannedEndAt).toISOString()
      : undefined

    await updateFast36SessionOutcome(
      sessionId,
      storedFast36StatusForOutcome(outcome),
      actualEndAt,
    )
    revalidatePath('/my-aqslim/pilot/fast-36')
    revalidatePath('/my-aqslim/pilot/weekly-summary')
    return { ok: true }
  } catch {
    return { ok: false, error: 'No pudimos guardar la confirmación. Inténtalo nuevamente.' }
  }
}
