export const CLINIC_MESSAGE_CHANNELS = ['SMS', 'Email', 'WhatsApp'] as const
export const CLINIC_MESSAGE_PURPOSES = ['Seguimiento', 'Recordatorio', 'Plan', 'General'] as const
export const CLINIC_MESSAGE_STATUSES = ['Borrador', 'Listo para revisar', 'Archivado'] as const

export type ClinicMessageChannel = typeof CLINIC_MESSAGE_CHANNELS[number]
export type ClinicMessagePurpose = typeof CLINIC_MESSAGE_PURPOSES[number]
export type ClinicMessageStatus = typeof CLINIC_MESSAGE_STATUSES[number]

export type ClinicMessageDraft = {
  channel: ClinicMessageChannel
  purpose: ClinicMessagePurpose
  status: ClinicMessageStatus
  subject: string
  body: string
}

const PREFIX = 'AQSLIM_MESSAGE_DRAFT_V1:'

export function encodeClinicMessageDraft(draft: ClinicMessageDraft) {
  return `${PREFIX}${JSON.stringify(draft)}`
}

export function decodeClinicMessageDraft(value: unknown): ClinicMessageDraft | null {
  if (typeof value !== 'string' || !value.startsWith(PREFIX)) return null
  try {
    const parsed = JSON.parse(value.slice(PREFIX.length)) as Partial<ClinicMessageDraft>
    if (!CLINIC_MESSAGE_CHANNELS.includes(parsed.channel as ClinicMessageChannel)) return null
    if (!CLINIC_MESSAGE_PURPOSES.includes(parsed.purpose as ClinicMessagePurpose)) return null
    if (!CLINIC_MESSAGE_STATUSES.includes(parsed.status as ClinicMessageStatus)) return null
    if (typeof parsed.body !== 'string' || !parsed.body.trim()) return null
    if (typeof parsed.subject !== 'string') return null
    return {
      channel: parsed.channel as ClinicMessageChannel,
      purpose: parsed.purpose as ClinicMessagePurpose,
      status: parsed.status as ClinicMessageStatus,
      subject: parsed.subject.trim(),
      body: parsed.body.trim(),
    }
  } catch {
    return null
  }
}
