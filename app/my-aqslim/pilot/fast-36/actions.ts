'use server'

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
    if (!AIRTABLE_RECORD_ID.test(sessionId) || !isFast36ConfirmationOutcome(outcome)) {
      return { ok: false, error: 'La confirmación no es válida.' }
    }

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
