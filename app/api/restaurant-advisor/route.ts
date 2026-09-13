import { auth } from '@clerk/nextjs/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildAQSLIMPhaseFoodPolicyContext } from '@/lib/aqslim-phase-food-policy'
import { evaluateAiEntitlementAccess } from '@/lib/ai-entitlement-access'
import { getActor } from '@/lib/auth'
import { getPilotAccess } from '@/lib/pilot-access'
import { pilotHasFeature } from '@/lib/pilot-policy'
import { getPatientPortalData } from '@/lib/patient-portal'
import {
  isRestaurantAdvisorResult,
  parseRestaurantAdvisorJson,
  type RestaurantAdvisorResult,
} from '@/lib/restaurant-advisor'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = process.env.ANTHROPIC_RESTAURANT_MODEL ?? process.env.ANTHROPIC_FOOD_SCAN_MODEL ?? 'claude-haiku-4-5-20251001'
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BASE64_LENGTH = 14_000_000

type AnalysisFailure = 'provider_unavailable' | 'invalid_response'

async function requestRestaurantAnalysis(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
  prompt: string,
): Promise<{ value: RestaurantAdvisorResult | null; failure: AnalysisFailure | null }> {
  let successfulCalls = 0

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const retryInstruction = attempt === 1
        ? '\n\nRetry requirement: return one complete valid JSON object only. Every item field must be the exact name of one individually named menu item visible in the image. Do not use section names, generic categories, "or similar", or invented dish names. Respect every Jing-specific ranking rule and do not call breaded/fried/cream-sauce dishes simple protein. Do not use markdown, code fences, commentary, or trailing text.'
        : ''
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
            { type: 'text', text: `${prompt}${retryInstruction}` },
          ],
        }],
      })
      successfulCalls += 1
      const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
      const parsed = parseRestaurantAdvisorJson(raw)
      if (isRestaurantAdvisorResult(parsed)) return { value: parsed, failure: null }
    } catch (error) {
      console.error('[restaurant-advisor] provider_attempt_failed', {
        attempt: attempt + 1,
        errorType: error instanceof Error ? error.name : 'unknown',
      })
    }
  }

  return {
    value: null,
    failure: successfulCalls === 0 ? 'provider_unavailable' : 'invalid_response',
  }
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const [pilot, actor] = await Promise.all([
    getPilotAccess(),
    getActor(),
  ])
  const currentAccessAllowed = Boolean(pilot && pilotHasFeature(pilot, 'restaurant_advisor'))
  const access = await evaluateAiEntitlementAccess({
    clerkUserId: userId,
    capability: 'restaurant_menu:analyze',
    currentAccessAllowed,
    rawPlan: actor?.rawPlan,
    hasPilotAccess: pilot !== null,
    pilotFeatures: pilot?.enabledFeatures,
    authenticatedPatientRecordId: actor?.boundPatientId ?? null,
  })
  if (!access.allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const patient = await getPatientPortalData()
  if (!patient?.phase) return Response.json({ error: 'phase_required' }, { status: 409 })

  let body: { imageBase64?: string; mimeType?: string; restaurant?: string; language?: 'es' | 'en' }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  if (!body.imageBase64 || !body.mimeType || !ALLOWED_TYPES.has(body.mimeType) || body.imageBase64.length > MAX_BASE64_LENGTH) {
    return Response.json({ error: 'invalid_image' }, { status: 400 })
  }

  const language = body.language === 'en' ? 'English' : 'Spanish'
  const restaurant = body.restaurant?.trim().slice(0, 100) || 'not provided'
  const phasePolicy = buildAQSLIMPhaseFoodPolicyContext({
    phase: patient.phase,
    weekInPhase: patient.weekInPhase,
  })
  const mimeType = body.mimeType as 'image/jpeg' | 'image/png' | 'image/webp'

  const prompt = `You are AQ Buddy's restaurant-menu analysis component. Restaurant name: "${restaurant}".

The authenticated patient's governed AQSLIM food policy is:
${phasePolicy}

Read only what is reasonably visible in the menu image. The governed AQSLIM phase policy overrides generic keto or low-carb advice. Give practical phase-compatible educational guidance; do not diagnose, prescribe, change the patient's phase, or invent an allowance or prohibition that is not supported by the policy or visible menu text. Prefer simple preparation, identify sauces/sides that may change suitability, and explicitly acknowledge uncertainty.

GROUNDING RULES — REQUIRED:
- Each item field must be copied from one individually named menu item that is reasonably visible in the image.
- Never substitute a section heading, category, generic dish type, or phrase such as "or similar" for an exact menu item name.
- Do not invent a dish merely because it would fit the phase.
- Use three distinct visible menu items when three are legible.
- If fewer than three distinct named items are legible, use "Menú parcialmente ilegible" (Spanish) or "Menu partially unreadable" (English) for the unavailable slot instead of inventing a dish.
- Preserve proper menu-item names as printed, even when they are in English. All reasons, modifications, and confidenceNote must be written in ${language}.
- Base ranking on the visible dish description, not just the protein word in the dish name. If the visible description mentions breading, frying, pasta, cream sauce, sweet sauce, or a high-carbohydrate side, do NOT call that dish a simple protein and do NOT rank it as the best option unless the visible menu itself offers a clearly simpler preparation.
- For Jing, do not describe cheese as inherently appropriate or compatible. Treat cheese as a portion-control concern unless the patient's recorded plan explicitly authorizes it.
- Do not assume a restaurant can transform a composed dish into a completely different preparation. Suggested modifications must be plausible, limited changes such as sauce on the side, omit a side, remove croutons, or ask about an available substitution.

If only part of the menu is readable, analyze the readable items rather than failing the whole request. If the menu is truly unreadable, return a valid JSON object that says the image is unreadable in each item field and in confidenceNote; never invent dishes.

Return ONLY valid JSON:
{
  "best": { "item": "exact visible menu item name or unreadable notice", "reason": "short reason", "modification": "specific way to order it or request a clearer image" },
  "adjusted": { "item": "exact visible menu item name or unreadable notice", "reason": "short reason", "modification": "specific adjustment or request a clearer image" },
  "avoid": { "item": "exact visible menu item name or unreadable notice", "reason": "short reason", "modification": "safer alternative, what to ask, or request a clearer image" },
  "confidenceNote": "brief statement about image readability, hidden ingredients, portions, and approximate guidance"
}`

  const analysis = await requestRestaurantAnalysis(body.imageBase64, mimeType, prompt)
  if (analysis.value) return Response.json(analysis.value)

  const correlationId = crypto.randomUUID()
  console.error('[restaurant-advisor] analysis_failed', {
    correlationId,
    failure: analysis.failure,
  })
  return Response.json({
    error: analysis.failure === 'provider_unavailable' ? 'provider_unavailable' : 'analysis_incomplete',
    correlationId,
  }, { status: 502 })
}
