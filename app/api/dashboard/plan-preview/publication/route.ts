import { AuthorizationError, requireActor, type AuthenticatedActor } from '@/lib/auth'
import {
  appendSyntheticPublicationLedgerEntry,
  getSyntheticPublicationLedgerEntries,
} from '@/lib/airtable'
import { buildGuidedPlan } from '@/lib/nutrition/assembler'
import { JING_COMPLETION_COMPONENTS, JING_RECIPE_VARIANTS } from '@/lib/nutrition/fixtures'
import {
  createSyntheticLedgerEntry,
  replaySyntheticPublicationLedger,
  SyntheticLedgerError,
  type SyntheticPublicationAction,
} from '@/lib/nutrition/synthetic-publication-ledger'
import { hasSameSyntheticPlan, SYNTHETIC_CLIENT } from '@/lib/nutrition/synthetic-publication'
import { parseSyntheticGuidedPlan } from '@/lib/nutrition/synthetic-publication-storage'
import {
  hasSyntheticPreviewStorageConfiguration,
  isAllowedSyntheticPreviewClient,
  isSyntheticPreviewEnvironment,
  syntheticPreviewScopeKey,
} from '@/lib/nutrition/synthetic-preview-policy'

const MAX_REQUEST_BYTES = 250_000
const SYNTHETIC_QUESTIONNAIRE_PROFILE_ID = 'SYN-JING-QUESTIONNAIRE-DRAFT'
const PREFERRED_FOODS = new Set(['chicken', 'sirloin', 'ground beef', 'tilapia', 'egg', 'nopales', 'spinach'])
const DISLIKED_FOODS = new Set(['pork', 'fish', 'egg', 'chicken', 'sirloin', 'ground beef'])
const EXCLUDED_FOODS = new Set(['dairy', 'egg', 'fish', 'pork'])

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}

async function previewActor(): Promise<AuthenticatedActor | Response> {
  if (!isSyntheticPreviewEnvironment({
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
  })) return json({ error: 'not_found' }, 404)
  if (!hasSyntheticPreviewStorageConfiguration({
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
    AIRTABLE_PAT: process.env.AIRTABLE_PAT,
  })) {
    return json({ error: 'preview_storage_unavailable' }, 503)
  }
  try {
    const actor = await requireActor()
    if (actor.role !== 'admin') return json({ error: 'forbidden' }, 403)
    return actor
  } catch (error) {
    const status = error instanceof AuthorizationError && error.code === 'FORBIDDEN' ? 403 : 401
    return json({ error: 'unauthorized' }, status)
  }
}

function actorIdentity(actor: AuthenticatedActor) {
  return { id: actor.clerkUserId, displayName: 'Revisor de Preview' }
}

function requestedClientId(request: Request) {
  return new URL(request.url).searchParams.get('clientId')
}

async function currentPublication(actor: AuthenticatedActor, clientId: string) {
  const scopeKey = syntheticPreviewScopeKey(actor.clerkUserId, clientId)
  const entries = await getSyntheticPublicationLedgerEntries(scopeKey)
  const current = replaySyntheticPublicationLedger(entries, SYNTHETIC_CLIENT, {
    scopeKey,
    accountId: actor.clerkUserId,
  })
  return { ...current, scopeKey }
}

export async function GET(request: Request) {
  const actor = await previewActor()
  if (actor instanceof Response) return actor
  const clientId = requestedClientId(request)
  if (!isAllowedSyntheticPreviewClient(clientId)) return json({ error: 'invalid_synthetic_client' }, 400)

  try {
    const current = await currentPublication(actor, clientId)
    return json({ state: current.state, revision: current.revision })
  } catch (error) {
    const correlationId = crypto.randomUUID()
    console.error('[synthetic-publication] read_failed', {
      correlationId,
      errorType: error instanceof Error ? error.name : 'unknown',
    })
    return json({ error: 'preview_storage_unavailable', correlationId }, 503)
  }
}

function parseAction(body: unknown): SyntheticPublicationAction | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const value = body as Record<string, unknown>
  if (value.action === 'save_draft') {
    const submittedPlan = parseSyntheticGuidedPlan(value.plan)
    if (!submittedPlan || !isApprovedSyntheticQuestionnaireProfile(submittedPlan)) return null
    const canonicalPlan = buildGuidedPlan({
      profile: submittedPlan.profile,
      recipes: JING_RECIPE_VARIANTS,
      components: JING_COMPLETION_COMPONENTS,
    })
    if (!hasSameSyntheticPlan(submittedPlan, canonicalPlan)) return null
    return { type: 'save_draft', plan: canonicalPlan }
  }
  if (value.action === 'review' && typeof value.confirmed === 'boolean') {
    return { type: 'review', confirmed: value.confirmed }
  }
  if (value.action === 'publish') return { type: 'publish' }
  return null
}

