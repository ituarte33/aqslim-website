import type { GuidedPlan } from './types'

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
  if (plan.status !== 'ready_for_review' || state.draft?.plan === plan) return state

  const draft: SyntheticPlanSnapshot = {
    plan,
    version: (state.draft?.version ?? 0) + 1,
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
  if (!state.draft || state.published?.version === state.draft.version) return state
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
    && state.published?.version !== state.draft.version,
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
