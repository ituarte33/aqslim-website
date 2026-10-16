export type ClinicAccessEntitlement = {
  present: boolean
  binding: 'pending' | 'linked' | 'none'
  tier: string | null
  status: string | null
  source?: string | null
  trialStarts?: string | null
  trialEnds?: string | null
  reason?: string | null
  lastAccessChange?: string | null
}

export type ClinicAccessCheck = {
  key: 'patient_record' | 'email' | 'phone' | 'language'
  label: string
  passed: boolean
  required: boolean
}

export type ClinicAccessReadiness = {
  readyForReview: boolean
  accessState: 'linked' | 'pending_binding' | 'not_provisioned'
  accessLabel: string
  checks: ClinicAccessCheck[]
  blockers: string[]
  entitlement: ClinicAccessEntitlement
}

function validPatientRecordId(value: string): boolean {
  return /^rec[A-Za-z0-9]{14}$/.test(value.trim())
}

function validEmail(value: string): boolean {
  const email = value.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function getClinicAccessReadiness({
  patientId,
  email,
  phone,
  language,
  entitlement,
}: {
  patientId: string
  email: string
  phone: string
  language: string
  entitlement?: ClinicAccessEntitlement | null
}): ClinicAccessReadiness {
  const resolvedEntitlement: ClinicAccessEntitlement = entitlement ?? {
    present: false,
    binding: 'none',
    tier: null,
    status: null,
    source: null,
    trialStarts: null,
    trialEnds: null,
    reason: null,
    lastAccessChange: null,
  }
  const checks: ClinicAccessCheck[] = [
    { key: 'patient_record', label: 'Expediente estable identificado', passed: validPatientRecordId(patientId), required: true },
    { key: 'email', label: 'Email válido para identidad', passed: validEmail(email), required: true },
    { key: 'phone', label: 'Teléfono registrado', passed: Boolean(phone.trim()), required: false },
    { key: 'language', label: 'Idioma preferido definido', passed: Boolean(language.trim()), required: false },
  ]
  const blockers = checks
    .filter(check => check.required && !check.passed)
    .map(check => check.label)

  const accessState = !resolvedEntitlement.present
    ? 'not_provisioned'
    : resolvedEntitlement.binding === 'linked'
      ? 'linked'
      : 'pending_binding'
  const accessLabel = accessState === 'linked'
    ? 'Registro Preview vinculado'
    : accessState === 'pending_binding'
      ? 'Registro Preview pendiente de vincular'
      : 'Sin registro de acceso Preview'

  return {
    readyForReview: blockers.length === 0,
    accessState,
    accessLabel,
    checks,
    blockers,
    entitlement: resolvedEntitlement,
  }
}
