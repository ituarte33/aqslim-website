export function normalizeClinicWeightKg(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return value
  return Math.round(value * 10) / 10
}
