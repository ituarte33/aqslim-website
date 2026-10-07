export type ClinicWeightUnit = 'lb' | 'kg'

export const CLINIC_WEIGHT_UPDATE_TYPE = 'Actualización de peso'

const LIMITS: Record<ClinicWeightUnit, { min: number; max: number }> = {
  lb: { min: 50, max: 770 },
  kg: { min: 22.7, max: 350 },
}

export function normalizeClinicWeightEntry(value: unknown, unit: unknown) {
  const normalizedUnit: ClinicWeightUnit | null = unit === 'lb' || unit === 'kg' ? unit : null
  const numericValue = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN

  if (!normalizedUnit || !Number.isFinite(numericValue)) {
    return { ok: false as const, error: 'invalid_weight' as const }
  }

  const roundedValue = Math.round(numericValue * 10) / 10
  const limits = LIMITS[normalizedUnit]
  if (roundedValue < limits.min || roundedValue > limits.max) {
    return { ok: false as const, error: 'weight_out_of_range' as const }
  }

  return { ok: true as const, weight: roundedValue, unit: normalizedUnit }
}

export function clinicWeightEntryMatches(
  entry: { consultationType: string; consultationDate: string | null; weight: number | null; weightUnit: string },
  expected: { date: string; weight: number; unit: ClinicWeightUnit },
) {
  return entry.consultationType === CLINIC_WEIGHT_UPDATE_TYPE
    && entry.consultationDate === expected.date
    && entry.weight === expected.weight
    && entry.weightUnit === expected.unit
}

export function clinicWeightInKg(weight: number, unit: ClinicWeightUnit) {
  const kilograms = unit === 'kg' ? weight : weight / 2.2046226218
  return Math.round(kilograms * 10) / 10
}
