import { auth } from '@clerk/nextjs/server'
import Anthropic from '@anthropic-ai/sdk'
import { getPilotAccess } from '@/lib/pilot-access'
import { pilotHasFeature } from '@/lib/pilot-policy'
import { getPatientPortalData } from '@/lib/patient-portal'
import { isRestaurantAdvisorResult } from '@/lib/restaurant-advisor'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = process.env.ANTHROPIC_RESTAURANT_MODEL ?? process.env.ANTHROPIC_FOOD_SCAN_MODEL ?? 'claude-haiku-4-5-20251001'
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BASE64_LENGTH = 14_000_000

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const pilot = await getPilotAccess()
  if (!pilot || !pilotHasFeature(pilot, 'restaurant_advisor')) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const patient = await getPatientPortalData()
  if (!patient?.phase) return Response.json({ error: 'phase_required' }, { status: 409 })

  const body = await request.json() as { imageBase64?: string; mimeType?: string; restaurant?: string; language?: 'es' | 'en' }
  if (!body.imageBase64 || !body.mimeType || !ALLOWED_TYPES.has(body.mimeType) || body.imageBase64.length > MAX_BASE64_LENGTH) {
    return Response.json({ error: 'invalid_image' }, { status: 400 })
  }

  const language = body.language === 'en' ? 'English' : 'Spanish'
  const restaurant = body.restaurant?.trim().slice(0, 100) || 'not provided'
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 900,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: body.mimeType as 'image/jpeg' | 'image/png' | 'image/webp', data: body.imageBase64 } },
        { type: 'text', text: `You are AQ Buddy's restaurant-menu analysis component. The authenticated patient's canonical AQSLIM phase is "${patient.phase}". Restaurant name: "${restaurant}".

Read only what is visible in the menu image. Give practical, phase-compatible educational guidance; do not diagnose, prescribe, change the patient's phase, or claim certainty about hidden ingredients or portions. Prefer simple preparation, identify sauces/sides that may change suitability, and explicitly acknowledge uncertainty. Respond in ${language}.

Return ONLY valid JSON:
{
  "best": { "item": "visible menu item", "reason": "short reason", "modification": "specific way to order it" },
  "adjusted": { "item": "visible menu item", "reason": "short reason", "modification": "specific adjustment" },
  "avoid": { "item": "visible menu item", "reason": "short reason", "modification": "safer alternative or what to ask" },
  "confidenceNote": "brief statement about image readability, hidden ingredients, portions, and approximate guidance"
}
Each item must be grounded in text visible in the supplied image. If the menu is unreadable, say so in all item fields rather than inventing dishes.` },
      ],
    }],
  })

  const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
  try {
    const parsed = JSON.parse(raw)
    if (!isRestaurantAdvisorResult(parsed)) throw new Error('invalid')
    return Response.json(parsed)
  } catch {
    return Response.json({ error: 'invalid_analysis' }, { status: 502 })
  }
}
