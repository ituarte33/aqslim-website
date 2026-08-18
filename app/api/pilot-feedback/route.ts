import { AuthorizationError, requireOwnPatient } from '@/lib/auth'
import { createPilotFeedback, uploadPilotFeedbackScreenshot } from '@/lib/airtable'
import { feedbackReportName, parsePilotFeedbackInput } from '@/lib/pilot-feedback'

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024
const ALLOWED_SCREENSHOT_TYPES = new Set(['image/jpeg', 'image/png'])

export async function POST(request: Request) {
  let patient
  try {
    patient = await requireOwnPatient('portal:read:self')
  } catch (error) {
    if (error instanceof AuthorizationError && error.code === 'UNAUTHENTICATED') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return Response.json({ error: 'patient_required' }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  const parsed = parsePilotFeedbackInput({
    tool: formData.get('tool'),
    rating: formData.get('rating'),
    category: formData.get('category'),
    comment: formData.get('comment'),
    context: formData.get('context'),
    responseId: formData.get('responseId'),
    language: formData.get('language'),
  })
  if (!parsed) return Response.json({ error: 'invalid_feedback' }, { status: 400 })

  const screenshot = formData.get('screenshot')
  if (
    screenshot instanceof File
    && (
      screenshot.size === 0
      || screenshot.size > MAX_SCREENSHOT_BYTES
      || !ALLOWED_SCREENSHOT_TYPES.has(screenshot.type)
    )
  ) {
    return Response.json({ error: 'invalid_screenshot' }, { status: 400 })
  }

  let record: { id: string }
  try {
    record = await createPilotFeedback({
      patientId: patient.id,
      reportName: feedbackReportName(parsed),
      input: parsed,
    })
  } catch (error) {
    const correlationId = crypto.randomUUID()
    console.error('[pilot-feedback] record_create_failed', {
      correlationId,
      errorType: error instanceof Error ? error.name : 'unknown',
    })
    return Response.json({ error: 'feedback_unavailable', correlationId }, { status: 503 })
  }

  let screenshotAttached = false
  if (screenshot instanceof File && screenshot.size > 0) {
    try {
      const bytes = Buffer.from(await screenshot.arrayBuffer())
      await uploadPilotFeedbackScreenshot({
        recordId: record.id,
        base64: bytes.toString('base64'),
        filename: `reporte-${parsed.responseId}.${screenshot.type === 'image/png' ? 'png' : 'jpg'}`,
        contentType: screenshot.type as 'image/jpeg' | 'image/png',
      })
      screenshotAttached = true
    } catch {
      // The structured report remains useful even if Airtable rejects the optional attachment.
    }
  }

  return Response.json({
    ok: true,
    reportId: record.id,
    screenshotAttached,
  })
}
