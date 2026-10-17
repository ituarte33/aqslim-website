import { createHash } from 'node:crypto'

type ScanIdentity = {
  primaryEmailAddressId: string | null
  emailAddresses: Array<{ id: string; emailAddress: string; verification?: { status: string } | null }>
}

// Operator-managed, server-only allowlist. Never trust a request parameter or client metadata.
export function hasAccountScanOverride(user: ScanIdentity | null, hashes: string | undefined): boolean {
  if (!user?.primaryEmailAddressId) return false
  const primary = user.emailAddresses.find(address => address.id === user.primaryEmailAddressId)
  if (!primary || primary.verification?.status !== 'verified') return false
  const hash = createHash('sha256').update(primary.emailAddress.trim().toLowerCase()).digest('hex')
  return (hashes ?? '').split(',').map(value => value.trim().toLowerCase()).filter(value => /^[a-f0-9]{64}$/.test(value)).includes(hash)
}

export function scanUsageResponse(
  policy: { dailyLimit: number; monthlyLimit: number },
  used: number,
  monthlyUsed: number,
  unlimited: boolean,
) {
  return {
    unlimited,
    used,
    limit: unlimited ? null : policy.dailyLimit,
    remaining: unlimited ? null : Math.max(0, policy.dailyLimit - used),
    monthlyUsed,
    monthlyLimit: unlimited ? null : policy.monthlyLimit,
    monthlyRemaining: unlimited ? null : Math.max(0, policy.monthlyLimit - monthlyUsed),
  }
}
