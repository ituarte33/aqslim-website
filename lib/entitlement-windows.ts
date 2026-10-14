function dateOnly(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) return null
  const candidate = `${match[1]}-${match[2]}-${match[3]}`
  return Number.isFinite(Date.parse(`${candidate}T00:00:00Z`)) ? candidate : null
}

export function buildThirtyDayTrialWindow(start: Date): {
  trialStarts: string
  trialEnds: string
} {
  const startMs = start.getTime()
  if (!Number.isFinite(startMs)) throw new Error('Invalid trial start')
  return {
    trialStarts: start.toISOString(),
    trialEnds: new Date(startMs + 30 * 86_400_000).toISOString(),
  }
}

export function clinicGraceEndDate(lastCompletedVisit: string): string | null {
  const normalized = dateOnly(lastCompletedVisit)
  if (!normalized) return null
  const startMs = Date.parse(`${normalized}T00:00:00Z`)
  return new Date(startMs + 60 * 86_400_000).toISOString().slice(0, 10)
}
