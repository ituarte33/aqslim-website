import type { GuidedPlan, LocalizedText, MealSlot, NutritionTotals } from './types'

export type SyntheticProfileChangeField =
  | 'phase'
  | 'calorieTarget'
  | 'mealSlots'
  | 'preferredFoods'
  | 'dislikedFoods'
  | 'excludedFoods'
  | 'ageYears'
  | 'heightCm'
  | 'currentWeightKg'
  | 'goalWeightKg'
  | 'activityLevel'

export type SyntheticProfileChange = {
  field: SyntheticProfileChangeField
  before: string
  after: string
}

export type SyntheticRecipeChange = {
  type: 'added' | 'removed' | 'reordered'
  slot: MealSlot
  familyId: string
  name: GuidedPlan['groups'][number]['options'][number]['name']
  beforePosition: number | null
  afterPosition: number | null
}

export type SyntheticRecipeDetailChange = {
  slot: MealSlot
  familyId: string
  name: GuidedPlan['groups'][number]['options'][number]['name']
  portion: { before: LocalizedText; after: LocalizedText } | null
  components: { before: readonly LocalizedText[]; after: readonly LocalizedText[] } | null
  calories: { before: number; after: number } | null
  macros: { before: NutritionTotals; after: NutritionTotals } | null
}

export type SyntheticPlanComparison = {
  clientDeliveryChanged: boolean
  profileChanges: readonly SyntheticProfileChange[]
  recipeChanges: readonly SyntheticRecipeChange[]
  detailChanges: readonly SyntheticRecipeDetailChange[]
}

export type SyntheticWorkflowIdentity = {
  id: string
  displayName: string
}

export type SyntheticPlanSnapshot = {
  plan: GuidedPlan
  version: number
  client: SyntheticWorkflowIdentity
  savedBy: SyntheticWorkflowIdentity
  savedAt: string
}

export type SyntheticPublishedSnapshot = SyntheticPlanSnapshot & {
  publishedBy: SyntheticWorkflowIdentity
  publishedAt: string
  replacesVersion: number | null
}

export type SyntheticReview = {
  draftVersion: number
  reviewer: SyntheticWorkflowIdentity
  reviewedAt: string
}

export type SyntheticAuditEvent = {
  id: string
  type: 'draft_saved' | 'review_confirmed' | 'version_published'
  version: number
  actor: SyntheticWorkflowIdentity
  at: string
}

export type SyntheticPublicationState = {
  client: SyntheticWorkflowIdentity
  draft: SyntheticPlanSnapshot | null
  published: SyntheticPublishedSnapshot | null
  publishedVersions: readonly SyntheticPublishedSnapshot[]
  review: SyntheticReview | null
  auditTrail: readonly SyntheticAuditEvent[]
}

export const SYNTHETIC_CLIENT: SyntheticWorkflowIdentity = {
  id: 'SYN-CLIENT-001',
  displayName: 'Cliente sintético 001',
}

export const SYNTHETIC_REVIEWER: SyntheticWorkflowIdentity = {
  id: 'SYN-REVIEWER-001',
  displayName: 'Revisor sintético 01',
}

function listValue(values: readonly string[]) {
  return [...values].toSorted().join(', ')
}

function profileValues(plan: GuidedPlan): Record<SyntheticProfileChangeField, string> {
  const { profile } = plan
  const { energyInputs } = profile
  return {
    phase: profile.phase,
    calorieTarget: String(profile.calorieTarget),
    mealSlots: profile.mealSlots.join(', '),
    preferredFoods: listValue(profile.preferredFoods),
    dislikedFoods: listValue(profile.dislikedFoods),
    excludedFoods: listValue(profile.excludedFoods),
    ageYears: String(energyInputs.ageYears),
    heightCm: String(energyInputs.heightCm),
    currentWeightKg: String(energyInputs.currentWeightKg),
    goalWeightKg: String(energyInputs.goalWeightKg),
    activityLevel: energyInputs.activityLevel,
  }
}

