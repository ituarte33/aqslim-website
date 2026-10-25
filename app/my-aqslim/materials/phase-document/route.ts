import { getActor, requireOwnPatient, AuthorizationError } from '@/lib/auth'
import { getPlanById } from '@/lib/airtable'
import { getPortalAccessRecordByPatientRecordId } from '@/lib/preview-entitlement-store'
import { clinicRuntimeEnvironment, isClinicRuntimeEnvironment } from '@/lib/clinic-runtime-policy'
import { getPhaseGuide } from '@/lib/phase-materials'
import { PRIVATE_JING_GUIDE, privateGuideAccessAllowed } from '@/lib/private-phase-guide-policy'
import { readPrivateJingPdf } from '@/lib/private-phase-guide-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = {
  'Cache-Control': 'private, no-store, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Vary': 'Cookie, Authorization',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'no-referrer',
}
function denied(status: number) { return new Response('Material no disponible.', { status, headers }) }

export async function GET(request: Request) {
  try {
    if (!isClinicRuntimeEnvironment(clinicRuntimeEnvironment())) return denied(404)
    if (new URL(request.url).searchParams.get('phase') !== PRIVATE_JING_GUIDE.slug) return denied(404)
    const actor = await getActor()
    if (!actor) return denied(401)
    const patient = await requireOwnPatient('portal:read:self')
    if (actor.boundPatientId !== patient.id) return denied(403)
    const planId = patient.fields['Plan AQSLIM']?.[0]
    if (!planId) return denied(404)
    const [plan, entitlement] = await Promise.all([
      getPlanById(planId),
      getPortalAccessRecordByPatientRecordId({ patientRecordId: patient.id, canonicalSubjectId: actor.clerkUserId }),
    ])
    if (!privateGuideAccessAllowed(entitlement?.record)) return denied(403)
    if (plan.id !== planId || !plan.fields['ID Cliente']?.includes(patient.id)
      || getPhaseGuide(plan.fields['Fase Actual'])?.phase !== PRIVATE_JING_GUIDE.phase) return denied(404)
    const pdf = await readPrivateJingPdf()
    if (!pdf) return denied(503)
    return new Response(new Uint8Array(pdf), { headers: {
      ...headers, 'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="Guia_Jing.pdf"',
      'Content-Length': String(pdf.byteLength),
    } })
  } catch (error) {
    return denied(error instanceof AuthorizationError ? error.code === 'UNAUTHENTICATED' ? 401 : 403 : 503)
  }
}
