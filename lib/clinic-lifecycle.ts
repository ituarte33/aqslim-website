export type ClinicLifecycle = 'ACTIVE' | 'GRACE' | 'INACTIVE' | 'UNRESOLVED'

export type ClinicLifecycleDecision = {
  lifecycle: ClinicLifecycle
  daysSinceLastCompletedVisit: number | null
  restartEligible: boolean
}

function dateOnly(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) return null
  const candidate = `${match[1]}-${match[2]}-${match[3]}`
  const parsed = Date.parse(`${candidate}T00:00:00Z`)
  return Number.isFinite(parsed) ? candidate : null
}

export function daysBetweenDateOnly(earlier: string, later: string): number | null {
  const start = dateOnly(earlier)
  const end = dateOnly(later)
  if (!start || !end) return null
  const startMs = Date.parse(`${start}T00:00:00Z`)
  const endMs = Date.parse(`${end}T00:00:00Z`)
  if (endMs < startMs) return null
  return Math.floor((endMs - startMs) / 86_400_000)
}

export function resolveClinicLifecycle(
  lastCompletedVisit: string | null | undefined,
  today: string,
): ClinicLifecycleDecision {
  if (!lastCompletedVisit) {
    return { lifecycle: 'UNRESOLVED', daysSinceLastCompletedVisit: null, restartEligible: false }
  }

  const days = daysBetweenDateOnly(lastCompletedVisit, today)
  if (days === null) {
    return { lifecycle: 'UNRESOLVED', daysSinceLastCompletedVisit: null, restartEligible: false }
  }
  if (days <= 30) {
    return { lifecycle: 'ACTIVE', daysSinceLastCompletedVisit: days, restartEligible: false }
  }
  if (days <= 60) {
    return { lifecycle: 'GRACE', daysSinceLastCompletedVisit: days, restartEligible: false }
  }
  return { lifecycle: 'INACTIVE', daysSinceLastCompletedVisit: days, restartEligible: true }
}