function clientDeliverySignature(plan: GuidedPlan) {
  return JSON.stringify({
    phase: plan.profile.phase,
    groups: plan.groups.map(group => ({
      slot: group.slot,
      options: group.options.map(option => ({
        familyId: option.familyId,
        recipeId: option.recipeId,
        name: option.name,
        portion: option.portion,
        minutes: option.minutes,
        band: option.band,
        conditional: option.conditional,
        componentIds: option.componentIds,
        componentNames: option.componentNames,
        ingredients: option.ingredients,
        allergens: option.allergens,
        totals: option.totals,
      })),
    })),
  })
}

function fullPlanSignature(plan: GuidedPlan) {
  return JSON.stringify(plan)
}

export function hasSameSyntheticPlan(before: GuidedPlan, after: GuidedPlan): boolean {
  return fullPlanSignature(before) === fullPlanSignature(after)
}

export function hasSameSyntheticClientDelivery(before: GuidedPlan, after: GuidedPlan): boolean {
  return clientDeliverySignature(before) === clientDeliverySignature(after)
}

export function compareSyntheticPlans(before: GuidedPlan, after: GuidedPlan): SyntheticPlanComparison {
  const beforeProfile = profileValues(before)
  const afterProfile = profileValues(after)
  const profileChanges = (Object.keys(beforeProfile) as SyntheticProfileChangeField[])
    .filter(field => beforeProfile[field] !== afterProfile[field])
    .map(field => ({ field, before: beforeProfile[field], after: afterProfile[field] }))
  const recipeChanges: SyntheticRecipeChange[] = []
  const detailChanges: SyntheticRecipeDetailChange[] = []
  const slots = new Set<MealSlot>([
    ...before.groups.map(group => group.slot),
    ...after.groups.map(group => group.slot),
  ])

  for (const slot of slots) {
    const beforeOptions = before.groups.find(group => group.slot === slot)?.options ?? []
    const afterOptions = after.groups.find(group => group.slot === slot)?.options ?? []
    const beforeByFamily = new Map(beforeOptions.map((option, index) => [option.familyId, { option, index }]))
    const afterByFamily = new Map(afterOptions.map((option, index) => [option.familyId, { option, index }]))
    const families = new Set([...beforeByFamily.keys(), ...afterByFamily.keys()])

    for (const familyId of families) {
      const previous = beforeByFamily.get(familyId)
      const next = afterByFamily.get(familyId)
      if (!previous && next) {
        recipeChanges.push({
          type: 'added', slot, familyId, name: next.option.name,
          beforePosition: null, afterPosition: next.index + 1,
        })
        continue
      }
      if (previous && !next) {
        recipeChanges.push({
          type: 'removed', slot, familyId, name: previous.option.name,
          beforePosition: previous.index + 1, afterPosition: null,
        })
        continue
      }
      if (!previous || !next) continue
      if (previous.index !== next.index) {
        recipeChanges.push({
          type: 'reordered', slot, familyId, name: next.option.name,
          beforePosition: previous.index + 1, afterPosition: next.index + 1,
        })
      }

      const previousPortion = JSON.stringify(previous.option.portion)
      const nextPortion = JSON.stringify(next.option.portion)
      const previousComponents = previous.option.componentIds.join(', ')
      const nextComponents = next.option.componentIds.join(', ')
      const portion = previousPortion === nextPortion
        ? null
        : { before: previous.option.portion, after: next.option.portion }
      const components = previousComponents === nextComponents
        ? null
        : { before: previous.option.componentNames, after: next.option.componentNames }
      const calories = previous.option.totals.calories === next.option.totals.calories
        ? null
        : { before: previous.option.totals.calories, after: next.option.totals.calories }
      const previousMacros = {
        proteinG: previous.option.totals.proteinG,
        fatG: previous.option.totals.fatG,
        netCarbsG: previous.option.totals.netCarbsG,
      }
      const nextMacros = {
        proteinG: next.option.totals.proteinG,
        fatG: next.option.totals.fatG,
        netCarbsG: next.option.totals.netCarbsG,
      }
      const macros = JSON.stringify(previousMacros) === JSON.stringify(nextMacros)
        ? null
        : { before: previous.option.totals, after: next.option.totals }
      if (portion || components || calories || macros) {
        detailChanges.push({
          slot, familyId, name: next.option.name, portion, components, calories, macros,
        })
      }
    }
  }

  return {
    clientDeliveryChanged: !hasSameSyntheticClientDelivery(before, after),
    profileChanges,
    recipeChanges,
    detailChanges,
  }
}

