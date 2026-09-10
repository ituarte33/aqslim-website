import assert from 'node:assert/strict'
import test from 'node:test'
import { ACTIVE_PILOT_FEATURES } from '../lib/pilot-policy.ts'
import {
  ENTITLEMENT_SHADOW_POLICY_VERSION,
  evaluateEntitlementShadow,
} from '../lib/entitlement-shadow-policy.ts'

test('shadow policy never enforces a decision', () => {
  const decision = evaluateEntitlementShadow({
    capability: 'food_scan:analyze',
    hasPilotAccess: true,
    pilotFeatures: ACTIVE_PILOT_FEATURES,
  })

  assert.equal(decision.mode, 'shadow')
  assert.equal(decision.enforced, false)
  assert.equal(decision.policyVersion, ENTITLEMENT_SHADOW_POLICY_VERSION)
})

test('governed internal pilot access resolves from existing pilot features', () => {
  const allowed = evaluateEntitlementShadow({
    capability: 'fridge_recipe:generate',
    hasPilotAccess: true,
    pilotFeatures: ACTIVE_PILOT_FEATURES,
  })

  assert.equal(allowed.decision, 'allow')
  assert.equal(allowed.tier, 'internal_pilot')
  assert.equal(allowed.policyBasis, 'existing_pilot_policy')
  assert.equal(allowed.reason, 'INTERNAL_PILOT_FEATURE_ALLOWED')
})

test('a missing internal pilot feature is visible as a shadow mismatch only', () => {
  const denied = evaluateEntitlementShadow({
    capability: 'weekly_summary:generate',
    hasPilotAccess: true,
    pilotFeatures: ['food_scan'],
  })

  assert.equal(denied.decision, 'deny')
  assert.equal(denied.enforced, false)
  assert.equal(denied.reason, 'INTERNAL_PILOT_FEATURE_MISSING')
})

test('known Kenkho tiers use the proposed Preview matrix without enforcing it', () => {
  for (const [rawPlan, expectedTier] of [
    ['start', 'kenkho_start'],
    ['plus', 'kenkho_plus'],
    ['elite', 'kenkho_elite'],
    ['mid', 'kenkho_start'],
    ['regular', 'kenkho_start'],
    ['top', 'kenkho_elite'],
  ] as const) {
    const decision = evaluateEntitlementShadow({
      capability: 'buddy:chat',
      rawPlan,
    })

    assert.equal(decision.decision, 'allow')
    assert.equal(decision.enforced, false)
    assert.equal(decision.tier, expectedTier)
    assert.equal(decision.policyBasis, 'proposed_preview_matrix')
  }
})

test('free or absent commercial signals remain unresolved because D01-D09 are not approved', () => {
  const free = evaluateEntitlementShadow({
    capability: 'food_scan:analyze',
    rawPlan: 'free',
  })
  const absent = evaluateEntitlementShadow({
    capability: 'food_scan:analyze',
  })

  assert.equal(free.decision, 'unresolved')
  assert.equal(free.reason, 'NO_APPROVED_COMMERCIAL_ENTITLEMENT_POLICY')
  assert.equal(absent.decision, 'unresolved')
  assert.equal(absent.reason, 'NO_ENTITLEMENT_SIGNAL')
})

test('pilot metadata alone does not impersonate governed pilot access', () => {
  const decision = evaluateEntitlementShadow({
    capability: 'restaurant_menu:analyze',
    rawPlan: 'pilot',
    hasPilotAccess: false,
  })

  assert.equal(decision.decision, 'unresolved')
  assert.equal(decision.tier, null)
  assert.equal(decision.reason, 'PILOT_METADATA_WITHOUT_GOVERNED_PILOT_ACCESS')
})
