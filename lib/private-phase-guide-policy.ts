import type { CanonicalEntitlementRecord } from './entitlement-record.ts'
import { resolveCapabilityEntitlement } from './entitlement-resolver.ts'
import { portalAccessIsRestricted } from './portal-access-policy.ts'

// Approved PDF metadata only. PDF contents and storage credentials never enter Git.
export const PRIVATE_GUIDE_MAX_BYTES = 1_048_576
export const PRIVATE_PHASE_GUIDES = {
  jing: {
    phase: 'Jing', slug: 'jing', filename: 'Guia_Jing.pdf',
    pathname: 'phase-guides/jing-2026-10-24-495e3a3e.pdf',
    sha256: '495e3a3ecc359ef0b33e55bbba13d44cd8e921e78c813e0cf0a26b48dff00a90',
  },
  qi: {
    phase: 'Qi', slug: 'qi', filename: 'Guia_Qi.pdf',
    pathname: 'phase-guides/qi-2026-10-26-b306c563.pdf',
    sha256: 'b306c5636c37e8883d81daf9f76786170e7e4ed885c104e3735f732060197efc',
  },
  xue: {
    phase: 'Xue', slug: 'xue', filename: 'Guia_Xue.pdf',
    pathname: 'phase-guides/xue-2026-10-26-3ae16adc.pdf',
    sha256: '3ae16adc303acc0d84c4036c4f51d34b8c7e5c2e400aa516d389c5551a78382d',
  },
  'yang-sheng': {
    phase: 'Yang Sheng', slug: 'yang-sheng', filename: 'Guia_Yang_Sheng.pdf',
    pathname: 'phase-guides/yang-sheng-2026-10-26-ee905655.pdf',
    sha256: 'ee905655f1ead8d16d36508a37ee7b95a6bbdc4c7c0ec78a1fec67622fd726d3',
  },
} as const
export type PrivatePhaseGuide = typeof PRIVATE_PHASE_GUIDES[keyof typeof PRIVATE_PHASE_GUIDES]
export function getPrivatePhaseGuide(slug: string | null): PrivatePhaseGuide | null {
  return slug !== null && Object.hasOwn(PRIVATE_PHASE_GUIDES, slug)
    ? PRIVATE_PHASE_GUIDES[slug as keyof typeof PRIVATE_PHASE_GUIDES] : null
}

export function privateGuideAccessAllowed(record: CanonicalEntitlementRecord | null | undefined, now = new Date()) {
  if (!record || portalAccessIsRestricted(record)) return false
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const access = resolveCapabilityEntitlement({ record, capability: 'buddy:chat', today, now })
  // Portal-basic clients do not need an AI subscription to read their assigned guide.
  return access.portalAccess === 'full' && (access.decision === 'allow' || access.reason === 'PORTAL_BASIC_NO_AI')
}
