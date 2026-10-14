import { buildThirtyDayTrialWindow } from './entitlement-windows.ts'

export const ELIGIBLE_CLINIC_AI_TRIAL_VISIT_TYPES = new Set([
  'Cliente Nuevo',
  'Cliente Re-Inicio',
] as const)

export type ClinicAiTrialVisitType =
  | 'Cliente Nuevo'
  | 'Cliente subsecuente'
  | 'Cliente Re-Inicio'
  | 'Suplementos'
  | 'Suplementos + Envio'

export function isEligibleClinicAiTrialVisitType(
  value: unknown,
): value is 'Cliente Nuevo' | 'Cliente Re-Inicio' {
  return typeof value === 'string'
    && ELIGIBLE_CLINIC_AI_TRIAL_VISIT_TYPES.has(value as 'Cliente Nuevo' | 'Cliente Re-Inicio')
}

export function clinicAiTrialWindowForEligibleVisit({
  visitType,
  completedAt,
}: {
  visitType: unknown
  completedAt: Date
}): { trialStarts: string; trialEnds: string } | null {
  if (!isEligibleClinicAiTrialVisitType(visitType)) return null
  return buildThirtyDayTrialWindow(completedAt)
}
