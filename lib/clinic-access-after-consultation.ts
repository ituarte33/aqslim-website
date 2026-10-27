import 'server-only'
import { clinicRuntimeMode } from './clinic-runtime-policy'
import { executeClinicAccessRenewal } from './clinic-access-renewal'
import { provisionClinicEntitlementForCompletedVisit } from './p4-preview-entitlement-provisioning'
export async function updateAccessAfterCompletedConsultation(input: { patientRecordId: string; consultationId: string; visitType: string; visitDate: string; actorEmail: string }) {
  if (clinicRuntimeMode() === 'production') {
    const result = await executeClinicAccessRenewal({ patientId: input.patientRecordId, consultationId: input.consultationId, actorEmail: input.actorEmail })
    return { ...result, action: result.state, write: result.state === 'updated' ? 'updated' : 'none', reason: result.message }
  }
  // The legacy writer retains its exact Preview branch/base guard and namespace.
  return provisionClinicEntitlementForCompletedVisit(input)
}
