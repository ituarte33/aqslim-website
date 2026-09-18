export type ClinicCadenceSource = 'plan' | 'standard'

export type ClinicCadence = {
  days: number
  source: ClinicCadenceSource
  label: string
}

function validCadence(value: unknown) {
  const days = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(days) && days > 0 && days <= 365 ? days : null
}

export function resolveClinicCadence(value: unknown, fallbackDays = 7): ClinicCadence {
  const planDays = validCadence(value)
  if (planDays !== null) {
    return { days: planDays, source: 'plan', label: `Plan Clinic: ${planDays} días` }
  }

  const safeFallback = validCadence(fallbackDays) ?? 7
  return { days: safeFallback, source: 'standard', label: `Presencial estándar: ${safeFallback} días` }
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function suggestClinicAppointment(baseDate: string, days: number, now = new Date()) {
  const cadence = validCadence(days) ?? 7
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(baseDate)
  const base = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0)
    : new Date(now)

  base.setDate(base.getDate() + cadence)

  const rounded = new Date(now)
  rounded.setSeconds(0, 0)
  rounded.setMinutes(Math.round(rounded.getMinutes() / 5) * 5)
  base.setHours(rounded.getHours(), rounded.getMinutes(), 0, 0)

  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`
}

export function sameClinicAppointment(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) return false
  const leftTime = Date.parse(left)
  const rightTime = Date.parse(right)
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return false
  return Math.abs(leftTime - rightTime) < 60_000
}
