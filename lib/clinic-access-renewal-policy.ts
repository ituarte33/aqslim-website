import type { CanonicalEntitlementRecord } from './entitlement-record'
import { provisioningPlanForClinicVisit } from './p4-provisioning-policy'
import { isQualifyingClinicVisitType, lastCompletedVisitFromConsultations } from './clinic-visit-policy'
import { clinicGraceEndDate } from './entitlement-windows'
import { isEligibleClinicAiTrialVisitType } from './clinic-ai-trial-policy'
import type { LinkedClinicConsultation } from './clinic-consultation-source'

export type ClinicAccessRenewalPlan = {
  state: 'update' | 'unchanged' | 'preserved' | 'onboarding_required' | 'blocked'
  message: string
  changes: Partial<CanonicalEntitlementRecord>
  trialStarts: string | null
  trialEnds: string | null
  lastCompletedVisit: string | null
}
function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
}
export function planClinicAccessRenewal(input: {
  patientId: string; consultationId: string; visits: LinkedClinicConsultation[];
  record: CanonicalEntitlementRecord | null; isOperational: boolean; patientAvailable: boolean; today: string
}): ClinicAccessRenewalPlan {
  const { record } = input
  const visits = input.visits.filter(v => v.fields['ID Cliente']?.includes(input.patientId))
  const selected = visits.find(v => v.id === input.consultationId)
  const lastCompletedVisit = lastCompletedVisitFromConsultations(visits)
  const result = (state: ClinicAccessRenewalPlan['state'], message: string, changes: Partial<CanonicalEntitlementRecord> = {}): ClinicAccessRenewalPlan => ({
    state, message, changes, lastCompletedVisit,
    trialStarts: changes.trialStarts ?? record?.trialStarts ?? null,
    trialEnds: changes.trialEnds ?? record?.trialEnds ?? null,
  })
  if (!input.patientAvailable) return result('blocked', 'El expediente está archivado o en revisión. Conserva su restricción de acceso.')
  if (visits.some(v => isQualifyingClinicVisitType(v.fields['Tipo de Consulta']) && !validDate(v.fields['Fecha Consulta']))) {
    return result('blocked', 'Hay fechas de consulta por verificar antes de actualizar el acceso.')
  }
  if (!selected || !isQualifyingClinicVisitType(selected.fields['Tipo de Consulta'])
    || !validDate(selected.fields['Fecha Consulta']) || selected.fields['Fecha Consulta'] > input.today
    || !lastCompletedVisit || lastCompletedVisit > input.today) {
    return result('blocked', 'La consulta debe estar registrada, vinculada a este paciente y tener una fecha válida que no sea futura.')
  }
  if (!record) return result('onboarding_required', 'La consulta está registrada. Completa primero el alta del cliente para vincular su cuenta y asignar acceso.')
  if (!input.isOperational || !['portal_basic', 'clinic_ai'].includes(record.tier)
    || !['clinic_visit', 'clinic_ai_trial'].includes(record.source) || record.paidThrough || record.squareSubscriptionId) {
    return result('preserved', 'Se conserva el acceso existente, incluidas las condiciones de piloto, suscripción o asignación administrativa.')
  }
  if (record.override || ['suspended', 'expired', 'canceled'].includes(record.status) || record.accessExpires) {
    return result('preserved', 'Se conserva la restricción o condición especial existente. Una consulta no reactiva el acceso manualmente restringido.')
  }
  if (record.entitlementReason.includes(`MYAQ_CLINIC_ACCESS_VISIT:${input.consultationId};`)) {
    return result('unchanged', 'El acceso de esta consulta ya fue actualizado y verificado.')
  }
  const changes: Partial<CanonicalEntitlementRecord> = { lastCompletedVisit, graceEnds: clinicGraceEndDate(lastCompletedVisit) }
  // Subsequent visits refresh lifecycle only. New/restart dates use genuine,
  // linked consultations and cannot restart from the review/publication time.
  if (isEligibleClinicAiTrialVisitType(selected.fields['Tipo de Consulta'])) {
    const eligible = visits.filter(v => isEligibleClinicAiTrialVisitType(v.fields['Tipo de Consulta']))
      .filter(v => validDate(v.fields['Fecha Consulta']) && v.fields['Fecha Consulta']! <= input.today)
      .sort((a, b) => b.fields['Fecha Consulta']!.localeCompare(a.fields['Fecha Consulta']!))[0]
    if (eligible) {
      const trial = provisioningPlanForClinicVisit({ visitType: eligible.fields['Tipo de Consulta'], completedAt: new Date(`${eligible.fields['Fecha Consulta']}T00:00:00.000Z`), existingRecord: record })
      if (trial.trialStarts && trial.trialEnds && (!record.trialStarts || trial.trialStarts > record.trialStarts)
        && (!record.trialEnds || trial.trialEnds >= record.trialEnds)) {
        Object.assign(changes, { tier: 'clinic_ai', status: 'trial', source: 'clinic_ai_trial', trialStarts: trial.trialStarts, trialEnds: trial.trialEnds })
      }
    }
  }
  return result('update', changes.trialStarts
    ? 'Se actualizará la vigencia clínica y la prueba de IA desde la fecha de la consulta elegible original, sin reiniciar el plazo al revisar.'
    : 'Se actualizará la vigencia clínica, conservando las fechas y condiciones de IA existentes.', changes)
}
