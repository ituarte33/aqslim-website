import type { CanonicalEntitlementRecord } from './entitlement-record'

const BLOCKED_STATUSES = new Set(['suspended', 'expired', 'canceled'])

export function portalAccessIsRestricted(
  record: CanonicalEntitlementRecord | null | undefined,
): boolean {
  if (!record) return false
  if (record.override === 'deny' && Boolean(record.overrideReason?.trim())) return true
  return BLOCKED_STATUSES.has(record.status)
}
