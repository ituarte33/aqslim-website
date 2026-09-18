import type { ClinicAccessReadiness } from './clinic-access-readiness'
import type { ClinicAccessReconciliation } from './clinic-access-reconciliation'

export type ClinicAccessActivationStep = {
  key: 'patient_binding' | 'pilot_recognition' | 'preview_entitlement'
  label: string
  state: 'proposed' | 'complete' | 'decision_required' | 'blocked'
  detail: string
}

export type ClinicAccessActivationCheck = {
  key: 'patient_record' | 'email' | 'unique_account' | 'binding_conflict' | 'pilot_authorization'
  label: string
  passed: boolean
}

export type ClinicAccessActivationReadiness = {
  state: 'ready_for_authorization' | 'blocked' | 'no_action'
  stateLabel: string
  notice: string
  checks: ClinicAccessActivationCheck[]
  steps: ClinicAccessActivationStep[]
}

export function getClinicAccessActivationReadiness({
  readiness,
  reconciliation,
  pilotRecognitionAuthorized,
}: {
  readiness: ClinicAccessReadiness
  reconciliation: ClinicAccessReconciliation
  pilotRecognitionAuthorized: boolean
}): ClinicAccessActivationReadiness {
  const patientRecordReady = readiness.checks.find(check => check.key === 'patient_record')?.passed === true
  const emailReady = readiness.checks.find(check => check.key === 'email')?.passed === true
  const uniqueAccount = reconciliation.account.state === 'found'
  const noBindingConflict = uniqueAccount && reconciliation.binding.state !== 'conflict'
  const pilotActionAllowed = reconciliation.pilot.state === 'active' || pilotRecognitionAuthorized
  const checks: ClinicAccessActivationCheck[] = [
    { key: 'patient_record', label: 'Expediente estable verificado', passed: patientRecordReady },
    { key: 'email', label: 'Email de identidad válido', passed: emailReady },
    { key: 'unique_account', label: 'Una sola cuenta My AQSLIM encontrada', passed: uniqueAccount },
    { key: 'binding_conflict', label: 'Sin conflicto con otro expediente', passed: noBindingConflict },
    { key: 'pilot_authorization', label: 'Reconocimiento piloto autorizado', passed: pilotActionAllowed },
  ]
  const blocked = checks.some(check => !check.passed)

  const bindingStep: ClinicAccessActivationStep = reconciliation.binding.state === 'matched'
    ? {
        key: 'patient_binding',
        label: 'Vincular cuenta al expediente seleccionado',
        state: 'complete',
        detail: 'La cuenta ya está vinculada explícitamente a este expediente; no se propone modificarla.',
      }
    : reconciliation.binding.state === 'email_match' && !blocked
      ? {
          key: 'patient_binding',
          label: 'Vincular cuenta al expediente seleccionado',
          state: 'proposed',
          detail: 'Propuesta pendiente de autorización posterior; esta lectura no escribió el vínculo.',
        }
      : {
          key: 'patient_binding',
          label: 'Vincular cuenta al expediente seleccionado',
          state: 'blocked',
          detail: reconciliation.binding.state === 'conflict'
            ? 'Bloqueado porque la cuenta apunta a otro expediente.'
            : 'Bloqueado hasta verificar una cuenta única y un expediente válido.',
        }

  const pilotStep: ClinicAccessActivationStep = reconciliation.pilot.state === 'active'
    ? {
        key: 'pilot_recognition',
        label: 'Reconocer participación piloto Preview',
        state: 'complete',
        detail: 'La participación piloto ya fue observada; no se propone modificarla.',
      }
    : !blocked && pilotRecognitionAuthorized
      ? {
          key: 'pilot_recognition',
          label: 'Reconocer participación piloto Preview',
          state: 'proposed',
          detail: 'Propuesta pendiente de autorización posterior; no se agregó metadata ni acceso.',
        }
      : {
          key: 'pilot_recognition',
          label: 'Reconocer participación piloto Preview',
          state: 'blocked',
          detail: 'Bloqueado hasta comprobar la cuenta y una autorización piloto aplicable a este expediente.',
        }

  const entitlementStep: ClinicAccessActivationStep = readiness.entitlement.present
    ? {
        key: 'preview_entitlement',
        label: 'Determinar entitlement Preview',
        state: 'complete',
        detail: 'Ya existe un registro Preview; esta propuesta conserva su tier y estado sin cambios.',
      }
    : blocked
      ? {
          key: 'preview_entitlement',
          label: 'Determinar entitlement Preview',
          state: 'blocked',
          detail: 'No se evalúa una asignación mientras existan bloqueos de identidad o autorización.',
        }
      : {
          key: 'preview_entitlement',
          label: 'Determinar entitlement Preview',
          state: 'decision_required',
          detail: 'Requiere una decisión clínica y técnica posterior; no se asigna tier automáticamente.',
        }

  const steps = [bindingStep, pilotStep, entitlementStep]
  const allComplete = steps.every(step => step.state === 'complete')

  return {
    state: blocked ? 'blocked' : allComplete ? 'no_action' : 'ready_for_authorization',
    stateLabel: blocked
      ? 'Propuesta bloqueada; faltan verificaciones'
      : allComplete
        ? 'Acceso ya reconciliado; no hay acciones propuestas'
        : 'Propuesta lista para autorización posterior',
    notice: 'Propuesta solamente; ninguna acción fue ejecutada.',
    checks,
    steps,
  }
}
