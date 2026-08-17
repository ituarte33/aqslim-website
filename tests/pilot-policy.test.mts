import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PILOT_COHORT_ID,
  pilotAccessFromMetadata,
  pilotHasFeature,
  selectPilotDisplayFirstName,
} from '../lib/pilot-policy.ts'

test('pilot access is denied unless the private cohort flag is exact and enabled', () => {
  assert.equal(pilotAccessFromMetadata({}), null)
  assert.equal(pilotAccessFromMetadata({ pilot: { enabled: true, cohort: 'other' } }), null)
  assert.equal(pilotAccessFromMetadata({ pilot: { enabled: false, cohort: PILOT_COHORT_ID } }), null)
})

test('active pilot features are always available to an enrolled participant', () => {
  const access = pilotAccessFromMetadata({
    pilot: {
      enabled: true,
      cohort: PILOT_COHORT_ID,
      role: 'technical',
      language: 'en',
      features: ['unknown_feature'],
    },
  })
  assert.ok(access)
  assert.equal(access.role, 'technical')
  assert.equal(access.language, 'en')
  assert.equal(pilotHasFeature(access, 'aq_buddy'), true)
  assert.equal(pilotHasFeature(access, 'food_scan'), true)
  assert.equal(pilotHasFeature(access, 'restaurant_advisor'), true)
  assert.equal(access.enabledFeatures.has('unknown_feature' as never), false)
})

test('the linked patient name takes precedence over the Clerk profile name', () => {
  assert.equal(selectPilotDisplayFirstName('Maria', 'Mónica'), 'Mónica')
  assert.equal(selectPilotDisplayFirstName('Rom', null), 'Rom')
  assert.equal(selectPilotDisplayFirstName('  ', '  '), 'Participante')
})
