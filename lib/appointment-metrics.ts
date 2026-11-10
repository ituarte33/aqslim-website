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

export function bookingCalendarNavigation(year: number, monthIndex: number, today: string) {
  const [todayYear, todayMonth] = today.split('-').map(Number)
  const first = todayYear * 12 + todayMonth - 1
  const selected = year * 12 + monthIndex
  return { canPrev: selected > first, canNext: selected < first + 1 }
}
