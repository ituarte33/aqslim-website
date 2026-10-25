// Date-only plan fields represent calendar days, not instants in California.
export function formatPortalPlanDate(value: string | null, language: 'es' | 'en', calendarDates = false): string {
  const fallback = language === 'es' ? 'Por confirmar' : 'To be confirmed'
  if (!value) return fallback
  const dateOnly = calendarDates && /^\d{4}-\d{2}-\d{2}$/.test(value)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', {
    timeZone: dateOnly ? 'UTC' : 'America/Los_Angeles',
    month: 'long', day: 'numeric', year: 'numeric',
  }).format(date)
}
