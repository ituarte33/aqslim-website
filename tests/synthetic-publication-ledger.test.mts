import assert from 'node:assert/strict'
import test from 'node:test'
import { buildGuidedPlan } from '../lib/nutrition/assembler.ts'
import { JING_COMPLETION_COMPONENTS, JING_RECIPE_VARIANTS } from '../lib/nutrition/fixtures.ts'
import {
  createInternalPilotConsentLedgerEntry,
  createSyntheticLedgerEntry,
  INTERNAL_PILOT_CONSENT_NOTICE_VERSION,
  replaySyntheticPublicationLedger,
  SyntheticLedgerError,
  type SyntheticLedgerEntry,
} from '../lib/nutrition/synthetic-publication-ledger.ts'
import { createSyntheticPublicationState, SYNTHETIC_CLIENT } from '../lib/nutrition/synthetic-publication.ts'
import { syntheticPreviewScopeKey } from '../lib/nutrition/synthetic-preview-policy.ts'
import { buildSyntheticQuestionnaireProfile } from '../lib/nutrition/questionnaire-profile.ts'

const ACCOUNT_ID = 'user_preview_alpha'
const ACTOR = { id: ACCOUNT_ID, displayName: 'Revisor de Preview' }
const SCOPE_KEY = syntheticPreviewScopeKey(ACCOUNT_ID, SYNTHETIC_CLIENT.id)

function plan(mealCount: 2 | 3 = 3) {
  const result = buildSyntheticQuestionnaireProfile({
    ageYears: 45,
    equationSex: 'female',
    heightFeet: 5,
    heightInches: 5,
    currentWeightLb: 220,
    goalWeightLb: 170,
    activityLevel: 'sedentary',
    mealCount,
    preferredFoods: ['chicken', 'tilapia'],
    dislikedFoods: ['pork'],
    excludedFoods: [],
    medicationReview: 'none',
  })
  assert.ok(result.profile)
  return buildGuidedPlan({
    profile: result.profile,
    recipes: JING_RECIPE_VARIANTS,
    components: JING_COMPLETION_COMPONENTS,
  })
}

function append(
  entries: SyntheticLedgerEntry[],
  action: Parameters<typeof createSyntheticLedgerEntry>[0]['action'],
  at: string,
) {
  const current = replaySyntheticPublicationLedger(entries, SYNTHETIC_CLIENT, {
    scopeKey: SCOPE_KEY,
    accountId: ACCOUNT_ID,
  })
  const next = createSyntheticLedgerEntry({
    ...current,
    scopeKey: SCOPE_KEY,
    accountId: ACCOUNT_ID,
    clientId: SYNTHETIC_CLIENT.id,
    actor: ACTOR,
    at,
    action,
  })
  entries.push(next.entry)
  return next.state
}

test('replays an append-only draft, review, publication, and replacement history', () => {
  const entries: SyntheticLedgerEntry[] = []
  append(entries, { type: 'save_draft', plan: plan(3) }, '2026-09-03T10:00:00.000Z')
  append(entries, { type: 'review', confirmed: true }, '2026-09-03T10:01:00.000Z')
  append(entries, { type: 'publish' }, '2026-09-03T10:02:00.000Z')
  append(entries, { type: 'save_draft', plan: plan(2) }, '2026-09-03T10:03:00.000Z')
  append(entries, { type: 'review', confirmed: true }, '2026-09-03T10:04:00.000Z')
  append(entries, { type: 'review', confirmed: false }, '2026-09-03T10:05:00.000Z')
  append(entries, { type: 'review', confirmed: true }, '2026-09-03T10:06:00.000Z')
  const state = append(entries, { type: 'publish' }, '2026-09-03T10:07:00.000Z')

  assert.equal(entries.length, 8)
  assert.deepEqual(entries.map(entry => entry.revision), [1, 2, 3, 4, 5, 6, 7, 8])
  assert.deepEqual(entries.map(entry => entry.eventType), [
    'draft_saved', 'review_confirmed', 'version_published', 'draft_saved',
    'review_confirmed', 'review_cleared', 'review_confirmed', 'version_published',
  ])
  assert.equal(entries.filter(entry => entry.planJson !== null).length, 2)
  assert.deepEqual(state.publishedVersions.map(version => version.version), [1, 2])
  assert.equal(state.published?.version, 2)
  assert.equal(state.auditTrail.length, entries.length)
})

