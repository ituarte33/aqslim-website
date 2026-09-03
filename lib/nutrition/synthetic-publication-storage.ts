import {
  createSyntheticPublicationState,
  type SyntheticAuditEvent,
  type SyntheticPlanSnapshot,
  type SyntheticPublicationState,
  type SyntheticPublishedSnapshot,
  type SyntheticReview,
  type SyntheticWorkflowIdentity,
} from './synthetic-publication.ts'
import type { GuidedPlan } from './types'

const STORAGE_PREFIX = 'myaq-preview-synthetic-publication'
const STORAGE_VERSION = 1

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

type StoredSyntheticPublication = {
  version: typeof STORAGE_VERSION
  clientId: string
  state: SyntheticPublicationState
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isIdentity(value: unknown): value is SyntheticWorkflowIdentity {
  return isRecord(value) && typeof value.id === 'string' && typeof value.displayName === 'string'
}

function sameIdentity(value: unknown, expected: SyntheticWorkflowIdentity) {
  return isIdentity(value) && value.id === expected.id && value.displayName === expected.displayName
}

function isLocalizedText(value: unknown) {
  return isRecord(value) && typeof value.es === 'string' && typeof value.en === 'string'
}

function isTotals(value: unknown) {
  return isRecord(value)
    && isFiniteNumber(value.calories)
    && isFiniteNumber(value.proteinG)
    && isFiniteNumber(value.fatG)
    && isFiniteNumber(value.netCarbsG)
}

function isGuidedPlan(value: unknown): value is GuidedPlan {
  if (!isRecord(value) || value.source !== 'synthetic_preview' || value.requiresHumanReview !== true) return false
  if (typeof value.id !== 'string' || !isStringArray(value.reasons)) return false
  if (!['ready_for_review', 'insufficient_library', 'blocked_safety_review', 'blocked_profile'].includes(String(value.status))) return false

  const profile = value.profile
  const inputs = isRecord(profile) ? profile.energyInputs : null
  if (!isRecord(profile) || !isRecord(inputs)) return false
  if (
    typeof profile.id !== 'string'
    || typeof profile.firstName !== 'string'
    || !['es', 'en'].includes(String(profile.language))
    || !['Jing', 'Qi', 'Xue', 'Yang Sheng'].includes(String(profile.phase))
    || !isFiniteNumber(profile.calorieTarget)
    || !Array.isArray(profile.mealSlots)
    || !profile.mealSlots.every(slot => ['first_meal', 'lunch', 'dinner'].includes(String(slot)))
    || !isStringArray(profile.preferredFoods)
    || !isStringArray(profile.dislikedFoods)
    || !isStringArray(profile.excludedFoods)
    || typeof profile.safetyReviewRequired !== 'boolean'
    || !isFiniteNumber(inputs.ageYears)
    || !['female', 'male'].includes(String(inputs.equationSex))
    || !isFiniteNumber(inputs.heightCm)
    || !isFiniteNumber(inputs.currentWeightKg)
    || !isFiniteNumber(inputs.goalWeightKg)
    || !['sedentary', 'light', 'moderate'].includes(String(inputs.activityLevel))
    || !isFiniteNumber(inputs.requestedDeficitCalories)
  ) return false

  const estimate = value.energyEstimate
  if (!isRecord(estimate)
    || !isFiniteNumber(estimate.restingCalories)
    || !isFiniteNumber(estimate.maintenanceCalories)
    || !isFiniteNumber(estimate.targetCalories)
    || !isFiniteNumber(estimate.appliedDeficitCalories)
    || !isFiniteNumber(estimate.deficitPercent)
    || !isFiniteNumber(estimate.proteinFloorG)
    || !isFiniteNumber(estimate.proteinCeilingG)
    || typeof estimate.reviewRequired !== 'boolean'
    || !isStringArray(estimate.reasons)
  ) return false

  if (!Array.isArray(value.groups) || !value.groups.every(group => {
    if (!isRecord(group)
      || !['first_meal', 'lunch', 'dinner'].includes(String(group.slot))
      || !isFiniteNumber(group.targetCalories)
      || !isFiniteNumber(group.carbBudgetG)
      || !Array.isArray(group.options)
    ) return false
    return group.options.every(option => isRecord(option)
      && typeof option.id === 'string'
      && typeof option.recipeId === 'string'
      && typeof option.familyId === 'string'
      && isLocalizedText(option.name)
      && isLocalizedText(option.portion)
      && ['first_meal', 'lunch', 'dinner'].includes(String(option.slot))
      && ['L', 'E', 'M', 'H'].includes(String(option.band))
      && typeof option.conditional === 'boolean'
      && isFiniteNumber(option.minutes)
      && isStringArray(option.componentIds)
      && Array.isArray(option.componentNames)
      && option.componentNames.every(isLocalizedText)
      && isStringArray(option.ingredients)
      && isStringArray(option.allergens)
      && isTotals(option.totals)
      && isFiniteNumber(option.preferenceScore))
  })) return false

  const envelope = value.envelope
  return isRecord(envelope)
    && isFiniteNumber(envelope.minCalories)
    && isFiniteNumber(envelope.maxCalories)
    && isFiniteNumber(envelope.maxNetCarbsG)
    && isFiniteNumber(envelope.minProteinG)
    && isFiniteNumber(envelope.maxProteinG)
    && isFiniteNumber(envelope.calorieFloor)
    && isFiniteNumber(envelope.calorieCeiling)
    && isFiniteNumber(envelope.carbCeilingG)
    && typeof envelope.passes === 'boolean'
}

function isSnapshot(value: unknown, client: SyntheticWorkflowIdentity): value is SyntheticPlanSnapshot {
  return isRecord(value)
    && isGuidedPlan(value.plan)
    && isPositiveInteger(value.version)
    && sameIdentity(value.client, client)
    && isIdentity(value.savedBy)
    && isValidDate(value.savedAt)
}

function isPublishedSnapshot(value: unknown, client: SyntheticWorkflowIdentity): value is SyntheticPublishedSnapshot {
  if (!isSnapshot(value, client)) return false
  const published = value as unknown as Record<string, unknown>
  return isIdentity(published.publishedBy)
    && isValidDate(published.publishedAt)
    && (published.replacesVersion === null || isPositiveInteger(published.replacesVersion))
}

function isReview(value: unknown): value is SyntheticReview {
  return isRecord(value)
    && isPositiveInteger(value.draftVersion)
    && isIdentity(value.reviewer)
    && isValidDate(value.reviewedAt)
}

function isAuditEvent(value: unknown): value is SyntheticAuditEvent {
  return isRecord(value)
    && typeof value.id === 'string'
    && ['draft_saved', 'review_confirmed', 'review_cleared', 'version_published'].includes(String(value.type))
    && isPositiveInteger(value.version)
    && isIdentity(value.actor)
    && isValidDate(value.at)
}

export function parseSyntheticGuidedPlan(value: unknown): GuidedPlan | null {
  return isGuidedPlan(value) ? value : null
}

export function parseSyntheticPublicationState(
  value: unknown,
  client: SyntheticWorkflowIdentity,
): SyntheticPublicationState | null {
  return isPublicationState(value, client) ? value : null
}

function isPublicationState(value: unknown, client: SyntheticWorkflowIdentity): value is SyntheticPublicationState {
  if (!isRecord(value) || !sameIdentity(value.client, client)) return false
  if (value.draft !== null && !isSnapshot(value.draft, client)) return false
  if (value.published !== null && !isPublishedSnapshot(value.published, client)) return false
  if (value.review !== null && !isReview(value.review)) return false
  if (!Array.isArray(value.publishedVersions) || !value.publishedVersions.every(item => isPublishedSnapshot(item, client))) return false
  if (!Array.isArray(value.auditTrail) || !value.auditTrail.every(isAuditEvent)) return false

  const draft = value.draft as SyntheticPlanSnapshot | null
  const published = value.published as SyntheticPublishedSnapshot | null
  const review = value.review as SyntheticReview | null
  const versions = value.publishedVersions as SyntheticPublishedSnapshot[]
  if (review && (!draft || review.draftVersion !== draft.version)) return false
  if (published && (!draft || draft.version < published.version)) return false
  if (published && (versions.length === 0 || JSON.stringify(versions.at(-1)) !== JSON.stringify(published))) return false
  if (!published && versions.length > 0) return false
  if (versions.some((item, index) => item.version !== index + 1 || item.replacesVersion !== (index === 0 ? null : index))) return false
  if (draft && draft.version !== (published?.version ?? 0) && draft.version !== (published?.version ?? 0) + 1) return false
  return true
}

export function syntheticPublicationStorageKey(clientId: string) {
  return `${STORAGE_PREFIX}:v${STORAGE_VERSION}:${clientId.trim().toLowerCase()}`
}

export function parseStoredSyntheticPublication(
  rawValue: string | null,
  client: SyntheticWorkflowIdentity,
): SyntheticPublicationState {
  if (!rawValue) return createSyntheticPublicationState(client)

  try {
    const stored: unknown = JSON.parse(rawValue)
    if (!isRecord(stored)
      || stored.version !== STORAGE_VERSION
      || stored.clientId !== client.id
      || !isPublicationState(stored.state, client)
    ) return createSyntheticPublicationState(client)
    return stored.state
  } catch {
    return createSyntheticPublicationState(client)
  }
}

export function loadSyntheticPublication(storage: StorageLike, client: SyntheticWorkflowIdentity) {
  try {
    return parseStoredSyntheticPublication(storage.getItem(syntheticPublicationStorageKey(client.id)), client)
  } catch {
    return createSyntheticPublicationState(client)
  }
}

export function saveSyntheticPublication(storage: StorageLike, state: SyntheticPublicationState) {
  const key = syntheticPublicationStorageKey(state.client.id)
  try {
    if (!state.draft && !state.published && state.auditTrail.length === 0) storage.removeItem(key)
    else storage.setItem(key, JSON.stringify({
      version: STORAGE_VERSION,
      clientId: state.client.id,
      state,
    } satisfies StoredSyntheticPublication))
    return true
  } catch {
    return false
  }
}
