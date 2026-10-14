export const ENTITLEMENT_RECORD_VERSION = 'MYAQ-ENTITLEMENT-RECORD-v0.1' as const

export type AccessTier =
  | 'portal_basic'
  | 'clinic_ai'
  | 'kenkho_start'
  | 'kenkho_plus'
  | 'kenkho_elite'
  | 'internal_pilot'

export type AccessStatus =
  | 'trial'
  | 'active'
  | 'grace'
  | 'suspended'
  | 'expired'
  | 'canceled'

export type EntitlementSource =
  | 'internal_pilot'
  | 'clinic_visit'
  | 'clinic_ai_trial'
  | 'clinic_ai_paid'
  | 'kenkho_path'
  | 'administrative'
  | 'unresolved'

export type EntitlementOverride = 'allow' | 'deny' | null

export type CanonicalEntitlementRecord = {
  version: typeof ENTITLEMENT_RECORD_VERSION
  subjectId: string
  tier: AccessTier
  status: AccessStatus
  source: EntitlementSource
  trialStarts: string | null
  trialEnds: string | null
  paidThrough: string | null
  lastCompletedVisit: string | null
  graceEnds: string | null
  accessExpires: string | null
  squareSubscriptionId: string | null
  entitlementReason: string
  lastAccessChange: string
  override: EntitlementOverride
  overrideReason: string | null
}

export function hasGovernedOverride(record: CanonicalEntitlementRecord): boolean {
  if (!record.override) return false
  return Boolean(record.overrideReason?.trim())
}

export function createCanonicalEntitlementRecord(
  input: Omit<CanonicalEntitlementRecord, 'version'>,
): CanonicalEntitlementRecord {
  return {
    version: ENTITLEMENT_RECORD_VERSION,
    ...input,
  }
}
