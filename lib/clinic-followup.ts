export const CLINIC_FOLLOWUP_PRIORITIES = ['Normal', 'Alta', 'Urgente'] as const
export const CLINIC_FOLLOWUP_STATUSES = ['Pendiente', 'En progreso', 'Completado'] as const

export type ClinicFollowupPriority = typeof CLINIC_FOLLOWUP_PRIORITIES[number]
export type ClinicFollowupStatus = typeof CLINIC_FOLLOWUP_STATUSES[number]

export type ClinicFollowup = {
  action: string
  priority: ClinicFollowupPriority
  status: ClinicFollowupStatus
}

const PREFIX = 'AQSLIM_FOLLOWUP_V1:'

export function encodeClinicFollowup(followup: ClinicFollowup) {
  return `${PREFIX}${JSON.stringify(followup)}`
}

export function decodeClinicFollowup(value: unknown): ClinicFollowup | null {
  if (typeof value !== 'string' || !value.startsWith(PREFIX)) return null
  try {
    const parsed = JSON.parse(value.slice(PREFIX.length)) as Partial<ClinicFollowup>
    if (typeof parsed.action !== 'string' || !parsed.action.trim()) return null
    if (!CLINIC_FOLLOWUP_PRIORITIES.includes(parsed.priority as ClinicFollowupPriority)) return null
    if (!CLINIC_FOLLOWUP_STATUSES.includes(parsed.status as ClinicFollowupStatus)) return null
    return {
      action: parsed.action.trim(),
      priority: parsed.priority as ClinicFollowupPriority,
      status: parsed.status as ClinicFollowupStatus,
    }
  } catch {
    return null
  }
}

export function clinicFollowupIsPending(status: ClinicFollowupStatus) {
  return status !== 'Completado'
}
