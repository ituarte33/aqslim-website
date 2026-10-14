import {
  confirmSyntheticReview,
  createSyntheticPublicationState,
  publishSyntheticDraft,
  saveSyntheticDraft,
  type SyntheticPublicationState,
  type SyntheticWorkflowIdentity,
} from './synthetic-publication.ts'
import { parseSyntheticGuidedPlan } from './synthetic-publication-storage.ts'
import type { GuidedPlan } from './types'

export type SyntheticLedgerEventType =
  | 'personal_data_consent_granted'
  | 'draft_saved'
  | 'review_confirmed'
  | 'review_cleared'
  | 'version_published'

export type SyntheticLedgerEntry = {
  entryKey: string
  scopeKey: string
  accountId: string
  clientId: string
  revision: number
  eventType: SyntheticLedgerEventType
  planVersion: number
  planJson: string | null
  actor: SyntheticWorkflowIdentity
  at: string
}

export type SyntheticPublicationAction =
  | { type: 'save_draft'; plan: GuidedPlan }
  | { type: 'review'; confirmed: boolean }
  | { type: 'publish' }

export const INTERNAL_PILOT_CONSENT_NOTICE_VERSION = '2026-09-03'

export type InternalPilotConsent = {
  noticeVersion: typeof INTERNAL_PILOT_CONSENT_NOTICE_VERSION
  grantedAt: string
}

type StoredInternalPilotConsent = {
  schema: 'myaq-internal-personal-pilot-consent'
  accepted: true
  noticeVersion: typeof INTERNAL_PILOT_CONSENT_NOTICE_VERSION
}

export class SyntheticLedgerError extends Error {
  readonly code: 'CORRUPT_LEDGER' | 'INVALID_TRANSITION'

  constructor(code: 'CORRUPT_LEDGER' | 'INVALID_TRANSITION') {
    super(code)
    this.name = 'SyntheticLedgerError'
    this.code = code
  }
}

function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0
}

function stateAfterEntry(
  state: SyntheticPublicationState,
  entry: SyntheticLedgerEntry,
): SyntheticPublicationState {
  if (entry.eventType === 'draft_saved') {
    if (!entry.planJson) throw new SyntheticLedgerError('CORRUPT_LEDGER')
    let parsed: unknown
    try {
      parsed = JSON.parse(entry.planJson)
    } catch {
      throw new SyntheticLedgerError('CORRUPT_LEDGER')
    }
    const plan = parseSyntheticGuidedPlan(parsed)
    if (!plan) throw new SyntheticLedgerError('CORRUPT_LEDGER')
    return saveSyntheticDraft(state, plan, entry.actor, entry.at)
  }
  if (entry.planJson !== null) throw new SyntheticLedgerError('CORRUPT_LEDGER')
  if (entry.eventType === 'review_confirmed') {
    return confirmSyntheticReview(state, true, entry.actor, entry.at)
  }
  if (entry.eventType === 'review_cleared') {
    return confirmSyntheticReview(state, false, entry.actor, entry.at)
  }
  if (entry.eventType === 'version_published') {
    return publishSyntheticDraft(state, entry.actor, entry.at)
  }
  throw new SyntheticLedgerError('CORRUPT_LEDGER')
}

function consentFromEntry(entry: SyntheticLedgerEntry): InternalPilotConsent {
  if (!entry.planJson || entry.planVersion !== 1) throw new SyntheticLedgerError('CORRUPT_LEDGER')
  let value: unknown
  try {
    value = JSON.parse(entry.planJson)
  } catch {
    throw new SyntheticLedgerError('CORRUPT_LEDGER')
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SyntheticLedgerError('CORRUPT_LEDGER')
  }
  const consent = value as Partial<StoredInternalPilotConsent>
  if (
    consent.schema !== 'myaq-internal-personal-pilot-consent'
    || consent.accepted !== true
    || consent.noticeVersion !== INTERNAL_PILOT_CONSENT_NOTICE_VERSION
  ) throw new SyntheticLedgerError('CORRUPT_LEDGER')
  return { noticeVersion: consent.noticeVersion, grantedAt: entry.at }
}

export function parseInternalPilotConsent(value: unknown): InternalPilotConsent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const consent = value as Partial<InternalPilotConsent>
  if (
    consent.noticeVersion !== INTERNAL_PILOT_CONSENT_NOTICE_VERSION
    || typeof consent.grantedAt !== 'string'
    || Number.isNaN(Date.parse(consent.grantedAt))
  ) return null
  return { noticeVersion: consent.noticeVersion, grantedAt: consent.grantedAt }
}

