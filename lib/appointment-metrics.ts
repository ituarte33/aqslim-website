export function isUpcomingAppointment(
  nextAppointment: string | undefined,
  now: Date = new Date(),
): boolean {
  if (!nextAppointment) return false

  const timestamp = Date.parse(nextAppointment)
  return Number.isFinite(timestamp) && timestamp >= now.getTime()
}
