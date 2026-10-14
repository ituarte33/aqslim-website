export type Fast36Status =
  | 'pending'
  | 'active'
  | 'completed'
  | 'ended_early'
  | 'stopped_for_safety'

export type Fast36EffectiveStatus = Fast36Status | 'awaiting_confirmation'

export type Fast36ConfirmationOutcome =
  | 'completed'
  | 'ended_early'
  | 'stopped_for_safety'

export const DEFAULT_FAST36_TIME_ZONE = 'America/Los_Angeles'

export type Fast36Session = {
  id: string
  week: number
  startAt: string
  plannedEndAt: string
  actualEndAt: string | null
  status: Fast36Status
  timeZone?: string
}

export function normalizeFast36Status(value: string | undefined): Fast36Status {
  if (value === 'Activo') return 'active'
  if (value === 'Completado') return 'completed'
  if (value === 'Terminado temprano') return 'ended_early'
  if (value === 'Interrumpido por seguridad') return 'stopped_for_safety'
  return 'pending'
}

export function effectiveFast36Status(
  session: Fast36Session,
  nowMs = Date.now(),
): Fast36EffectiveStatus {
  if (
    session.status === 'completed'
    || session.status === 'ended_early'
    || session.status === 'stopped_for_safety'
  ) return session.status

  const startMs = Date.parse(session.startAt)
  const endMs = Date.parse(session.plannedEndAt)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return session.status
  if (nowMs < startMs) return 'pending'
  if (nowMs >= endMs) return 'awaiting_confirmation'
  return 'active'
}

export function normalizeFast36TimeZone(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return DEFAULT_FAST36_TIME_ZONE
  const candidate = value.trim()
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(0)
    return candidate
  } catch {
    return DEFAULT_FAST36_TIME_ZONE
  }
}

export function fast36TimeZoneFromSessionData(value: string | undefined): string {
  if (!value) return DEFAULT_FAST36_TIME_ZONE
  try {
    const data = JSON.parse(value) as { timeZone?: unknown }
    return normalizeFast36TimeZone(data.timeZone)
  } catch {
    return DEFAULT_FAST36_TIME_ZONE
  }
}

export function isFast36ConfirmationOutcome(value: unknown): value is Fast36ConfirmationOutcome {
  return value === 'completed'
    || value === 'ended_early'
    || value === 'stopped_for_safety'
}

export function storedFast36StatusForOutcome(
  outcome: Fast36ConfirmationOutcome,
): 'Completado' | 'Terminado temprano' | 'Interrumpido por seguridad' {
  if (outcome === 'completed') return 'Completado'
  if (outcome === 'ended_early') return 'Terminado temprano'
  return 'Interrumpido por seguridad'
}

export function canConfirmFast36Outcome(
  session: Fast36Session,
  outcome: Fast36ConfirmationOutcome,
  nowMs = Date.now(),
): boolean {
  if (
    session.status === 'completed'
    || session.status === 'ended_early'
    || session.status === 'stopped_for_safety'
  ) return false

  const startMs = Date.parse(session.startAt)
  const endMs = Date.parse(session.plannedEndAt)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return false
  if (outcome === 'completed') return nowMs >= endMs
  return nowMs >= startMs
}

export function fast36ProgressPercent(session: Fast36Session, nowMs = Date.now()): number {
  const startMs = Date.parse(session.startAt)
  const endMs = Date.parse(session.plannedEndAt)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0
  return Math.max(0, Math.min(100, ((nowMs - startMs) / (endMs - startMs)) * 100))
}

function compareFast36Sessions(a: Fast36Session, b: Fast36Session): number {
  const aStart = Date.parse(a.startAt)
  const bStart = Date.parse(b.startAt)
  if (Number.isFinite(aStart) && Number.isFinite(bStart) && aStart !== bStart) {
    return aStart - bStart
  }
  if (a.week !== b.week) return a.week - b.week
  return a.id.localeCompare(b.id)
}

export function selectCurrentFast36Session(
  sessions: readonly Fast36Session[],
  nowMs = Date.now(),
): Fast36Session | null {
  if (!sessions.length) return null

  const ordered = [...sessions].sort(compareFast36Sessions)
  const active = ordered
    .filter(session => effectiveFast36Status(session, nowMs) === 'active')
    .at(-1)
  if (active) return active

  const started = ordered.filter(session => {
    const startMs = Date.parse(session.startAt)
    return Number.isFinite(startMs) && startMs <= nowMs
  })
  if (started.length > 0) return started.at(-1) ?? null

  const future = ordered.find(session => {
    const startMs = Date.parse(session.startAt)
    return Number.isFinite(startMs) && startMs > nowMs
  })
  return future ?? ordered.at(-1) ?? null
}

export function buildFast36BuddyContext(
  sessions: readonly Fast36Session[],
  nowMs = Date.now(),
): string {
  const current = selectCurrentFast36Session(sessions, nowMs)
  if (!current) return ''
  const storedStatus = current.status
  const elapsed = nowMs >= Date.parse(current.plannedEndAt)

  return `VERIFIED AQSLIM FAST 36 CONTEXT
- Program week: ${current.week} of 6
- Scheduled start: ${current.startAt}
- Scheduled end: ${current.plannedEndAt}
- Documented status: ${storedStatus}
- Scheduled window elapsed: ${elapsed ? 'yes' : 'no'}

FAST 36 RESPONSE RULES
- Treat this as authenticated patient context, not as a diagnosis.
- FAST 36 program week and the patient's Kenkho phase/week are separate dimensions. Completing FAST 36 does not by itself end, advance, invalidate, or conflict with the current Kenkho phase.
- Never suggest that a mismatch between FAST 36 week count and Kenkho phase week requires phase confirmation unless another governed source actually shows uncertainty.
- Do not claim that the patient completed the fast unless documented status is completed.
- If the scheduled window elapsed while status is still pending or active, ask whether it was completed, ended early, or stopped for safety.
- Use logged experience to discuss adherence and patterns, not unsupported medical conclusions.
- For concerning symptoms, medication questions, pregnancy, breastfeeding, diabetes, or immediate danger, follow the applicable medical-safety rules.`
}
