import type { ClinicAccessReadiness } from './clinic-access-readiness'
import type { ClinicAccessReconciliation } from './clinic-access-reconciliation'

export type ClinicEntitlementDecision = {
  state: 'recommended' | 'existing' | 'blocked'
  stateLabel: string
  tier: string | null
  status: string | null
  source: string | null
  scope: 'preview_only' | null
  billing: 'none' | null
  lifecycle: 'pilot_only' | null
  reason: string
  notice: string
}

export function getClinicEntitlementDecision({
  readiness,
  reconciliation,
  pilotRecognitionAuthorized,
}: {
  readiness: ClinicAccessReadiness
  reconciliation: ClinicAccessReconciliation
  pilotRecognitionAuthorized: boolean
}): ClinicEntitlementDecision {
  if (readiness.entitlement.present) {
    return {
      state: 'existing',
      stateLabel: 'Conservar entitlement Preview existente',
      tier: readiness.entitlement.tier,
      status: readiness.entitlement.status,
      source: null,
      scope: null,
      billing: null,
      lifecycle: null,
      reason: 'Ya existe un registro Preview; esta lectura no propone reemplazar su tier ni su estado.',
      notice: 'Decisión de sólo lectura; el registro existente no fue modificado.',
    }
  }

  const uniqueAccount = reconciliation.account.state === 'found'
  const safeBinding = reconciliation.binding.state === 'matched' || reconciliation.binding.state === 'email_match'
  const pilotEligible = reconciliation.pilot.state === 'active' || pilotRecognitionAuthorized
  const eligible = readiness.readyForReview && uniqueAccount && safeBinding && pilotEligible

  if (!eligible) {
    return {
      state: 'blocked',
      stateLabel: 'Entitlement no determinable con seguridad',
      tier: null,
      status: null,
      source: null,
      scope: null,
      billing: null,
      lifecycle: null,
      reason: 'Se requiere un expediente válido, una cuenta única sin conflicto y autorización piloto comprobable.',
      notice: 'Ningún entitlement fue creado ni modificado.',
    }
  }

  return {
    state: 'recommended',
    stateLabel: 'Entitlement Preview recomendado',
    tier: 'internal_pilot',
    status: 'active',
    source: 'internal_pilot',
    scope: 'preview_only',
    billing: 'none',
    lifecycle: 'pilot_only',
    reason: 'MYAQ ELS 001 v0.1 da prioridad a internal_pilot para la cohorte autorizada en Preview; no aplica un tier comercial.',
    notice: 'Recomendación solamente; no se creó el Ledger, no se proyectó a Clerk y no se habilitó acceso.',
  }
}
