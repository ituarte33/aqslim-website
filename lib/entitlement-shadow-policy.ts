import type { PilotFeature } from '@/lib/pilot-policy'

export const ENTITLEMENT_SHADOW_POLICY_VERSION = 'MYAQ-ENTITLEMENT-POLICY-PREVIEW-v0.1'

export type EntitlementTier =
  | 'portal_basic'
  | 'clinic_ai'
  | 'kenkho_start'
  | 'kenkho_plus'
  | 'kenkho_elite'
  | 'internal_pilot'

export type EntitlementCapability =
  | 'buddy:chat'
  | 'food_scan:analyze'
  | 'food_log:text'
  | 'fridge_recipe:generate'
  | 'restaurant_menu:analyze'
  | 'weekly_summary:generate'

export type ShadowDecision = 'allow' | 'deny' | 'unresolved'

export type EntitlementShadowDecision = {
  mode: 'shadow'
  enforced: false
  policyVersion: typeof ENTITLEMENT_SHADOW_POLICY_VERSION
  decision: ShadowDecision
  tier: EntitlementTier | null
  lifecycle: 'NOT_APPLICABLE' | 'UNRESOLVED'
  policyBasis: 'existing_pilot_policy' | 'proposed_preview_matrix' | 'unresolved'
  reason:
    | 'INTERNAL_PILOT_FEATURE_ALLOWED'
    | 'INTERNAL_PILOT_FEATURE_MISSING'
    | 'KENKHO_PREVIEW_MATRIX_ALLOWED'
    | 'NO_APPROVED_COMMERCIAL_ENTITLEMENT_POLICY'
    | 'NO_ENTITLEMENT_SIGNAL'
    | 'PILOT_METADATA_WITHOUT_GOVERNED_PILOT_ACCESS'
}

type ShadowEntitlementInput = {
  capability: EntitlementCapability
  rawPlan?: unknown
  hasPilotAccess?: boolean
  pilotFeatures?: ReadonlySet<PilotFeature> | readonly PilotFeature[]
}

const PILOT_FEATURE_FOR_CAPABILITY: Record<EntitlementCapability, PilotFeature> = {
  'buddy:chat': 'aq_buddy',
  'food_scan:analyze': 'food_scan',
  'food_log:text': 'food_scan',
  'fridge_recipe:generate': 'fridge_recipes',
  'restaurant_menu:analyze': 'restaurant_advisor',
  'weekly_summary:generate': 'weekly_summary',
}

const PREVIEW_KENKHO_AI_CAPABILITIES: ReadonlySet<EntitlementCapability> = new Set([
  'buddy:chat',
  'food_scan:analyze',
  'food_log:text',
  'fridge_recipe:generate',
  'restaurant_menu:analyze',
  'weekly_summary:generate',
])

function pilotFeatureSet(features: ShadowEntitlementInput['pilotFeatures']): ReadonlySet<PilotFeature> {
  if (!features) return new Set<PilotFeature>()
  return features instanceof Set ? features : new Set(features)
}

function planTier(value: unknown): EntitlementTier | 'free' | 'pilot_metadata' | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null

  if (normalized === 'start' || normalized === 'mid' || normalized === 'regular') return 'kenkho_start'
  if (normalized === 'plus') return 'kenkho_plus'
  if (normalized === 'elite' || normalized === 'top') return 'kenkho_elite'
  if (normalized === 'free') return 'free'
  if (normalized === 'pilot') return 'pilot_metadata'
  return null
}

export function evaluateEntitlementShadow(input: ShadowEntitlementInput): EntitlementShadowDecision {
  if (input.hasPilotAccess) {
    const requiredFeature = PILOT_FEATURE_FOR_CAPABILITY[input.capability]
    const allowed = pilotFeatureSet(input.pilotFeatures).has(requiredFeature)
    return {
      mode: 'shadow',
      enforced: false,
      policyVersion: ENTITLEMENT_SHADOW_POLICY_VERSION,
      decision: allowed ? 'allow' : 'deny',
      tier: 'internal_pilot',
      lifecycle: 'NOT_APPLICABLE',
      policyBasis: 'existing_pilot_policy',
      reason: allowed ? 'INTERNAL_PILOT_FEATURE_ALLOWED' : 'INTERNAL_PILOT_FEATURE_MISSING',
    }
  }

  const tier = planTier(input.rawPlan)
  if (tier === 'kenkho_start' || tier === 'kenkho_plus' || tier === 'kenkho_elite') {
    return {
      mode: 'shadow',
      enforced: false,
      policyVersion: ENTITLEMENT_SHADOW_POLICY_VERSION,
      decision: PREVIEW_KENKHO_AI_CAPABILITIES.has(input.capability) ? 'allow' : 'deny',
      tier,
      lifecycle: 'NOT_APPLICABLE',
      policyBasis: 'proposed_preview_matrix',
      reason: 'KENKHO_PREVIEW_MATRIX_ALLOWED',
    }
  }

  if (tier === 'pilot_metadata') {
    return {
      mode: 'shadow',
      enforced: false,
      policyVersion: ENTITLEMENT_SHADOW_POLICY_VERSION,
      decision: 'unresolved',
      tier: null,
      lifecycle: 'UNRESOLVED',
      policyBasis: 'unresolved',
      reason: 'PILOT_METADATA_WITHOUT_GOVERNED_PILOT_ACCESS',
    }
  }

  if (tier === 'free') {
    return {
      mode: 'shadow',
      enforced: false,
      policyVersion: ENTITLEMENT_SHADOW_POLICY_VERSION,
      decision: 'unresolved',
      tier: null,
      lifecycle: 'UNRESOLVED',
      policyBasis: 'unresolved',
      reason: 'NO_APPROVED_COMMERCIAL_ENTITLEMENT_POLICY',
    }
  }

  return {
    mode: 'shadow',
    enforced: false,
    policyVersion: ENTITLEMENT_SHADOW_POLICY_VERSION,
    decision: 'unresolved',
    tier: null,
    lifecycle: 'UNRESOLVED',
    policyBasis: 'unresolved',
    reason: 'NO_ENTITLEMENT_SIGNAL',
  }
}