export function replaySyntheticPublicationLedger(
  entries: readonly SyntheticLedgerEntry[],
  client: SyntheticWorkflowIdentity,
  expectedScope: { scopeKey: string; accountId: string },
) {
  const ordered = [...entries].toSorted((left, right) => left.revision - right.revision)
  let state = createSyntheticPublicationState(client)
  let consent: InternalPilotConsent | null = null

  for (let index = 0; index < ordered.length; index += 1) {
    const entry = ordered[index]
    const expectedRevision = index + 1
    if (
      entry.revision !== expectedRevision
      || entry.entryKey !== `${expectedScope.scopeKey}:${expectedRevision}`
      || entry.scopeKey !== expectedScope.scopeKey
      || entry.accountId !== expectedScope.accountId
      || entry.clientId !== client.id
      || entry.actor.id !== expectedScope.accountId
      || !isPositiveInteger(entry.planVersion)
      || Number.isNaN(Date.parse(entry.at))
    ) throw new SyntheticLedgerError('CORRUPT_LEDGER')

    if (entry.eventType === 'personal_data_consent_granted') {
      if (consent) throw new SyntheticLedgerError('CORRUPT_LEDGER')
      consent = consentFromEntry(entry)
      continue
    }

    const next = stateAfterEntry(state, entry)
    const audit = next.auditTrail.at(-1)
    if (
      next === state
      || !audit
      || audit.type !== entry.eventType
      || audit.version !== entry.planVersion
      || audit.actor.id !== entry.actor.id
      || audit.at !== entry.at
    ) throw new SyntheticLedgerError('CORRUPT_LEDGER')
    state = next
  }

  return { state, revision: ordered.length, consent }
}

export function createInternalPilotConsentLedgerEntry(input: {
  revision: number
  scopeKey: string
  accountId: string
  clientId: string
  actor: SyntheticWorkflowIdentity
  at: string
  currentConsent: InternalPilotConsent | null
  accepted: boolean
  noticeVersion: string
}): SyntheticLedgerEntry {
  if (
    input.currentConsent
    || input.accepted !== true
    || input.noticeVersion !== INTERNAL_PILOT_CONSENT_NOTICE_VERSION
  ) throw new SyntheticLedgerError('INVALID_TRANSITION')

  const nextRevision = input.revision + 1
  const stored: StoredInternalPilotConsent = {
    schema: 'myaq-internal-personal-pilot-consent',
    accepted: true,
    noticeVersion: INTERNAL_PILOT_CONSENT_NOTICE_VERSION,
  }
  return {
    entryKey: `${input.scopeKey}:${nextRevision}`,
    scopeKey: input.scopeKey,
    accountId: input.accountId,
    clientId: input.clientId,
    revision: nextRevision,
    eventType: 'personal_data_consent_granted',
    planVersion: 1,
    planJson: JSON.stringify(stored),
    actor: input.actor,
    at: input.at,
  }
}

export function createSyntheticLedgerEntry(input: {
  state: SyntheticPublicationState
  revision: number
  scopeKey: string
  accountId: string
  clientId: string
  actor: SyntheticWorkflowIdentity
  at: string
  action: SyntheticPublicationAction
}): { entry: SyntheticLedgerEntry; state: SyntheticPublicationState } {
  const { state, revision, scopeKey, accountId, clientId, actor, at, action } = input
  let next: SyntheticPublicationState
  let eventType: SyntheticLedgerEventType
  let planJson: string | null = null

  if (action.type === 'save_draft') {
    next = saveSyntheticDraft(state, action.plan, actor, at)
    eventType = 'draft_saved'
    planJson = JSON.stringify(action.plan)
  } else if (action.type === 'review') {
    next = confirmSyntheticReview(state, action.confirmed, actor, at)
    eventType = action.confirmed ? 'review_confirmed' : 'review_cleared'
  } else {
    next = publishSyntheticDraft(state, actor, at)
    eventType = 'version_published'
  }

  const audit = next.auditTrail.at(-1)
  if (next === state || !audit || audit.type !== eventType) {
    throw new SyntheticLedgerError('INVALID_TRANSITION')
  }
  const nextRevision = revision + 1
  return {
    state: next,
    entry: {
      entryKey: `${scopeKey}:${nextRevision}`,
      scopeKey,
      accountId,
      clientId,
      revision: nextRevision,
      eventType,
      planVersion: audit.version,
      planJson,
      actor,
      at,
    },
  }
}
