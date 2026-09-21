import type { ClinicAccessReadiness } from './clinic-access-readiness'
import type { ClinicAccessReconciliation } from './clinic-access-reconciliation'

export type ClinicEntitlementDecision = {
  state: 'recommended' | 'migration_recommended' | 'existing' | 'blocked'
  migrationKind: 'p5_founder_canary' | 'authorized_clinic_trial' | null
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
    lastAccessChange: string
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
  const authorizedClinicTrial = existing.present
    && existing.tier === 'clinic_ai'
    && existing.status === 'trial'
    && existing.source === 'clinic_ai_trial'
    && existing.reason?.includes('P5_FOUNDER_REAL_USER_CANARY') !== true
    && eligible

  if (p5FounderCanary && eligible) {
    return {
      state: 'migration_recommended',
      migrationKind: 'p5_founder_canary',
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
        lastAccessChange: existing.lastAccessChange as string,
        reason: existing.reason as string,
      },
      reason: 'El registro actual es el canary sintético P5 del Founder, no un entitlement comercial ni una visita clínica. Se propone migrarlo a internal_pilot activo conservando su evidencia histórica en la auditoría.',
      notice: 'Propuesta solamente; el canary P5 y la cuenta no fueron modificados.',
    }
  }

  if (authorizedClinicTrial) {
    return {
      state: 'migration_recommended',
      migrationKind: 'authorized_clinic_trial',
      stateLabel: 'Migración controlada del trial Clinic AI recomendada',
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
        lastAccessChange: existing.lastAccessChange ?? 'unknown',
        reason: existing.reason ?? 'ordinary clinic_ai trial',
      },
      reason: 'El expediente pertenece a la cohorte privada autorizada y tiene un trial Clinic AI Preview sin cobro. Se propone migrarlo a internal_pilot activo conservando los valores anteriores en la auditoría.',
      notice: 'Propuesta solamente; el entitlement existente y la cuenta no fueron modificados.',
    }
  }

  if (readiness.entitlement.present) {
    return {
      state: 'existing',
      migrationKind: null,
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
      migrationKind: null,
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
    migrationKind: null,
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