test('fails closed for cross-account, duplicate, skipped, or corrupted ledger entries', () => {
  const entries: SyntheticLedgerEntry[] = []
  append(entries, { type: 'save_draft', plan: plan() }, '2026-09-03T11:00:00.000Z')

  for (const corrupted of [
    [{ ...entries[0], accountId: 'user_other' }],
    [entries[0], { ...entries[0] }],
    [{ ...entries[0], revision: 2, entryKey: `${SCOPE_KEY}:2` }],
    [{ ...entries[0], planJson: '{' }],
  ]) {
    assert.throws(
      () => replaySyntheticPublicationLedger(corrupted, SYNTHETIC_CLIENT, {
        scopeKey: SCOPE_KEY,
        accountId: ACCOUNT_ID,
      }),
      (error: unknown) => error instanceof SyntheticLedgerError && error.code === 'CORRUPT_LEDGER',
    )
  }
})

test('rejects an invalid transition instead of inventing a publication event', () => {
  assert.throws(
    () => createSyntheticLedgerEntry({
      state: createSyntheticPublicationState(),
      revision: 0,
      scopeKey: SCOPE_KEY,
      accountId: ACCOUNT_ID,
      clientId: SYNTHETIC_CLIENT.id,
      actor: ACTOR,
      at: '2026-09-03T12:00:00.000Z',
      action: { type: 'publish' },
    }),
    (error: unknown) => error instanceof SyntheticLedgerError && error.code === 'INVALID_TRANSITION',
  )
})

test('scope keys isolate the same synthetic client for different authenticated accounts', () => {
  assert.notEqual(
    syntheticPreviewScopeKey('user_alpha', SYNTHETIC_CLIENT.id),
    syntheticPreviewScopeKey('user_beta', SYNTHETIC_CLIENT.id),
  )
})

test('records individual pilot consent in the same account-scoped ledger', () => {
  const entry = createInternalPilotConsentLedgerEntry({
    revision: 0,
    scopeKey: SCOPE_KEY,
    accountId: ACCOUNT_ID,
    clientId: SYNTHETIC_CLIENT.id,
    actor: ACTOR,
    at: '2026-09-03T13:00:00.000Z',
    currentConsent: null,
    accepted: true,
    noticeVersion: INTERNAL_PILOT_CONSENT_NOTICE_VERSION,
  })
  const replayed = replaySyntheticPublicationLedger([entry], SYNTHETIC_CLIENT, {
    scopeKey: SCOPE_KEY,
    accountId: ACCOUNT_ID,
  })

  assert.equal(entry.eventType, 'personal_data_consent_granted')
  assert.equal(replayed.revision, 1)
  assert.deepEqual(replayed.consent, {
    noticeVersion: INTERNAL_PILOT_CONSENT_NOTICE_VERSION,
    grantedAt: '2026-09-03T13:00:00.000Z',
  })
  assert.equal(replayed.state.auditTrail.length, 0)
})

test('rejects duplicate or malformed pilot consent', () => {
  const consent = {
    noticeVersion: INTERNAL_PILOT_CONSENT_NOTICE_VERSION,
    grantedAt: '2026-09-03T13:00:00.000Z',
  } as const
  assert.throws(
    () => createInternalPilotConsentLedgerEntry({
      revision: 1,
      scopeKey: SCOPE_KEY,
      accountId: ACCOUNT_ID,
      clientId: SYNTHETIC_CLIENT.id,
      actor: ACTOR,
      at: '2026-09-03T13:01:00.000Z',
      currentConsent: consent,
      accepted: true,
      noticeVersion: INTERNAL_PILOT_CONSENT_NOTICE_VERSION,
    }),
    (error: unknown) => error instanceof SyntheticLedgerError && error.code === 'INVALID_TRANSITION',
  )
})
