import { getActor } from '@/lib/auth'
import { clinicRuntimeEnvironment, isClinicRuntimeFounderIdentity } from '@/lib/clinic-runtime-policy'
import { importPrivatePhasePdf, readBoundedGuideBody, readPrivatePhasePdf } from '@/lib/private-phase-guide-store'
import { getPrivatePhaseGuide, PRIVATE_PHASE_GUIDES } from '@/lib/private-phase-guide-policy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Authorization' }
async function founder() {
  const actor = await getActor()
  return actor && isClinicRuntimeFounderIdentity({ email: actor.email, environment: clinicRuntimeEnvironment() })
}
export async function GET() {
  if (!await founder()) return Response.json({ ok: false }, { status: 403, headers })
  const guides = await Promise.all(Object.values(PRIVATE_PHASE_GUIDES).map(async guide => {
    try { return { slug: guide.slug, ready: Boolean(await readPrivatePhasePdf(guide)), available: true } }
    catch { return { slug: guide.slug, ready: false, available: false } }
  }))
  return Response.json({ ok: true, connected: guides.some(guide => guide.available), ready: guides.find(guide => guide.slug === 'jing')?.ready === true, guides }, { headers })
}
// Imports only an exact catalog PDF; it cannot upload patient files,
// publish a clinical plan, broaden Drive sharing or change an access grant.
export async function POST(request: Request) {
  if (!await founder()) return Response.json({ ok: false }, { status: 403, headers })
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ ok: false }, { status: 403, headers })
  if (request.headers.get('content-type') !== 'application/pdf') return Response.json({ ok: false }, { status: 400, headers })
  const guide = getPrivatePhaseGuide(new URL(request.url).searchParams.get('phase') ?? 'jing')
  if (!guide) return Response.json({ ok: false }, { status: 400, headers })
  try {
    const bytes = await readBoundedGuideBody(request.body)
    await importPrivatePhasePdf(guide, bytes)
    return Response.json({ ok: true, verified: true }, { headers })
  } catch (error) {
    return Response.json({ ok: false }, { status: error instanceof Error && error.message === 'INVALID_GUIDE' ? 400 : 503, headers })
  }
}
