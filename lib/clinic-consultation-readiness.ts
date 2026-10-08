import { normalizeClinicIsoDate } from './clinic-date.ts'

export type ClinicConsultationReadinessCheck = {
  key: 'patient' | 'date' | 'charge' | 'collected'
  label: string
  passed: boolean
}

function isOptionalNonNegativeAmount(value: string) {
  if (!value.trim()) return true
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0
}

export function assessClinicConsultationReadiness({
  patientId,
  consultationDate,
  consultationFee,
  amountCollected,
}: {
  patientId: string | null
  consultationDate: string
  consultationFee: string
  amountCollected: string
}) {
  const checks: ClinicConsultationReadinessCheck[] = [
    { key: 'patient', label: 'Paciente vinculado al expediente', passed: Boolean(patientId?.startsWith('rec')) },
    { key: 'date', label: 'Fecha de consulta válida', passed: normalizeClinicIsoDate(consultationDate) !== null },
    { key: 'charge', label: 'Cargo válido o vacío', passed: isOptionalNonNegativeAmount(consultationFee) },
    { key: 'collected', label: 'Monto cobrado válido o vacío', passed: isOptionalNonNegativeAmount(amountCollected) },
  ]

  return {
    ready: checks.every(check => check.passed),
    checks,
  }
}
