export type Fast36Status =
  | 'pending'
  | 'active'
  | 'completed'
  | 'ended_early'
  | 'stopped_for_safety'

export type Fast36Session = {
  id: string
  week: number
  startAt: string
  plannedEndAt: string
  actualEndAt: string | null
  status: Fast36Status
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
): Fast36Status {
  if (
    session.status === 'completed'
    || session.status === 'ended_early'
    || session.status === 'stopped_for_safety'
  ) return session.status

  const startMs = Date.parse(session.startAt)
  const endMs = Date.parse(session.plannedEndAt)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return session.status
  if (nowMs < startMs) return 'pending'
  if (nowMs >= endMs) return 'completed'
  return 'active'
}

export function fast36ProgressPercent(session: Fast36Session, nowMs = Date.now()): number {
  const startMs = Date.parse(session.startAt)
  const endMs = Date.parse(session.plannedEndAt)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0
  return Math.max(0, Math.min(100, ((nowMs - startMs) / (endMs - startMs)) * 100))
}

export function selectCurrentFast36Session(
  sessions: readonly Fast36Session[],
  nowMs = Date.now(),
): Fast36Session | null {
  if (!sessions.length) return null
  const active = sessions.find(session => effectiveFast36Status(session, nowMs) === 'active')
  if (active) return active
  const next = sessions.find(session => effectiveFast36Status(session, nowMs) === 'pending')
  return next ?? sessions.at(-1) ?? null
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
- Do not claim that the patient completed the fast unless documented status is completed.
- If the scheduled window elapsed while status remains active, ask whether it was completed, ended early, or stopped for safety.
- Use logged experience to discuss adherence and patterns, not unsupported medical conclusions.
- For concerning symptoms, medication questions, pregnancy, breastfeeding, diabetes, or immediate danger, follow the applicable medical-safety rules.`
}
