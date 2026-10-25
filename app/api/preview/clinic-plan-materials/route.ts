import { assertClinicSourceWriteAllowed } from '@/lib/clinic-runtime-policy'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getActor } from '@/lib/auth'
import { getClienteById, getPlanById } from '@/lib/airtable'
import { isClinicRuntimeFounderIdentity } from '@/lib/clinic-runtime-policy'
import { clinicMaterialStoreEnabled, getClinicMaterialEvents, saveClinicMaterialEvent } from '@/lib/clinic-plan-materials-store'
import { currentPlanAttachments, materialPlanRevision, planAttachments } from '@/lib/clinic-plan-materials'

async function context(request: NextRequest, body?: Record<string, unknown>) {
  if (!clinicMaterialStoreEnabled()) throw new Error('NOT_FOUND')
  const actor = await getActor()
  if (!actor) throw new Error('UNAUTHENTICATED')
  if (!isClinicRuntimeFounderIdentity({ email: actor.email, environment: { VERCEL_ENV: process.env.VERCEL_ENV, MYAQ_CLINIC_ENABLED: process.env.MYAQ_CLINIC_ENABLED, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF } })) throw new Error('FORBIDDEN')
  const patientId = String(body?.patientId ?? request.nextUrl.searchParams.get('patientId') ?? '')
  if (!/^rec[A-Za-z0-9]{14}$/.test(patientId)) throw new Error('NOT_FOUND')
  const patient = await getClienteById(patientId)
  const id = patient.fields['Plan AQSLIM']?.[0]
  if (!id) throw new Error('NOT_FOUND')
  const [plan, events] = await Promise.all([getPlanById(id), getClinicMaterialEvents(patientId)])
  return { actor, patientId, plan, events }
}
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  return NextResponse.json({ ok: false }, { status: message === 'CLINIC_CANDIDATE_READ_ONLY' ? 409 : message === 'NOT_FOUND' ? 404 : message === 'UNAUTHENTICATED' ? 401 : message === 'FORBIDDEN' ? 403 : 503 })
}
export async function GET(request: NextRequest) {
  try {
    const { plan, events } = await context(request)
    return NextResponse.json({ ok: true, revision: materialPlanRevision(plan),
      attachments: planAttachments(plan), currentIds: currentPlanAttachments(plan, events).map(item => item.id),
      history: events.filter(event => event.action === 'archive'),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return failure(error) }
}
export async function POST(request: NextRequest) {
  try {
    assertClinicSourceWriteAllowed()
    const body = await request.json()
    const { actor, patientId, plan, events } = await context(request, body)
    if (body.confirmation !== 'ASIGNAR MATERIALES PLAN ACTUAL' || body.revision !== materialPlanRevision(plan)) return NextResponse.json({ ok: false }, { status: 409 })
    if (!Array.isArray(body.attachmentIds) || body.attachmentIds.some((id: unknown) => typeof id !== 'string'
      || !planAttachments(plan).some(item => item.id === id))) return NextResponse.json({ ok: false }, { status: 400 })
    const event = { kind: 'clinic-plan-materials-v1' as const, action: 'release' as const,
      planId: plan.id, revision: materialPlanRevision(plan), at: new Date().toISOString(),
      label: String(plan.fields['Notas del Plan'] ?? plan.fields['Dieta en Nutrimind'] ?? 'Plan'),
      attachments: planAttachments(plan).filter(item => body.attachmentIds.includes(item.id)),
    }
    // Store the previous selection before replacing it; no files are removed.
    if (events.some(item => item.action === 'release')) await saveClinicMaterialEvent(patientId, {
      ...event, action: 'archive', at: new Date(Date.parse(event.at) - 1).toISOString(), attachments: currentPlanAttachments(plan, events), planFields: plan.fields,
    }, actor.email)
    await saveClinicMaterialEvent(patientId, event, actor.email)
    const fresh = await getClinicMaterialEvents(patientId)
    const ids = currentPlanAttachments(plan, fresh).map(item => item.id).sort()
    if (JSON.stringify(ids) !== JSON.stringify(event.attachments.map(item => item.id).sort())) throw new Error('VERIFY_FAILED')
    revalidatePath('/my-aqslim/materials')
    return NextResponse.json({ ok: true })
  } catch (error) { return failure(error) }
}
