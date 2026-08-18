type ConsultationWithPatientLink = {
  fields: {
    'ID Cliente'?: unknown
  }
}

export function consultationBelongsToPatient(
  consultation: ConsultationWithPatientLink,
  patientId: string,
): boolean {
  const linkedPatientIds = consultation.fields['ID Cliente']
  return Array.isArray(linkedPatientIds)
    && linkedPatientIds.some(value => value === patientId)
}

export function filterConsultationsForPatient<T extends ConsultationWithPatientLink>(
  consultations: readonly T[],
  patientId: string,
): T[] {
  return consultations.filter(consultation => consultationBelongsToPatient(consultation, patientId))
}
