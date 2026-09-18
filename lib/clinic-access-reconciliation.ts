export type ClinicAccessAccountEvidence = {
  boundPatientId: string | null
  hasPilotAccess: boolean
  isCurrentSession: boolean
  hasExplicitPilotMetadata: boolean
  legacyPilotPolicyApplies: boolean
}

export type ClinicAccessProvenanceCheck = {
  key: 'session_identity' | 'clinic_founder_policy' | 'explicit_pilot_metadata' | 'legacy_pilot_policy'
  label: string
  state: 'confirmed' | 'absent' | 'isolated' | 'not_applicable' | 'unavailable'
  detail: string
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
  provenance: {
    conclusion: string
    checks: ClinicAccessProvenanceCheck[]
  }
}

function unavailableProvenance(detail: string): ClinicAccessReconciliation['provenance'] {
  return {
    conclusion: detail,
    checks: [
      { key: 'session_identity', label: 'Sesión actual', state: 'unavailable', detail },
      { key: 'clinic_founder_policy', label: 'Acceso a Clinic Preview', state: 'unavailable', detail },
      { key: 'explicit_pilot_metadata', label: 'Metadata explícita de piloto', state: 'unavailable', detail },
      { key: 'legacy_pilot_policy', label: 'Políticas piloto P5/P5.1', state: 'unavailable', detail },
    ],
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
      provenance: unavailableProvenance('No se pudo determinar la procedencia sin una cuenta verificable.'),
    }
  }

  if (accounts.length === 0) {
    return {
      state: 'no_account',
      stateLabel: 'No se encontró una cuenta My AQSLIM para este email',
      account: { state: 'not_found', label: 'No encontrada' },
      binding: { state: 'not_applicable', label: 'No aplica sin cuenta' },
      pilot: { state: 'not_applicable', label: 'No aplica sin cuenta' },
      provenance: unavailableProvenance('No hay una cuenta coincidente cuya procedencia pueda diagnosticarse.'),
    }
  }

  if (accounts.length > 1) {
    return {
      state: 'review_needed',
      stateLabel: 'Se requiere revisión: el email coincide con varias cuentas',
      account: { state: 'ambiguous', label: 'Varias coincidencias' },
      binding: { state: 'not_applicable', label: 'Requiere resolver la cuenta correcta' },
      pilot: { state: 'not_applicable', label: 'No evaluado por ambigüedad' },
      provenance: unavailableProvenance('La procedencia no se atribuye mientras existan varias cuentas coincidentes.'),
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
  const provenanceChecks: ClinicAccessProvenanceCheck[] = [
    {
      key: 'session_identity',
      label: 'Sesión actual',
      state: account.isCurrentSession ? 'confirmed' : 'not_applicable',
      detail: account.isCurrentSession
        ? 'La cuenta encontrada es la misma cuenta autenticada en esta sesión.'
        : 'La cuenta encontrada no es la cuenta autenticada en esta sesión.',
    },
    {
      key: 'clinic_founder_policy',
      label: 'Acceso a Clinic Preview',
      state: account.isCurrentSession ? 'confirmed' : 'not_applicable',
      detail: account.isCurrentSession
        ? 'La sesión entra por la regla Founder-only exclusiva de Clinic Preview.'
        : 'La regla Founder-only aplica a la sesión del operador, no a esta cuenta seleccionada.',
    },
    {
      key: 'explicit_pilot_metadata',
      label: 'Metadata explícita de piloto',
      state: account.hasExplicitPilotMetadata ? 'confirmed' : 'absent',
      detail: account.hasExplicitPilotMetadata
        ? 'La cuenta contiene una marca explícita y válida del piloto My AQSLIM.'
        : 'No se observó una marca explícita del piloto My AQSLIM en la cuenta.',
    },
    {
      key: 'legacy_pilot_policy',
      label: 'Políticas piloto P5/P5.1',
      state: account.legacyPilotPolicyApplies ? 'confirmed' : 'isolated',
      detail: account.legacyPilotPolicyApplies
        ? 'Una política piloto anterior aplica a esta sesión.'
        : 'Las políticas P5/P5.1 permanecen aisladas en sus propias ramas y no se heredan en Clinic Preview.',
    },
  ]
  const provenanceConclusion = account.isCurrentSession
    && !account.hasExplicitPilotMetadata
    && !account.legacyPilotPolicyApplies
    ? 'El acceso observado proviene de la regla Founder-only de Clinic Preview; no demuestra por sí solo un piloto My AQSLIM activo.'
    : account.hasExplicitPilotMetadata || account.legacyPilotPolicyApplies
      ? 'Se observó una fuente válida de acceso piloto My AQSLIM.'
      : 'No se observó una fuente válida de acceso piloto My AQSLIM desde esta cuenta.'

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
    provenance: {
      conclusion: provenanceConclusion,
      checks: provenanceChecks,
    },
  }
}
