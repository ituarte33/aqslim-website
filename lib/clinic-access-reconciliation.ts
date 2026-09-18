export type ClinicAccessAccountEvidence = {
  boundPatientId: string | null
  hasPilotAccess: boolean
}

export type ClinicAccessReconciliation = {
  state: 'consistent' | 'review_needed' | 'no_account' | 'unavailable'
  stateLabel: string
  account: {
    state: 'found' | 'not_found' | 'ambiguous' | 'unavailable'
    label: string
  }
  binding: {
    state: 'matched' | 'email_match' | 'conflict' | 'not_applicable' | 'unavailable'
    label: string
  }
  pilot: {
    state: 'active' | 'not_confirmed' | 'not_applicable' | 'unavailable'
    label: string
  }
}

export function getClinicAccessReconciliation({
  patientId,
  accounts,
}: {
  patientId: string
  accounts: ClinicAccessAccountEvidence[] | null
}): ClinicAccessReconciliation {
  if (accounts === null) {
    return {
      state: 'unavailable',
      stateLabel: 'Reconciliación no verificable; no se realizaron cambios',
      account: { state: 'unavailable', label: 'No verificable sin email válido o lectura disponible' },
      binding: { state: 'unavailable', label: 'No verificable en este momento' },
      pilot: { state: 'unavailable', label: 'No verificable en este momento' },
    }
  }

  if (accounts.length === 0) {
    return {
      state: 'no_account',
      stateLabel: 'No se encontró una cuenta My AQSLIM para este email',
      account: { state: 'not_found', label: 'No encontrada' },
      binding: { state: 'not_applicable', label: 'No aplica sin cuenta' },
      pilot: { state: 'not_applicable', label: 'No aplica sin cuenta' },
    }
  }

  if (accounts.length > 1) {
    return {
      state: 'review_needed',
      stateLabel: 'Se requiere revisión: el email coincide con varias cuentas',
      account: { state: 'ambiguous', label: 'Varias coincidencias' },
      binding: { state: 'not_applicable', label: 'Requiere resolver la cuenta correcta' },
      pilot: { state: 'not_applicable', label: 'No evaluado por ambigüedad' },
    }
  }

  const account = accounts[0]
  const binding = account.boundPatientId === patientId
    ? { state: 'matched' as const, label: 'Confirmado con este expediente' }
    : account.boundPatientId
      ? { state: 'conflict' as const, label: 'Conflicto: apunta a otro expediente' }
      : { state: 'email_match' as const, label: 'Coincidencia única por email; vínculo explícito pendiente' }
  const pilot = account.hasPilotAccess
    ? { state: 'active' as const, label: 'Activo en Preview' }
    : { state: 'not_confirmed' as const, label: 'No confirmado desde esta lectura' }
  const consistent = binding.state !== 'conflict' && pilot.state === 'active'

  return {
    state: consistent ? 'consistent' : 'review_needed',
    stateLabel: binding.state === 'conflict'
      ? 'Se requiere revisión: la cuenta apunta a otro expediente'
      : pilot.state === 'not_confirmed'
        ? 'Cuenta encontrada; acceso piloto no confirmado'
        : binding.state === 'email_match'
          ? 'Cuenta y piloto encontrados por email único'
          : 'Cuenta, expediente y piloto reconciliados',
    account: { state: 'found', label: 'Encontrada' },
    binding,
    pilot,
  }
}
