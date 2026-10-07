const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function normalizeClinicIsoDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const clean = value.trim()
  if (!ISO_DATE_PATTERN.test(clean)) return null

  const [year, month, day] = clean.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null

  return clean
}
