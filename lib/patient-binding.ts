export function withAqslimPatientBinding(
  privateMetadata: Record<string, unknown>,
  patientId: string,
): Record<string, unknown> {
  return {
    ...privateMetadata,
    aqslimPatientId: patientId,
  }
}
