export function isUpcomingAppointment(
  nextAppointment: string | undefined,
  now: Date = new Date(),
): boolean {
  if (!nextAppointment) return false

  const timestamp = Date.parse(nextAppointment)
  return Number.isFinite(timestamp) && timestamp >= now.getTime()
}

export function formatAppointmentDate(iso: string, lang: 'es' | 'en'): string {
  try {
    return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}
