import { createHash } from 'node:crypto'
import type { ClinicAccessActivationReadiness } from './clinic-access-activation-readiness'
import type { ClinicEntitlementDecision } from './clinic-entitlement-decision'

export type ClinicAccessAuthorizationAcknowledgement = {
  key: 'patient_identity' | 'preview_scope' | 'no_external_effects'
  label: string
}

export type ClinicAccessAuthorizationGate = {
  state: 'ready' | 'blocked' | 'no_action'
  stateLabel: string
  operationFingerprint: string | null
  acknowledgements: ClinicAccessAuthorizationAcknowledgement[]
  executionEnabled: false
  duplicateProtection: 'fingerprint_bound'
  notice: string
}

export function getClinicAccessAuthorizationGate({
  patientId,
  patientEmail,
  activation,
  entitlementDecision,
}: {
  patientId: string
  patientEmail: string
  activation: ClinicAccessActivationReadiness
  entitlementDecision: ClinicEntitlementDecision
}): ClinicAccessAuthorizationGate {
  const email = patientEmail.trim().toLowerCase()
  const recommendationIsExact = entitlementDecision.state === 'recommended'
    && entitlementDecision.tier === 'internal_pilot'
    && entitlementDecision.status === 'active'
    && entitlementDecision.source === 'internal_pilot'
    && entitlementDecision.scope === 'preview_only'
    && entitlementDecision.billing === 'none'
    && entitlementDecision.lifecycle === 'pilot_only'

  const acknowledgements: ClinicAccessAuthorizationAcknowledgement[] = [
    { key: 'patient_identity', label: `Confirmo el expediente y el email ${email || 'no verificable'}.` },
    { key: 'preview_scope', label: 'Confirmo internal_pilot activo exclusivamente en Preview.' },
    { key: 'no_external_effects', label: 'Confirmo que esta prueba no debe crear acceso, enviar invitaciones ni generar cobros.' },
  ]

  if (activation.state === 'no_action') {
    return {
      state: 'no_action',
      stateLabel: 'No se requiere autorización; no hay acciones pendientes',
      operationFingerprint: null,
      acknowledgements,
      executionEnabled: false,
      duplicateProtection: 'fingerprint_bound',
      notice: 'El estado observado ya está reconciliado; no se preparó otra operación.',
    }
  }

  if (activation.state !== 'ready_for_authorization' || !patientId || !email || !recommendationIsExact) {
    return {
      state: 'blocked',
      stateLabel: 'Autorización bloqueada por verificaciones pendientes',
      operationFingerprint: null,
      acknowledgements,
      executionEnabled: false,
      duplicateProtection: 'fingerprint_bound',
      notice: 'No se puede validar una autorización mientras identidad, alcance o entitlement sean ambiguos.',
    }
  }

  const operationFingerprint = createHash('sha256')
    .update([patientId, email, 'internal_pilot', 'active', 'internal_pilot', 'preview_only'].join('|'))
    .digest('hex')
    .slice(0, 16)

  return {
    state: 'ready',
    stateLabel: 'Lista para validación controlada en esta sesión',
    operationFingerprint,
    acknowledgements,
    executionEnabled: false,
    duplicateProtection: 'fingerprint_bound',
    notice: 'La validación será temporal y quedará ligada a esta huella; no se guardará ni ejecutará ninguna activación.',
  }
}