function auditEvent(
  state: SyntheticPublicationState,
  type: SyntheticAuditEvent['type'],
  version: number,
  actor: SyntheticWorkflowIdentity,
  at: string,
): SyntheticAuditEvent {
  return {
    id: `SYN-AUDIT-${state.auditTrail.length + 1}`,
    type,
    version,
    actor,
    at,
  }
}

export function createSyntheticPublicationState(
  client: SyntheticWorkflowIdentity = SYNTHETIC_CLIENT,
): SyntheticPublicationState {
  return {
    client,
    draft: null,
    published: null,
    publishedVersions: [],
    review: null,
    auditTrail: [],
  }
}

export function saveSyntheticDraft(
  state: SyntheticPublicationState,
  plan: GuidedPlan,
  actor: SyntheticWorkflowIdentity = SYNTHETIC_REVIEWER,
  at = new Date().toISOString(),
): SyntheticPublicationState {
  if (plan.status !== 'ready_for_review' || (state.draft && hasSameSyntheticPlan(state.draft.plan, plan))) return state

  const draft: SyntheticPlanSnapshot = {
    plan,
    version: (state.published?.version ?? 0) + 1,
    client: state.client,
    savedBy: actor,
    savedAt: at,
  }

  return {
    ...state,
    draft,
    review: null,
    auditTrail: [...state.auditTrail, auditEvent(state, 'draft_saved', draft.version, actor, at)],
  }
}

export function confirmSyntheticReview(
  state: SyntheticPublicationState,
  confirmed: boolean,
  reviewer: SyntheticWorkflowIdentity = SYNTHETIC_REVIEWER,
  at = new Date().toISOString(),
): SyntheticPublicationState {
  if (
    !state.draft
    || state.published?.version === state.draft.version
    || (state.published && hasSameSyntheticClientDelivery(state.published.plan, state.draft.plan))
  ) return state
  if (!confirmed) return { ...state, review: null }
  if (state.review?.draftVersion === state.draft.version) return state

  const review: SyntheticReview = {
    draftVersion: state.draft.version,
    reviewer,
    reviewedAt: at,
  }

  return {
    ...state,
    review,
    auditTrail: [
      ...state.auditTrail,
      auditEvent(state, 'review_confirmed', state.draft.version, reviewer, at),
    ],
  }
}

export function canPublishSyntheticDraft(state: SyntheticPublicationState): boolean {
  return Boolean(
    state.draft
    && state.review?.draftVersion === state.draft.version
    && state.published?.version !== state.draft.version
    && (!state.published || !hasSameSyntheticClientDelivery(state.published.plan, state.draft.plan)),
  )
}

export function publishSyntheticDraft(
  state: SyntheticPublicationState,
  actor: SyntheticWorkflowIdentity = SYNTHETIC_REVIEWER,
  at = new Date().toISOString(),
): SyntheticPublicationState {
  if (!canPublishSyntheticDraft(state) || !state.draft) return state

  const published: SyntheticPublishedSnapshot = {
    ...state.draft,
    publishedBy: actor,
    publishedAt: at,
    replacesVersion: state.published?.version ?? null,
  }

  return {
    ...state,
    published,
    publishedVersions: [...state.publishedVersions, published],
    auditTrail: [
      ...state.auditTrail,
      auditEvent(state, 'version_published', published.version, actor, at),
    ],
  }
}
