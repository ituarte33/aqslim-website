import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PILOT_COHORT_ID,
  PLANNED_PILOT_FEATURES,
  pilotAccessFromFast36Enrollment,
  pilotAccessFromMetadata,
  pilotHasFeature,
  selectPilotDisplayFirstName,
} from '../lib/pilot-policy.ts'

test('FAST 36 enrollment grants Soft Start access', () => {
  const access = pilotAccessFromFast36Enrollment(true)
  assert.equal(access?.cohort, PILOT_COHORT_ID)
  assert.equal(access?.role, 'participant')
  assert.equal(access?.enabledFeatures.has('patient_portal'), true)
  assert.equal(access?.enabledFeatures.has('food_scan'), true)
  assert.equal(access?.enabledFeatures.has('fast_36'), true)
})

test('missing FAST 36 enrollment does not grant Soft Start access', () => {
  assert.equal(pilotAccessFromFast36Enrollment(false), null)
})

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
  assert.equal(pilotHasFeature(access, 'fridge_recipes'), true)
  assert.equal(pilotHasFeature(access, 'weekly_summary'), true)
  assert.equal(access.enabledFeatures.has('unknown_feature' as never), false)
  assert.equal(pilotHasFeature(access, 'guided_meal_plan'), false)
  assert.deepEqual(PLANNED_PILOT_FEATURES, ['guided_meal_plan'])
})

test('the linked patient name takes precedence over the Clerk profile name', () => {
  assert.equal(selectPilotDisplayFirstName('Maria', 'Mónica'), 'Mónica')
  assert.equal(selectPilotDisplayFirstName('Rom', null), 'Rom')
  assert.equal(selectPilotDisplayFirstName('  ', '  '), 'Participante')
})
