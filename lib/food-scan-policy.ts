export type FoodScanPlan = 'free' | 'start' | 'plus' | 'elite' | 'pilot'

export type FoodScanPolicy = {
  plan: FoodScanPlan
  dailyLimit: number
  monthlyLimit: number
  label: { es: string; en: string }
}

const POLICIES: Record<FoodScanPlan, FoodScanPolicy> = {
  free: {
    plan: 'free',
    dailyLimit: 1,
    monthlyLimit: 30,
    label: { es: 'Edición Gratuita', en: 'Free Edition' },
  },
  start: {
    plan: 'start',
    dailyLimit: 3,
    monthlyLimit: 90,
    label: { es: 'Kenkho Start', en: 'Kenkho Start' },
  },
  plus: {
    plan: 'plus',
    dailyLimit: 10,
    monthlyLimit: 300,
    label: { es: 'Kenkho Plus', en: 'Kenkho Plus' },
  },
  elite: {
    plan: 'elite',
    dailyLimit: 15,
    monthlyLimit: 450,
    label: { es: 'Kenkho Elite', en: 'Kenkho Elite' },
  },
  pilot: {
    plan: 'pilot',
    dailyLimit: 15,
    monthlyLimit: 450,
    label: { es: 'Soft Start', en: 'Soft Start' },
  },
}

// Preserve existing accounts while the old Mid/Top metadata is migrated.
const LEGACY_PLAN_MAP: Record<string, FoodScanPlan> = {
  mid: 'start',
  top: 'elite',
  regular: 'start',
}

export function normalizeFoodScanPlan(value: unknown): FoodScanPlan {
  if (typeof value !== 'string') return 'free'
  const normalized = value.trim().toLowerCase()
  if (normalized in POLICIES) return normalized as FoodScanPlan
  return LEGACY_PLAN_MAP[normalized] ?? 'free'
}

export function foodScanPolicyFor(value: unknown): FoodScanPolicy {
  return POLICIES[normalizeFoodScanPlan(value)]
}

export type FoodScanUsageDecision = {
  allowed: boolean
  reason: 'allowed' | 'daily_limit' | 'monthly_limit'
  dailyRemaining: number
  monthlyRemaining: number
}

export function evaluateFoodScanUsage(
  policy: FoodScanPolicy,
  dailyUsed: number,
  monthlyUsed: number,
): FoodScanUsageDecision {
  const dailyRemaining = Math.max(0, policy.dailyLimit - dailyUsed)
  const monthlyRemaining = Math.max(0, policy.monthlyLimit - monthlyUsed)
  if (dailyUsed >= policy.dailyLimit) {
    return { allowed: false, reason: 'daily_limit', dailyRemaining, monthlyRemaining }
  }
  if (monthlyUsed >= policy.monthlyLimit) {
    return { allowed: false, reason: 'monthly_limit', dailyRemaining, monthlyRemaining }
  }
  return { allowed: true, reason: 'allowed', dailyRemaining, monthlyRemaining }
}

function partsFromDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error('Expected date in YYYY-MM-DD format')
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

function zonedMidnightUtc(value: string, timeZone: string): Date {
  const desired = partsFromDate(value)
  let instant = new Date(Date.UTC(desired.year, desired.month - 1, desired.day, 0, 0, 0))
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  // Two passes also cover daylight-saving transitions at the range boundary.
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(instant).map(part => [part.type, part.value]),
    )
    const representedAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    )
    const desiredAsUtc = Date.UTC(desired.year, desired.month - 1, desired.day, 0, 0, 0)
    instant = new Date(instant.getTime() + (desiredAsUtc - representedAsUtc))
  }
  return instant
}

export function foodScanPeriodBoundaries(today: string) {
  const { year, month, day } = partsFromDate(today)
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
  const monthStart = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`
  const nextMonth = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)

  return {
    dayStartUtc: zonedMidnightUtc(today, 'America/Los_Angeles').toISOString(),
    dayEndUtc: zonedMidnightUtc(nextDay, 'America/Los_Angeles').toISOString(),
    monthStart,
    monthStartUtc: zonedMidnightUtc(monthStart, 'America/Los_Angeles').toISOString(),
    monthEndUtc: zonedMidnightUtc(nextMonth, 'America/Los_Angeles').toISOString(),
  }
}
