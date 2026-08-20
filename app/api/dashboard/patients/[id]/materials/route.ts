import { AuthorizationError, requireCapability } from '@/lib/auth'
import { getClienteById, uploadPlanMaterial } from '@/lib/airtable'

const MAX_MATERIAL_COUNT = 5
const MAX_TOTAL_BYTES = 10 * 1024 * 1024

function isPdfSignature(bytes: Buffer): boolean {
  return bytes.length >= 5 && bytes.subarray(0, 5).toString('ascii') === '%PDF-'
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireCapability('patients:write:any')
  } catch (error) {
    const status = error instanceof AuthorizationError && error.code === 'FORBIDDEN' ? 403 : 401
    return Response.json({ error: 'unauthorized' }, { status })
  }

  const { id: patientId } = await params
  if (!/^rec[A-Za-z0-9]{14}$/.test(patientId)) {
    return Response.json({ error: 'invalid_patient' }, { status: 400 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  const materials = formData
    .getAll('planMaterials')
    .filter((value): value is File => value instanceof File && value.size > 0)

  if (!materials.length) return Response.json({ error: 'invalid_material' }, { status: 400 })
  if (materials.length > MAX_MATERIAL_COUNT) {
    return Response.json({ error: 'too_many_materials' }, { status: 400 })
  }
  if (materials.reduce((total, material) => total + material.size, 0) > MAX_TOTAL_BYTES) {
    return Response.json({ error: 'materials_too_large' }, { status: 413 })
  }

  let patient
  try {
    patient = await getClienteById(patientId)
  } catch {
    return Response.json({ error: 'patient_unavailable' }, { status: 404 })
  }
  const planId = patient.fields['Plan AQSLIM']?.[0]
  if (!planId) return Response.json({ error: 'plan_required' }, { status: 409 })

  try {
    for (const material of materials) {
      if (
        material.type !== 'application/pdf'
        || !material.name.toLowerCase().endsWith('.pdf')
        || material.size > MAX_TOTAL_BYTES
      ) {
        return Response.json({ error: 'invalid_material' }, { status: 400 })
      }
      const bytes = Buffer.from(await material.arrayBuffer())
      if (!isPdfSignature(bytes)) {
        return Response.json({ error: 'invalid_material' }, { status: 400 })
      }
      const filename = material.name
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ._ -]/g, '-')
        .slice(0, 180)
      await uploadPlanMaterial({
        planId,
        base64: bytes.toString('base64'),
        filename,
        contentType: 'application/pdf',
      })
    }
  } catch (error) {
    const correlationId = crypto.randomUUID()
    console.error('[plan-materials] upload_route_failed', {
      correlationId,
      errorType: error instanceof Error ? error.name : 'unknown',
    })
    return Response.json({ error: 'upload_unavailable', correlationId }, { status: 503 })
  }

  return Response.json({ ok: true, uploaded: materials.length })
}
