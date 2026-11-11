import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/auth'
import { isClinicRuntimeFounderIdentity, isClinicRuntimeEnvironment } from '@/lib/clinic-runtime-policy'

const privateHeaders = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Authorization' }
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: privateHeaders })
function clinicEnvironment() {
  return { VERCEL_ENV: process.env.VERCEL_ENV, MYAQ_CLINIC_ENABLED: process.env.MYAQ_CLINIC_ENABLED, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF }
}
async function authorize() {
  const environment = clinicEnvironment()
  if (!isClinicRuntimeEnvironment(environment)) return reply({ ok: false, error: 'unavailable' }, 404)
  const actor = await getActor()
  if (!actor) return reply({ ok: false, error: 'sign_in_required' }, 401)
  if (!isClinicRuntimeFounderIdentity({ email: actor.email, environment })) return reply({ ok: false, error: 'not_authorized' }, 403)
  return null
}
function extractText(data: any): string {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim()
  return (Array.isArray(data?.output) ? data.output : []).flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []).map((content: any) => typeof content?.text === 'string' ? content.text : '')).join('\n').trim()
}
export async function GET() {
  try {
    const denied = await authorize()
    if (denied) return denied
    return reply({ ok: true, configured: Boolean(process.env.OPENAI_API_KEY?.trim()) })
  } catch { return reply({ ok: false, error: 'unavailable' }, 503) }
}
export async function POST(request: NextRequest) {
  try {
    const denied = await authorize()
    if (denied) return denied
    if (request.headers.get('origin') !== request.nextUrl.origin) return reply({ ok: false, error: 'not_authorized' }, 403)
    const body = await request.json().catch(() => ({}))
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 6000) : ''
    if (!message) return reply({ ok: false, error: 'message_required' }, 400)
    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (!apiKey) return reply({ ok: false, error: 'provider_unavailable' }, 503)
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_AQ_BUDDY_MODEL?.trim() || 'gpt-5.6-luna',
        instructions: [
          'You are ARIOS, the founder-only operational assistant in AQSLIM.',
          'Respond in the language used by Rom, concisely and concretely.',
          'The daily program is /dashboard. Its sections are Resumen, Citas, Finanzas, Clientes, Planes y guías, and Reportes.',
          'A plan is managed in Planes y guías or the Plan y guía section inside a consultation. Save draft first; Revisar y publicar opens a summary, then an explicit confirmation publishes to My AQSLIM.',
          'A linked client with current access sees the published plan and its phase guide in My AQSLIM. A draft is not visible. Old plans and files remain in the clinical history.',
          'You do not automatically read the selected patient, personal medical records, or consultation data. Do not claim you can see them or that you performed a write.',
          'Help with application workflow, follow-up organization, and drafts. Never diagnose or prescribe. Do not invent clinical facts or make treatment choices.',
        ].join(' '),
        input: message, max_output_tokens: 800,
      }), cache: 'no-store', signal: AbortSignal.timeout(25000),
    })
    if (!response.ok) {
      console.error('[clinic-arios] provider_failed', { status: response.status })
      return reply({ ok: false, error: response.status === 429 ? 'provider_busy' : 'provider_failed' }, 502)
    }
    const text = extractText(await response.json())
    if (!text) return reply({ ok: false, error: 'empty_response' }, 502)
    return reply({ ok: true, text })
  } catch {
    console.error('[clinic-arios] request_failed')
    return reply({ ok: false, error: 'request_failed' }, 503)
  }
}
