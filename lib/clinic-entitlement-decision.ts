import type { ClinicAccessReadiness } from './clinic-access-readiness'
import type { ClinicAccessReconciliation } from './clinic-access-reconciliation'

export type ClinicEntitlementDecision = {
  state: 'recommended' | 'migration_recommended' | 'existing' | 'blocked'
  stateLabel: string
  tier: string | null
  status: string | null
  source: string | null
  scope: 'preview_only' | null
  billing: 'none' | null
  lifecycle: 'pilot_only' | null
  migrationFrom: {
    tier: string
    status: string
    source: string
    trialStarts: string | null
    trialEnds: string | null
    reason: string
  } | null
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
  const uniqueAccount = reconciliation.account.state === 'found'
  const safeBinding = reconciliation.binding.state === 'matched' || reconciliation.binding.state === 'email_match'
  const pilotEligible = reconciliation.pilot.state === 'active' || pilotRecognitionAuthorized
  const eligible = readiness.readyForReview && uniqueAccount && safeBinding && pilotEligible
  const existing = readiness.entitlement
  const p5FounderCanary = existing.present
    && existing.binding === 'linked'
    && existing.tier === 'clinic_ai'
    && existing.status === 'trial'
    && existing.source === 'clinic_ai_trial'
    && existing.reason?.includes('P5_FOUNDER_REAL_USER_CANARY') === true

  if (p5FounderCanary && eligible) {
    return {
      state: 'migration_recommended',
      stateLabel: 'Migración controlada del canary P5 recomendada',
      tier: 'internal_pilot',
      status: 'active',
      source: 'internal_pilot',
      scope: 'preview_only',
      billing: 'none',
      lifecycle: 'pilot_only',
      migrationFrom: {
        tier: existing.tier as string,
        status: existing.status as string,
        source: existing.source as string,
        trialStarts: existing.trialStarts ?? null,
        trialEnds: existing.trialEnds ?? null,
        reason: existing.reason as string,
      },
      reason: 'El registro actual es el canary sintético P5 del Founder, no un entitlement comercial ni una visita clínica. Se propone migrarlo a internal_pilot activo conservando su evidencia histórica en la auditoría.',
      notice: 'Propuesta solamente; el canary P5 y la cuenta no fueron modificados.',
    }
  }

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
      migrationFrom: null,
      reason: 'Ya existe un registro Preview; esta lectura no propone reemplazar su tier ni su estado.',
      notice: 'Decisión de sólo lectura; el registro existente no fue modificado.',
    }
  }

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
      migrationFrom: null,
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
    migrationFrom: null,
    reason: 'MYAQ ELS 001 v0.1 da prioridad a internal_pilot para la cohorte autorizada en Preview; no aplica un tier comercial.',
    notice: 'Recomendación solamente; no se creó el Ledger, no se proyectó a Clerk y no se habilitó acceso.',
  }
}
