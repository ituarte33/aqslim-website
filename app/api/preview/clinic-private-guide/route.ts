import { getActor } from '@/lib/auth'
import { clinicRuntimeEnvironment, isClinicRuntimeFounderIdentity } from '@/lib/clinic-runtime-policy'
import { importPrivateJingPdf, readBoundedGuideBody, readPrivateJingPdf } from '@/lib/private-phase-guide-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Authorization' }
async function founder() {
  const actor = await getActor()
  return actor && isClinicRuntimeFounderIdentity({ email: actor.email, environment: clinicRuntimeEnvironment() })
}
export async function GET() {
  if (!await founder()) return Response.json({ ok: false }, { status: 403, headers })
  try { return Response.json({ ok: true, connected: true, ready: Boolean(await readPrivateJingPdf()) }, { headers }) }
  catch { return Response.json({ ok: true, connected: false, ready: false }, { headers }) }
}
// Imports only the exact previously approved PDF; it cannot upload patient files,
// publish a clinical plan, broaden Drive sharing or change an access grant.
export async function POST(request: Request) {
  if (!await founder()) return Response.json({ ok: false }, { status: 403, headers })
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ ok: false }, { status: 403, headers })
  if (request.headers.get('content-type') !== 'application/pdf') return Response.json({ ok: false }, { status: 400, headers })
  try {
    const bytes = await readBoundedGuideBody(request.body)
    await importPrivateJingPdf(bytes)
    return Response.json({ ok: true, verified: true }, { headers })
  } catch (error) {
    return Response.json({ ok: false }, { status: error instanceof Error && error.message === 'INVALID_GUIDE' ? 400 : 503, headers })
  }
}
