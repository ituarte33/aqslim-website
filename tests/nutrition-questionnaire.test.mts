import assert from 'node:assert/strict'
import test from 'node:test'
import { buildGuidedPlan } from '../lib/nutrition/assembler.ts'
import { JING_COMPLETION_COMPONENTS, JING_RECIPE_VARIANTS } from '../lib/nutrition/fixtures.ts'
import {
  buildSyntheticQuestionnaireProfile,
  type SyntheticQuestionnaireAnswers,
} from '../lib/nutrition/questionnaire-profile.ts'
import {
  canPublishSyntheticDraft,
  compareSyntheticPlans,
  confirmSyntheticReview,
  createSyntheticPublicationState,
  hasSameSyntheticClientDelivery,
  hasSameSyntheticPlan,
  publishSyntheticDraft,
  saveSyntheticDraft,
  SYNTHETIC_CLIENT,
  SYNTHETIC_REVIEWER,
} from '../lib/nutrition/synthetic-publication.ts'
import { planContainsBlockedFood, validateEveryCombination } from '../lib/nutrition/validation.ts'

const BASE: SyntheticQuestionnaireAnswers = {
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

function generate(answers: SyntheticQuestionnaireAnswers) {
  const result = buildSyntheticQuestionnaireProfile(answers)
  assert.ok(result.profile)
  return buildGuidedPlan({
    profile: result.profile,
    recipes: JING_RECIPE_VARIANTS,
    components: JING_COMPLETION_COMPONENTS,
  })
}

test('a 380 lb synthetic profile receives maintenance minus 500 without a 2,000 kcal ceiling', () => {
  const plan = generate({
    ...BASE,
    ageYears: 60,
    equationSex: 'male',
    heightFeet: 5,
    heightInches: 10,
    currentWeightLb: 380,
    goalWeightLb: 240,
    mealCount: 2,
    preferredFoods: ['chicken', 'sirloin'],
    dislikedFoods: ['fish'],
  })

  assert.equal(plan.profile.energyInputs.requestedDeficitCalories, 500)
  assert.equal(plan.energyEstimate.maintenanceCalories, 3_050)
  assert.equal(plan.profile.calorieTarget, 2_550)
  assert.equal(plan.energyEstimate.appliedDeficitCalories, 500)
  assert.equal(plan.energyEstimate.maintenanceCalories - plan.profile.calorieTarget, plan.energyEstimate.appliedDeficitCalories)
  assert.equal(plan.status, 'ready_for_review')
  assert.deepEqual(plan.groups.map(group => group.options.length), [3, 3])
  assert.deepEqual(validateEveryCombination(plan), [])
})

test('a dairy-free three-meal questionnaire produces three safe choices per meal', () => {
  const plan = generate({ ...BASE, excludedFoods: ['dairy'], dislikedFoods: ['pork'] })

  assert.equal(plan.status, 'ready_for_review')
  assert.deepEqual(plan.groups.map(group => group.options.length), [3, 3, 3])
  assert.equal(planContainsBlockedFood(plan, 'dairy'), false)
  assert.equal(planContainsBlockedFood(plan, 'oaxaca cheese'), false)
})

test('a medication review flag stops generation before any choices are shown', () => {
  const plan = generate({ ...BASE, medicationReview: 'required' })

  assert.equal(plan.status, 'blocked_safety_review')
  assert.deepEqual(plan.groups, [])
})

test('strict exclusions override dislikes and preferences', () => {
  const result = buildSyntheticQuestionnaireProfile({
    ...BASE,
    preferredFoods: ['egg', 'chicken'],
    dislikedFoods: ['egg'],
    excludedFoods: ['egg'],
  })

  assert.ok(result.profile)
  assert.deepEqual(result.profile.excludedFoods, ['egg'])
  assert.equal(result.profile.dislikedFoods.includes('egg'), false)
  assert.equal(result.profile.preferredFoods.includes('egg'), false)
})

test('invalid goals are rejected without creating a profile', () => {
  const result = buildSyntheticQuestionnaireProfile({ ...BASE, goalWeightLb: 220 })

  assert.equal(result.profile, null)
  assert.deepEqual(result.errors, ['invalid_goal_weight'])
})

test('an incomplete three-choice library remains stopped for review', () => {
  const result = buildSyntheticQuestionnaireProfile({ ...BASE, mealCount: 2 })
  assert.ok(result.profile)
  const reducedRecipes = JING_RECIPE_VARIANTS.filter(recipe => ['PIL-J04', 'PIL-J05'].includes(recipe.familyId))
  const plan = buildGuidedPlan({
    profile: result.profile,
    recipes: reducedRecipes,
    components: JING_COMPLETION_COMPONENTS,
  })

  assert.equal(plan.groups.some(group => group.options.length < 3), true)
  assert.equal(plan.status, 'insufficient_library')
})

test('a synthetic plan cannot publish before a ready draft and explicit human review', () => {
  const readyPlan = generate(BASE)
  const blockedPlan = generate({ ...BASE, medicationReview: 'required' })
  const empty = createSyntheticPublicationState()

  assert.equal(saveSyntheticDraft(empty, blockedPlan), empty)
  const drafted = saveSyntheticDraft(empty, readyPlan, SYNTHETIC_REVIEWER, '2026-09-02T16:00:00.000Z')
  assert.equal(drafted.draft?.version, 1)
  assert.deepEqual(drafted.draft?.client, SYNTHETIC_CLIENT)
  assert.deepEqual(drafted.draft?.savedBy, SYNTHETIC_REVIEWER)
  assert.equal(drafted.published, null)
  assert.equal(canPublishSyntheticDraft(drafted), false)
  assert.equal(publishSyntheticDraft(drafted), drafted)

  const reviewed = confirmSyntheticReview(
    drafted,
    true,
    SYNTHETIC_REVIEWER,
    '2026-09-02T16:05:00.000Z',
  )
  assert.equal(canPublishSyntheticDraft(reviewed), true)
  assert.equal(reviewed.review?.reviewer.displayName, 'Revisor sintético 01')
  const published = publishSyntheticDraft(
    reviewed,
    SYNTHETIC_REVIEWER,
    '2026-09-02T16:06:00.000Z',
  )
  assert.equal(published.published?.version, 1)
  assert.equal(published.published?.plan, readyPlan)
  assert.equal(published.published?.replacesVersion, null)
  assert.deepEqual(published.publishedVersions.map(version => version.version), [1])
  assert.deepEqual(published.auditTrail.map(event => event.type), [
    'draft_saved',
    'review_confirmed',
    'version_published',
  ])
})

test('a reviewed v2 replaces v1 without erasing the frozen publication history', () => {
  const firstPlan = generate(BASE)
  const revisedPlan = generate({ ...BASE, mealCount: 2 })
  const firstDraft = saveSyntheticDraft(
    createSyntheticPublicationState(),
    firstPlan,
    SYNTHETIC_REVIEWER,
    '2026-09-02T16:00:00.000Z',
  )
  const firstPublished = publishSyntheticDraft(
    confirmSyntheticReview(firstDraft, true, SYNTHETIC_REVIEWER, '2026-09-02T16:05:00.000Z'),
    SYNTHETIC_REVIEWER,
    '2026-09-02T16:06:00.000Z',
  )
  const revisedDraft = saveSyntheticDraft(
    firstPublished,
    revisedPlan,
    SYNTHETIC_REVIEWER,
    '2026-09-02T17:00:00.000Z',
  )

  assert.equal(revisedDraft.draft?.version, 2)
  assert.equal(revisedDraft.draft?.plan, revisedPlan)
  assert.equal(revisedDraft.published?.version, 1)
  assert.equal(revisedDraft.published?.plan, firstPlan)
  assert.equal(revisedDraft.review, null)
  assert.equal(canPublishSyntheticDraft(revisedDraft), false)

  const secondPublished = publishSyntheticDraft(
    confirmSyntheticReview(revisedDraft, true, SYNTHETIC_REVIEWER, '2026-09-02T17:05:00.000Z'),
    SYNTHETIC_REVIEWER,
    '2026-09-02T17:06:00.000Z',
  )

  assert.equal(secondPublished.published?.version, 2)
  assert.equal(secondPublished.published?.replacesVersion, 1)
  assert.deepEqual(secondPublished.publishedVersions.map(version => version.version), [1, 2])
  assert.equal(secondPublished.publishedVersions[0]?.plan, firstPlan)
  assert.equal(secondPublished.publishedVersions[1]?.plan, revisedPlan)
  assert.equal(secondPublished.auditTrail.length, 6)
})

test('saving an unchanged plan does not create a duplicate synthetic version', () => {
  const plan = generate(BASE)
  const firstDraft = saveSyntheticDraft(createSyntheticPublicationState(), plan)

  assert.equal(saveSyntheticDraft(firstDraft, plan), firstDraft)
  assert.equal(hasSameSyntheticPlan(plan, JSON.parse(JSON.stringify(plan))), true)
  assert.equal(saveSyntheticDraft(firstDraft, JSON.parse(JSON.stringify(plan))), firstDraft)
})

test('profile-only changes are visible in comparison but cannot publish an identical client delivery', () => {
  const plan = generate(BASE)
  const firstPublished = publishSyntheticDraft(
    confirmSyntheticReview(saveSyntheticDraft(createSyntheticPublicationState(), plan), true),
  )
  const profileOnlyPlan = {
    ...plan,
    profile: {
      ...plan.profile,
      preferredFoods: [...plan.profile.preferredFoods, 'egg'],
    },
  }
  const secondDraft = saveSyntheticDraft(firstPublished, profileOnlyPlan)
  const comparison = compareSyntheticPlans(plan, profileOnlyPlan)

  assert.equal(secondDraft.draft?.version, 2)
  assert.equal(comparison.clientDeliveryChanged, false)
  assert.equal(comparison.profileChanges.some(change => change.field === 'preferredFoods'), true)
  assert.equal(comparison.recipeChanges.length, 0)
  assert.equal(comparison.detailChanges.length, 0)
  assert.equal(hasSameSyntheticClientDelivery(plan, profileOnlyPlan), true)
  assert.equal(confirmSyntheticReview(secondDraft, true), secondDraft)
  assert.equal(canPublishSyntheticDraft(secondDraft), false)
  assert.equal(publishSyntheticDraft(secondDraft), secondDraft)
})

test('a changed client delivery compares recipes and keeps the next unpublished draft version stable', () => {
  const firstPlan = generate(BASE)
  const secondPlan = generate({ ...BASE, mealCount: 2 })
  const firstPublished = publishSyntheticDraft(
    confirmSyntheticReview(saveSyntheticDraft(createSyntheticPublicationState(), firstPlan), true),
  )
  const profileOnlyPlan = {
    ...firstPlan,
    profile: { ...firstPlan.profile, preferredFoods: ['egg'] },
  }
  const unchangedDeliveryDraft = saveSyntheticDraft(firstPublished, profileOnlyPlan)
  const changedDeliveryDraft = saveSyntheticDraft(unchangedDeliveryDraft, secondPlan)
  const comparison = compareSyntheticPlans(firstPlan, secondPlan)

  assert.equal(unchangedDeliveryDraft.draft?.version, 2)
  assert.equal(changedDeliveryDraft.draft?.version, 2)
  assert.equal(comparison.clientDeliveryChanged, true)
  assert.equal(comparison.profileChanges.some(change => change.field === 'mealSlots'), true)
  assert.equal(comparison.recipeChanges.length > 0, true)
  assert.equal(hasSameSyntheticClientDelivery(firstPlan, secondPlan), false)
  assert.equal(canPublishSyntheticDraft(confirmSyntheticReview(changedDeliveryDraft, true)), true)
})

test('the comparison explains macro changes inside an otherwise matching recipe', () => {
  const firstPlan = generate(BASE)
  const firstGroup = firstPlan.groups[0]
  const firstOption = firstGroup.options[0]
  const revisedPlan = {
    ...firstPlan,
    groups: [
      {
        ...firstGroup,
        options: [
          {
            ...firstOption,
            totals: { ...firstOption.totals, proteinG: firstOption.totals.proteinG + 1 },
          },
          ...firstGroup.options.slice(1),
        ],
      },
      ...firstPlan.groups.slice(1),
    ],
  }
  const comparison = compareSyntheticPlans(firstPlan, revisedPlan)

  assert.equal(comparison.clientDeliveryChanged, true)
  assert.equal(comparison.detailChanges.length, 1)
  assert.equal(comparison.detailChanges[0]?.macros?.after.proteinG, firstOption.totals.proteinG + 1)
})
