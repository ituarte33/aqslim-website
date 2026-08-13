const LEGACY_PHASE_NAMES: Readonly<Record<string, string>> = {
  'qi-xue (keto)': 'Jing',
}

function normalizePhaseKey(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/\s+/g, ' ')
}

export function toCanonicalPhaseName(value: string | null): string | null {
  const phase = value?.trim()
  if (!phase) return null

  return LEGACY_PHASE_NAMES[normalizePhaseKey(phase)] ?? phase
}
