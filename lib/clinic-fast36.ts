import type { Fast36Session } from './fast36-policy.ts'

export const CLINIC_FAST36_PREFIX = 'MYAQ-CLINIC-FAST36-v1\n'
export type ClinicFast36Session = Fast36Session & { provisional: boolean; localStart: string; timeZone: string }

function localString(ms: number, timeZone: string): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(ms)
  const part = (name: string) => p.find(item => item.type === name)?.value
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}

// Resolve wall-clock input in the selected zone, rejecting DST gaps and ambiguity.
export function clinicFast36Start(localStart: unknown, zone: unknown): string | null {
  if (typeof localStart !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localStart) || typeof zone !== 'string') return null
  const wall = Date.parse(`${localStart}:00Z`)
  if (!Number.isFinite(wall)) return null
  try {
    const candidates = new Set<number>()
    for (const delta of [-86400000, 0, 86400000]) {
      const probe = wall + delta
      const offset = Date.parse(`${localString(probe, zone)}:00Z`) - probe
      const candidate = wall - offset
      if (localString(candidate, zone) === localStart) candidates.add(candidate)
    }
    return candidates.size === 1 ? new Date([...candidates][0]).toISOString() : null
  } catch { return null }
}

export function buildClinicFast36(input: { week: unknown; localStart: unknown; timeZone: unknown; provisional: unknown }): ClinicFast36Session | null {
  const week = Number(input.week)
  const startAt = clinicFast36Start(input.localStart, input.timeZone)
  if (!Number.isInteger(week) || week < 1 || week > 6 || !startAt || typeof input.provisional !== 'boolean') return null
  return { id: '', week, startAt, plannedEndAt: new Date(Date.parse(startAt) + 36 * 3600000).toISOString(), actualEndAt: null, status: 'pending', timeZone: input.timeZone as string, localStart: input.localStart as string, provisional: input.provisional }
}

export function encodeClinicFast36(session: ClinicFast36Session): string {
  return CLINIC_FAST36_PREFIX + JSON.stringify({ ...session, id: '' })
}

export function decodeClinicFast36(value: unknown, id: string): ClinicFast36Session | null {
  if (typeof value !== 'string' || !value.startsWith(CLINIC_FAST36_PREFIX)) return null
  try {
    const data = JSON.parse(value.slice(CLINIC_FAST36_PREFIX.length))
    const session = buildClinicFast36(data)
    if (!session || data.startAt !== session.startAt || data.plannedEndAt !== session.plannedEndAt
      || !['pending', 'active', 'completed', 'ended_early', 'stopped_for_safety'].includes(data.status)) return null
    if (session.provisional && !['pending', 'active'].includes(data.status)) return null
    return { ...session, id, status: data.status, actualEndAt: data.status === 'completed' ? session.plannedEndAt : null }
  } catch { return null }
}
