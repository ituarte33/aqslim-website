import assert from 'node:assert/strict'
import test from 'node:test'
import { buildGuidedPlan } from '../lib/nutrition/assembler.ts'
import { JING_COMPLETION_COMPONENTS, JING_RECIPE_VARIANTS } from '../lib/nutrition/fixtures.ts'
import {
  buildSyntheticQuestionnaireProfile,
  type SyntheticQuestionnaireAnswers,
} from '../lib/nutrition/questionnaire-profile.ts'
import {
  confirmSyntheticReview,
  createSyntheticPublicationState,
  publishSyntheticDraft,
  saveSyntheticDraft,
  SYNTHETIC_CLIENT,
  SYNTHETIC_REVIEWER,
} from '../lib/nutrition/synthetic-publication.ts'
import {
  loadSyntheticPublication,
  parseStoredSyntheticPublication,
  saveSyntheticPublication,
  syntheticPublicationStorageKey,
} from '../lib/nutrition/synthetic-publication-storage.ts'

class MemoryStorage {
  private values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

const ANSWERS: SyntheticQuestionnaireAnswers = {
  ageYears: 45,
  equationSex: 'female',
  heightFeet: 5,
  heightInches: 5,
  currentWeightLb: 220,
  goalWeightLb: 170,
  activityLevel: 'sedentary',
  mealCount: 3,
  preferredFoods: ['chicken', 'tilapia'],
  dislikedFoods: ['pork'],
  excludedFoods: [],
  medicationReview: 'none',
}

function generatePlan() {
  const result = buildSyntheticQuestionnaireProfile(ANSWERS)
  assert.ok(result.profile)
  return buildGuidedPlan({
    profile: result.profile,
    recipes: JING_RECIPE_VARIANTS,
    components: JING_COMPLETION_COMPONENTS,
  })
}

function publishedState() {
  const draft = saveSyntheticDraft(
    createSyntheticPublicationState(),
    generatePlan(),
    SYNTHETIC_REVIEWER,
    '2026-09-03T16:00:00.000Z',
  )
  return publishSyntheticDraft(
    confirmSyntheticReview(draft, true, SYNTHETIC_REVIEWER, '2026-09-03T16:05:00.000Z'),
    SYNTHETIC_REVIEWER,
    '2026-09-03T16:06:00.000Z',
  )
}

test('scopes the durable Preview workflow by schema and synthetic client', () => {
  assert.equal(
    syntheticPublicationStorageKey(SYNTHETIC_CLIENT.id),
    'myaq-preview-synthetic-publication:v1:syn-client-001',
  )
  assert.notEqual(
    syntheticPublicationStorageKey(SYNTHETIC_CLIENT.id),
    syntheticPublicationStorageKey('SYN-CLIENT-002'),
  )
})

test('round-trips a published version, review, audit trail, and full synthetic plan', () => {
  const storage = new MemoryStorage()
  const state = publishedState()

  assert.equal(saveSyntheticPublication(storage, state), true)
  const restored = loadSyntheticPublication(storage, SYNTHETIC_CLIENT)

  assert.deepEqual(restored, state)
  assert.notEqual(restored, state)
  assert.equal(restored.published?.version, 1)
  assert.equal(restored.publishedVersions.length, 1)
  assert.deepEqual(restored.auditTrail.map(event => event.type), [
    'draft_saved',
    'review_confirmed',
    'version_published',
  ])
})

test('a JSON-restored identical plan cannot create a duplicate draft version', () => {
  const storage = new MemoryStorage()
  const state = publishedState()
  saveSyntheticPublication(storage, state)
  const restored = loadSyntheticPublication(storage, SYNTHETIC_CLIENT)
  const clonedPlan = JSON.parse(JSON.stringify(restored.draft?.plan))

  assert.equal(saveSyntheticDraft(restored, clonedPlan), restored)
})

test('rejects malformed, stale, cross-client, and internally inconsistent state', () => {
  const empty = createSyntheticPublicationState(SYNTHETIC_CLIENT)
  assert.deepEqual(parseStoredSyntheticPublication('{', SYNTHETIC_CLIENT), empty)
  assert.deepEqual(parseStoredSyntheticPublication(JSON.stringify({
    version: 2,
    clientId: SYNTHETIC_CLIENT.id,
    state: publishedState(),
  }), SYNTHETIC_CLIENT), empty)
  assert.deepEqual(parseStoredSyntheticPublication(JSON.stringify({
    version: 1,
    clientId: 'SYN-CLIENT-002',
    state: publishedState(),
  }), SYNTHETIC_CLIENT), empty)

  const inconsistent = publishedState()
  assert.ok(inconsistent.published)
  assert.deepEqual(parseStoredSyntheticPublication(JSON.stringify({
    version: 1,
    clientId: SYNTHETIC_CLIENT.id,
    state: { ...inconsistent, publishedVersions: [] },
  }), SYNTHETIC_CLIENT), empty)
})

test('fails closed when browser storage is unavailable', () => {
  const unavailable = {
    getItem() { throw new Error('blocked') },
    setItem() { throw new Error('blocked') },
    removeItem() { throw new Error('blocked') },
  }

  assert.deepEqual(loadSyntheticPublication(unavailable, SYNTHETIC_CLIENT), createSyntheticPublicationState())
  assert.equal(saveSyntheticPublication(unavailable, publishedState()), false)
})
