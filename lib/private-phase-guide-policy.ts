import type { CanonicalEntitlementRecord } from './entitlement-record.ts'
import { resolveCapabilityEntitlement } from './entitlement-resolver.ts'
import { portalAccessIsRestricted } from './portal-access-policy.ts'

// Approved PDF metadata only. PDF contents and storage credentials never enter Git.
export const PRIVATE_JING_GUIDE = {
  phase: 'Jing',
  slug: 'jing',
  pathname: 'phase-guides/jing-2026-10-24-495e3a3e.pdf',
  sha256: '495e3a3ecc359ef0b33e55bbba13d44cd8e921e78c813e0cf0a26b48dff00a90',
  maxBytes: 1_048_576,
} as const

export function privateGuideAccessAllowed(record: CanonicalEntitlementRecord | null | undefined, now = new Date()) {
  if (!record || portalAccessIsRestricted(record)) return false
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const access = resolveCapabilityEntitlement({ record, capability: 'buddy:chat', today, now })
  // Portal-basic clients do not need an AI subscription to read their assigned guide.
  return access.portalAccess === 'full' && (access.decision === 'allow' || access.reason === 'PORTAL_BASIC_NO_AI')
}