function isApprovedSyntheticQuestionnaireProfile(plan: NonNullable<ReturnType<typeof parseSyntheticGuidedPlan>>) {
  const profile = plan.profile
  const inputs = profile.energyInputs
  const twoMeals = profile.mealSlots.length === 2
    && profile.mealSlots[0] === 'lunch'
    && profile.mealSlots[1] === 'dinner'
  const threeMeals = profile.mealSlots.length === 3
    && profile.mealSlots[0] === 'first_meal'
    && profile.mealSlots[1] === 'lunch'
    && profile.mealSlots[2] === 'dinner'
  const allAllowed = (values: readonly string[], allowed: ReadonlySet<string>) => (
    values.every(value => allowed.has(value)) && new Set(values).size === values.length
  )
  const foodGroups = [profile.preferredFoods, profile.dislikedFoods, profile.excludedFoods]
  const noOverlap = new Set(foodGroups.flat()).size === foodGroups.reduce((count, foods) => count + foods.length, 0)

  return profile.id === SYNTHETIC_QUESTIONNAIRE_PROFILE_ID
    && profile.firstName === 'Perfil generado'
    && profile.language === 'es'
    && profile.phase === 'Jing'
    && inputs.ageYears >= 18
    && inputs.ageYears <= 85
    && inputs.heightCm >= 122
    && inputs.heightCm <= 229
    && inputs.currentWeightKg >= 45.3
    && inputs.currentWeightKg <= 349.3
    && inputs.goalWeightKg >= 45.3
    && inputs.goalWeightKg < inputs.currentWeightKg
    && inputs.requestedDeficitCalories === 500
    && (twoMeals || threeMeals)
    && allAllowed(profile.preferredFoods, PREFERRED_FOODS)
    && allAllowed(profile.dislikedFoods, DISLIKED_FOODS)
    && allAllowed(profile.excludedFoods, EXCLUDED_FOODS)
    && noOverlap
}

export async function POST(request: Request) {
  const actor = await previewActor()
  if (actor instanceof Response) return actor
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (!Number.isFinite(contentLength) || contentLength > MAX_REQUEST_BYTES) {
    return json({ error: 'request_too_large' }, 413)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid_request' }, 400)
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'invalid_request' }, 400)
  const value = body as Record<string, unknown>
  if (!isAllowedSyntheticPreviewClient(value.clientId)) return json({ error: 'invalid_synthetic_client' }, 400)
  if (typeof value.expectedRevision !== 'number' || !Number.isInteger(value.expectedRevision) || value.expectedRevision < 0) {
    return json({ error: 'invalid_revision' }, 400)
  }
  const action = parseAction(body)
  if (!action) return json({ error: 'invalid_action' }, 400)

  try {
    const current = await currentPublication(actor, value.clientId)
    if (current.revision !== value.expectedRevision) {
      return json({
        error: 'revision_conflict',
        state: current.state,
        revision: current.revision,
      }, 409)
    }
    const at = new Date().toISOString()
    const next = createSyntheticLedgerEntry({
      state: current.state,
      revision: current.revision,
      scopeKey: current.scopeKey,
      accountId: actor.clerkUserId,
      clientId: value.clientId,
      actor: actorIdentity(actor),
      at,
      action,
    })
    await appendSyntheticPublicationLedgerEntry(next.entry)
    return json({ state: next.state, revision: next.entry.revision })
  } catch (error) {
    if (error instanceof SyntheticLedgerError && error.code === 'INVALID_TRANSITION') {
      return json({ error: 'invalid_transition' }, 409)
    }
    if (error instanceof Error && error.message === 'SYNTHETIC_LEDGER_CONFLICT') {
      return json({ error: 'revision_conflict' }, 409)
    }
    const correlationId = crypto.randomUUID()
    console.error('[synthetic-publication] write_failed', {
      correlationId,
      errorType: error instanceof Error ? error.name : 'unknown',
    })
    return json({ error: 'preview_storage_unavailable', correlationId }, 503)
  }
}
