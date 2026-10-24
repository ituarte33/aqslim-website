import type { PortalMeasurement } from './patient-portal'
import { normalizeClinicIsoDate } from './clinic-date.ts'
import { CLINIC_WEIGHT_UPDATE_TYPE, normalizeClinicWeightEntry } from './clinic-weight-entry.ts'

export const CLINIC_PORTAL_WEIGHT_FIELDS = {
  patient: 'fld8yPs9SOAw3Osbv', patientId: 'fld0XkzcSxuahpefr',
  date: 'fldrvTUQukYeqYtsi', type: 'fldrKPVZUHzJVX2IM',
  weight: 'fldWZT9PKGJACROwu', unit: 'fldocfmCBmCS0Unis', preview: 'fldPfnVmXSJYFFWc4',
} as const

export function clinicPortalWeight(
  record: { id: string; fields?: Record<string, unknown> },
  patientId: string,
  unit: 'lb' | 'kg',
): PortalMeasurement | null {
  const f = record.fields ?? {}
  const F = CLINIC_PORTAL_WEIGHT_FIELDS
  if (!/^rec[A-Za-z0-9]{14}$/.test(patientId)
    || !/^rec[A-Za-z0-9]{14}$/.test(record.id)
    || f[F.patientId] !== patientId || f[F.preview] !== true
    || !Array.isArray(f[F.patient]) || !(f[F.patient] as unknown[]).includes(patientId)
    || f[F.type] !== CLINIC_WEIGHT_UPDATE_TYPE) return null
  const date = normalizeClinicIsoDate(f[F.date])
  const weight = normalizeClinicWeightEntry(f[F.weight], f[F.unit])
  if (!date || !weight.ok) return null
  const converted = weight.unit === unit ? weight.weight
    : unit === 'kg' ? weight.weight / 2.2046226218 : weight.weight * 2.2046226218
  return {
    id: `clinic-preview:${record.id}`, date, calendarDate: true,
    weight: converted, source: 'AQSLIM (Peso reportado · Preview)',
  }
}
