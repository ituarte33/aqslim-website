import type { GuidedPlan } from './types'

export type SyntheticPlanSnapshot = {
  plan: GuidedPlan
  version: number
}

export type SyntheticPublicationState = {
  draft: SyntheticPlanSnapshot | null
  published: SyntheticPlanSnapshot | null
  reviewConfirmed: boolean
}

export function createSyntheticPublicationState(): SyntheticPublicationState {
  return {
    draft: null,
    published: null,
    reviewConfirmed: false,
  }
}

export function saveSyntheticDraft(
  state: SyntheticPublicationState,
  plan: GuidedPlan,
): SyntheticPublicationState {
  if (plan.status !== 'ready_for_review') return state

  return {
    ...state,
    draft: {
      plan,
      version: (state.draft?.version ?? 0) + 1,
    },
    reviewConfirmed: false,
  }
}

export function confirmSyntheticReview(
  state: SyntheticPublicationState,
  confirmed: boolean,
): SyntheticPublicationState {
  if (!state.draft || state.published?.version === state.draft.version) return state
  return { ...state, reviewConfirmed: confirmed }
}

export function canPublishSyntheticDraft(state: SyntheticPublicationState): boolean {
  return Boolean(
    state.draft
    && state.reviewConfirmed
    && state.published?.version !== state.draft.version,
  )
}

export function publishSyntheticDraft(state: SyntheticPublicationState): SyntheticPublicationState {
  if (!canPublishSyntheticDraft(state) || !state.draft) return state
  return {
    ...state,
    published: state.draft,
  }
}
