import { clinicRecordFilter, clinicRecordKey, clinicRecordInScope, clinicUsesPreviewRecords } from '@/lib/clinic-runtime-policy'
import { assertClinicSourceWriteAllowed } from '@/lib/clinic-runtime-policy'
import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/auth'
import {
  CLIENTES_FIELDS,
  createConsulta,
  getClienteById,
  getConsultaById,
  getConsultasByPatientId,
  updateCliente,
} from '@/lib/airtable'
import {
  buildClinicLiveConsultationFields,
  clinicConsultationPublicationIsConfirmed,
  clinicConsultationPublicationMarker,
  clinicConsultationWeightKg,
  clinicPublishedConsultationId,
  clinicPublishedPreviewKey,
  isLiveClinicConsultationType,
} from '@/lib/clinic-consultation-publication'
import { normalizeClinicIsoDate } from '@/lib/clinic-date'
import { isClinicRuntimeFounderIdentity, isClinicRuntimeEnvironment } from '@/lib/clinic-runtime-policy'
import { CLINIC_WEIGHT_UPDATE_TYPE, normalizeClinicWeightEntry } from '@/lib/clinic-weight-entry'
import { updateAccessAfterCompletedConsultation } from '@/lib/clinic-access-after-consultation'
import { patientIsUnavailable } from '@/lib/clinic-patient-administration-policy'

const TABLE_ID = 'tbl0cTWsYqv4R5n3u'

const F = {
  KEY: 'fldn6SMSHrgaU3hho',
  PATIENT: 'fld8yPs9SOAw3Osbv',
  PATIENT_ID: 'fld0XkzcSxuahpefr',
  PATIENT_NAME: 'fldHTblKr2H4k2BQF',
  CONSULTATION_AT: 'fldZR2iJwQaN7SXzi',
  CONSULTATION_DATE: 'fldrvTUQukYeqYtsi',
  TYPE: 'fldrKPVZUHzJVX2IM',
  WEIGHT: 'fldWZT9PKGJACROwu',
  WEIGHT_UNIT: 'fldocfmCBmCS0Unis',
  BODY_FAT: 'fldSE9C6O773Npu98',
  WAIST: 'fldqoeDjaM6I9JjCq',
  HIPS: 'fldi9WdzHLBsgzUdT',
  ARMS: 'fldmtDQi2ixPZXnY5',
  THIGHS: 'fldnYwAn8vDMx2UAE',
  CHEST: 'flduUfZw9N8k9nF3B',
  PHASE: 'fldpuF1T4RN49uUTD',
  PHASE_WEEK: 'fldfE4WKhno0iYKCr',
  RECOMMENDATIONS: 'fldQahL9JJ3eE20LR',
  NEXT_APPOINTMENT: 'fldp0wOjGdl3zSuT2',
  CONSULTATION_FEE: 'fldrKPC7ynldWZR6R',
  AMOUNT_COLLECTED: 'fldv5QvpqHOxpO5xH',
  PAYMENT_METHOD: 'flde0a6NiApw1ptXT',
  AUTHOR_EMAIL: 'fldXlIbOsf3hLVNLW',
  AUTHOR_LABEL: 'fld48XaY8Cikuh0Tf',
  PREVIEW_ONLY: 'fldPfnVmXSJYFFWc4',
} as const

function clinicEnvironment() {
  return {
    VERCEL_ENV: process.env.VERCEL_ENV,
    MYAQ_CLINIC_ENABLED: process.env.MYAQ_CLINIC_ENABLED, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
  }
}

function baseUrl() {
  return `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${TABLE_ID}`
}

function headers() {
  return { Authorization: `Bearer ${process.env.AIRTABLE_PAT}`, 'Content-Type': 'application/json' }
}

async function requireFounder() {
  const environment = clinicEnvironment()
  if (!isClinicRuntimeEnvironment(environment)) throw new Error('NOT_FOUND')
  const actor = await getActor()
  if (!actor) throw new Error('UNAUTHENTICATED')
  if (!isClinicRuntimeFounderIdentity({ email: actor.email, environment })) throw new Error('FORBIDDEN')
  return actor
}

function safeText(value: unknown, max = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function safeNumber(value: unknown) {
  if (value === '' || value == null) return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function optionalNonNegativeNumber(value: unknown) {
  if (value === '' || value == null) return { valid: true, value: null }
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) && number >= 0
    ? { valid: true, value: number }
    : { valid: false, value: null }
}

function selectName(value: unknown) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'name' in value && typeof value.name === 'string') return value.name
  return ''
}

function escapeFormula(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

async function getPreviewConsultation(recordId: string) {
  const response = await fetch(`${baseUrl()}/${recordId}?returnFieldsByFieldId=true`, {
    headers: headers(), cache: 'no-store',
  })
  if (!response.ok) return null
  return response.json()
}

async function markPreviewConsultationPublished(recordId: string, currentKey: unknown, liveConsultationId: string) {
  const key = clinicPublishedPreviewKey(currentKey, liveConsultationId)
  const response = await fetch(`${baseUrl()}/${recordId}?returnFieldsByFieldId=true`, {
    method: 'PATCH',
    headers: headers(),
    cache: 'no-store',
    body: JSON.stringify({ fields: { [F.KEY]: key } }),
  })
  if (!response.ok) return false
  const readback = await getPreviewConsultation(recordId)
  return clinicPublishedConsultationId(readback?.fields?.[F.KEY]) === liveConsultationId
}

function liveConsultationMatches(input: {
  record: Awaited<ReturnType<typeof getConsultaById>>
  patientId: string
  consultationDate: string
  consultationType: string
  weightKg: number | null
  marker: string
}) {
  const fields = input.record.fields ?? {}
  const linkedPatients = Array.isArray(fields['ID Cliente']) ? fields['ID Cliente'] : []
  const storedWeight = fields['Peso (kg)']
  const weightMatches = input.weightKg === null
    ? storedWeight == null
    : typeof storedWeight === 'number' && Math.abs(storedWeight - input.weightKg) < 0.011
  return linkedPatients.includes(input.patientId)
    && fields['Fecha Consulta'] === input.consultationDate
    && fields['Tipo de Consulta'] === input.consultationType
    && weightMatches
    && String(fields['Notas del Terapeuta'] ?? '').includes(input.marker)
}

async function refreshPublishedAccess(input: {patientId:string;consultationId:string;consultationType:string;consultationDate:string;actorEmail:string}) {
  try {
    const accessUpdate = await updateAccessAfterCompletedConsultation({patientRecordId:input.patientId,consultationId:input.consultationId,visitType:input.consultationType,visitDate:input.consultationDate,actorEmail:input.actorEmail})
    return {accessUpdate,warnings:[] as string[]}
  } catch {
    return {accessUpdate:{state:'review_required',verified:false},warnings:['clinic_access_requires_review']}
  }
}

async function publishPreviewConsultation(input: {
  patientId: string
  patientName: string
  previewRecordId: string
  confirmation: unknown
  actorEmail: string
}) {
  if (!/^rec[A-Za-z0-9]{14}$/.test(input.previewRecordId)) {
    return NextResponse.json({ ok: false, error: 'invalid_consultation' }, { status: 400 })
  }
  if (!clinicConsultationPublicationIsConfirmed(input.confirmation)) {
    return NextResponse.json({ ok: false, error: 'confirmation_required' }, { status: 409 })
  }

  const preview = await getPreviewConsultation(input.previewRecordId)
  const previewFields = preview?.fields ?? {}
  if (!preview?.id
    || !clinicRecordInScope(previewFields, input.patientId, {patientId: F.PATIENT_ID, preview: F.PREVIEW_ONLY, key: F.KEY})) {
    return NextResponse.json({ ok: false, error: 'consultation_not_found' }, { status: 404 })
  }

  const marker = clinicConsultationPublicationMarker(input.previewRecordId)
  const consultationType = selectName(previewFields[F.TYPE])
  const consultationDate = normalizeClinicIsoDate(previewFields[F.CONSULTATION_DATE])
  if (!consultationDate || !isLiveClinicConsultationType(consultationType)) {
    return NextResponse.json({ ok: false, error: 'consultation_not_publishable' }, { status: 409 })
  }

  const weightKg = clinicConsultationWeightKg(previewFields[F.WEIGHT], selectName(previewFields[F.WEIGHT_UNIT]))
  const existingPublishedId = clinicPublishedConsultationId(previewFields[F.KEY])
  if (existingPublishedId) {
    try {
      const publishedReadback = await getConsultaById(existingPublishedId)
      const auditVerified = liveConsultationMatches({
        record: publishedReadback,
        patientId: input.patientId,
        consultationDate,
        consultationType,
        weightKg,
        marker,
      })
      const access = auditVerified ? await refreshPublishedAccess({patientId:input.patientId,consultationId:existingPublishedId,consultationType,consultationDate,actorEmail:input.actorEmail}) : {}
      return NextResponse.json({
        ...access,
        ok: true,
        published: true,
        alreadyPublished: true,
        liveConsultationId: existingPublishedId,
        auditVerified,
        warning: auditVerified ? null : 'publication_requires_review',
      })
    } catch {
      return NextResponse.json({ ok: true, published: true, alreadyPublished: true, liveConsultationId: existingPublishedId, auditVerified: false, warning: 'publication_requires_review' })
    }
  }

  const existingLiveConsultations = await getConsultasByPatientId(input.patientId, input.patientName)
  const recoveredMatches = existingLiveConsultations.filter(item => String(item.fields['Notas del Terapeuta'] ?? '').includes(marker))
  if (recoveredMatches.length > 1) return NextResponse.json({ok:false,error:'publication_requires_review'},{status:409})
  const recovered = recoveredMatches[0]
  if (recovered) {
    const valid = liveConsultationMatches({record:recovered,patientId:input.patientId,consultationDate,consultationType,weightKg,marker})
    if (!valid) return NextResponse.json({ok:false,error:'publication_requires_review'},{status:409})
    const auditVerified = await markPreviewConsultationPublished(input.previewRecordId, previewFields[F.KEY], recovered.id)
    const access = auditVerified ? await refreshPublishedAccess({patientId:input.patientId,consultationId:recovered.id,consultationType,consultationDate,actorEmail:input.actorEmail}) : {}
    return NextResponse.json({ ...access, ok: true, published: true, alreadyPublished: true, recovered: true, liveConsultationId: recovered.id, auditVerified })
  }

  const { fields: liveFields } = buildClinicLiveConsultationFields({
    patientId: input.patientId,
    previewRecordId: input.previewRecordId,
    consultationDate,
    consultationType,
    weight: previewFields[F.WEIGHT],
    weightUnit: selectName(previewFields[F.WEIGHT_UNIT]),
    bodyFat: previewFields[F.BODY_FAT],
    waistCm: previewFields[F.WAIST],
    hipsCm: previewFields[F.HIPS],
    armsCm: previewFields[F.ARMS],
    thighsCm: previewFields[F.THIGHS],
    chestCm: previewFields[F.CHEST],
    phase: selectName(previewFields[F.PHASE]),
    phaseWeek: previewFields[F.PHASE_WEEK],
    recommendations: previewFields[F.RECOMMENDATIONS],
    consultationFee: previewFields[F.CONSULTATION_FEE],
    amountCollected: previewFields[F.AMOUNT_COLLECTED],
    paymentMethod: selectName(previewFields[F.PAYMENT_METHOD]),
  })

  const live = await createConsulta(liveFields)
  const readback = await getConsultaById(live.id)
  if (!liveConsultationMatches({ record: readback, patientId: input.patientId, consultationDate, consultationType, weightKg, marker })) {
    console.error('clinic_consultation_publication_verify_failed', { previewRecordId: input.previewRecordId, liveConsultationId: live.id })
    return NextResponse.json({ ok: true, published: true, liveConsultationId: live.id, auditVerified: false, warning: 'publication_requires_review' })
  }

  const warnings: string[] = []
  const nextAppointment = safeText(previewFields[F.NEXT_APPOINTMENT], 40)
  if (nextAppointment) {
    try {
      await updateCliente(input.patientId, { [CLIENTES_FIELDS.PROXIMA_CITA]: nextAppointment })
    } catch {
      warnings.push('next_appointment_not_updated')
    }
  }

  const access = await refreshPublishedAccess({patientId:input.patientId,consultationId:live.id,consultationType,consultationDate,actorEmail:input.actorEmail})
  warnings.push(...access.warnings)

  const auditVerified = await markPreviewConsultationPublished(input.previewRecordId, previewFields[F.KEY], live.id)
  if (!auditVerified) warnings.push('preview_audit_requires_review')

  return NextResponse.json({
    ok: true,
    published: true,
    liveConsultationId: live.id,
    auditVerified,
    accessUpdate: access.accessUpdate,
    warnings,
  })
}

export async function GET(request: NextRequest) {
  try {
    await requireFounder()
    const patientId = safeText(request.nextUrl.searchParams.get('patientId'), 100)
    if (!patientId.startsWith('rec')) return NextResponse.json({ ok: false }, { status: 400 })

    const params = new URLSearchParams({
      pageSize: '100',
      filterByFormula: clinicRecordFilter(patientId, 'Consultation Key'),
      returnFieldsByFieldId: 'true',
    })
    params.append('sort[0][field]', 'Consultation At')
    params.append('sort[0][direction]', 'desc')

    const response = await fetch(`${baseUrl()}?${params}`, { headers: headers(), cache: 'no-store' })
    if (!response.ok) return NextResponse.json({ ok: false }, { status: 500 })
    const data = await response.json()
    const consultations = (data.records ?? []).filter((record: any) => clinicRecordInScope(record.fields ?? {}, patientId, {patientId: F.PATIENT_ID, preview: F.PREVIEW_ONLY, key: F.KEY})).map((record: any) => ({
      id: record.id,
      consultationAt: record.fields?.[F.CONSULTATION_AT] ?? null,
      consultationDate: record.fields?.[F.CONSULTATION_DATE] ?? null,
      consultationType: record.fields?.[F.TYPE] ?? '',
      weight: record.fields?.[F.WEIGHT] ?? null,
      weightUnit: record.fields?.[F.WEIGHT_UNIT] ?? '',
      bodyFat: record.fields?.[F.BODY_FAT] ?? null,
      waistCm: record.fields?.[F.WAIST] ?? null,
      hipsCm: record.fields?.[F.HIPS] ?? null,
      armsCm: record.fields?.[F.ARMS] ?? null,
      thighsCm: record.fields?.[F.THIGHS] ?? null,
      chestCm: record.fields?.[F.CHEST] ?? null,
      phase: record.fields?.[F.PHASE] ?? '',
      phaseWeek: record.fields?.[F.PHASE_WEEK] ?? null,
      recommendations: record.fields?.[F.RECOMMENDATIONS] ?? '',
      nextAppointment: record.fields?.[F.NEXT_APPOINTMENT] ?? null,
      consultationFee: record.fields?.[F.CONSULTATION_FEE] ?? null,
      amountCollected: record.fields?.[F.AMOUNT_COLLECTED] ?? null,
      paymentMethod: record.fields?.[F.PAYMENT_METHOD] ?? '',
      authorLabel: record.fields?.[F.AUTHOR_LABEL] ?? '',
      weightCorrectedInPreview: String(record.fields?.[F.RECOMMENDATIONS] ?? '').includes('Corrección de peso sólo en Preview ·'),
      publishedToClinic: Boolean(clinicPublishedConsultationId(record.fields?.[F.KEY])),
      liveConsultationId: clinicPublishedConsultationId(record.fields?.[F.KEY]),
    }))
    return NextResponse.json({ ok: true, consultations })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FORBIDDEN'
    const status = message === 'CLINIC_CANDIDATE_READ_ONLY' ? 409 : message === 'NOT_FOUND' ? 404 : message === 'UNAUTHENTICATED' ? 401 : 403
    return NextResponse.json({ ok: false }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    assertClinicSourceWriteAllowed()
    const actor = await requireFounder()
    if(request.headers.get('origin')!==request.nextUrl.origin) throw new Error('FORBIDDEN')
    const body = await request.json()
    const patientId = safeText(body.patientId, 100)
    if (!patientId.startsWith('rec')) return NextResponse.json({ ok: false, error: 'invalid_patient' }, { status: 400 })

    const patient = await getClienteById(patientId)
    if (!patient) return NextResponse.json({ ok: false, error: 'patient_not_found' }, { status: 404 })
    if(patientIsUnavailable(patient)) return NextResponse.json({ok:false,error:'patient_archived'},{status:409})

    if (body.action === 'correctWeight') {
      const recordId = safeText(body.previewRecordId, 100)
      const reason = safeText(body.reason, 500)
      const normalized = normalizeClinicWeightEntry(body.weight, body.weightUnit)
      if (!/^rec[A-Za-z0-9]{14}$/.test(recordId) || !normalized.ok || reason.length < 10) {
        return NextResponse.json({ ok: false, error: 'invalid_correction' }, { status: 400 })
      }
      const previous = await getPreviewConsultation(recordId)
      const before = previous?.fields ?? {}
      if (!clinicRecordInScope(before, patientId, {patientId: F.PATIENT_ID, preview: F.PREVIEW_ONLY, key: F.KEY})) {
        return NextResponse.json({ ok: false, error: 'preview_record_not_found' }, { status: 404 })
      }
      const oldUnit = selectName(before[F.WEIGHT_UNIT])
      const oldNotes = String(before[F.RECOMMENDATIONS] ?? '')
      // A retry after a successful write must not append a second correction.
      if (before[F.WEIGHT] === normalized.weight && oldUnit === normalized.unit) {
        return NextResponse.json({ ok: true, verified: true, recordId })
      }
      if (before[F.WEIGHT] !== body.expectedWeight || oldUnit !== body.expectedUnit
        || oldNotes !== body.expectedRecommendations) {
        return NextResponse.json({ ok: false, error: 'record_changed' }, { status: 409 })
      }
      const audit = `Corrección de peso sólo en Preview · ${new Date().toISOString()} · ${actor.email}: ${before[F.WEIGHT]} ${oldUnit} → ${normalized.weight} ${normalized.unit}. Motivo: ${reason}`
      const notes = [oldNotes, audit].filter(Boolean).join('\n')
      const response = await fetch(`${baseUrl()}/${recordId}?returnFieldsByFieldId=true`, {
        method: 'PATCH', headers: headers(), cache: 'no-store',
        body: JSON.stringify({ fields: {
          [F.WEIGHT]: normalized.weight,
          [F.WEIGHT_UNIT]: normalized.unit,
          [F.RECOMMENDATIONS]: notes,
        } }),
      })
      if (!response.ok) return NextResponse.json({ ok: false, error: 'save_failed' }, { status: 500 })
      const verified = await getPreviewConsultation(recordId)
      const after = verified?.fields ?? {}
      if (!clinicRecordInScope(after, patientId, {patientId: F.PATIENT_ID, preview: F.PREVIEW_ONLY, key: F.KEY})
        || after[F.WEIGHT] !== normalized.weight || selectName(after[F.WEIGHT_UNIT]) !== normalized.unit
        || after[F.RECOMMENDATIONS] !== notes) {
        return NextResponse.json({ ok: false, error: 'verify_failed' }, { status: 500 })
      }
      return NextResponse.json({ ok: true, verified: true, recordId })
    }

    if (body.action === 'publish') {
      return publishPreviewConsultation({
        patientId,
        patientName: String(patient.fields['Nombre Completo'] ?? 'Paciente'),
        previewRecordId: safeText(body.previewRecordId, 100),
        confirmation: body.confirmation,
        actorEmail: actor.email,
      })
    }

    const weightUpdateMode = body.mode === 'weightUpdate'
    const allowedTypes = ['Cliente Nuevo', 'Cliente subsecuente', 'Cliente Re-Inicio']
    const allowedPhases = ['Jing', 'Qi', 'Xue', 'Yang Sheng', 'Sin fase']
    const allowedUnits = ['lb', 'kg']
    const allowedPayments = ['Efectivo', 'Card', 'Venmo', 'Zelle', 'Transferencia', 'Sin especificar']

    const consultationType = weightUpdateMode
      ? CLINIC_WEIGHT_UPDATE_TYPE
      : allowedTypes.includes(body.consultationType) ? body.consultationType : 'Cliente subsecuente'
    const phase = allowedPhases.includes(body.phase) ? body.phase : 'Sin fase'
    const weightUnit = allowedUnits.includes(body.weightUnit) ? body.weightUnit : 'lb'
    const paymentMethod = allowedPayments.includes(body.paymentMethod) ? body.paymentMethod : 'Sin especificar'

    const consultationDate = normalizeClinicIsoDate(body.consultationDate)
    if (!consultationDate) {
      return NextResponse.json({ ok: false, error: 'invalid_date' }, { status: 400 })
    }
    const normalizedWeight = weightUpdateMode ? normalizeClinicWeightEntry(body.weight, body.weightUnit) : null
    if (normalizedWeight && !normalizedWeight.ok) {
      return NextResponse.json({ ok: false, error: normalizedWeight.error }, { status: 400 })
    }
    const weight = normalizedWeight?.ok ? normalizedWeight.weight : safeNumber(body.weight)
    const bodyFat = safeNumber(body.bodyFat)
    const waistCm = safeNumber(body.waistCm)
    const hipsCm = safeNumber(body.hipsCm)
    const armsCm = safeNumber(body.armsCm)
    const thighsCm = safeNumber(body.thighsCm)
    const chestCm = safeNumber(body.chestCm)
    const phaseWeek = safeNumber(body.phaseWeek)
    const recommendations = weightUpdateMode
      ? 'Peso informado por el paciente y registrado manualmente en Clinic Preview.'
      : safeText(body.recommendations, 5000)
    const nextAppointment = safeText(body.nextAppointment, 40)
    const normalizedFee = weightUpdateMode ? { valid: true, value: null } : optionalNonNegativeNumber(body.consultationFee)
    const normalizedCollected = weightUpdateMode ? { valid: true, value: null } : optionalNonNegativeNumber(body.amountCollected)
    if (!normalizedFee.valid || !normalizedCollected.valid) {
      return NextResponse.json({ ok: false, error: 'invalid_payment' }, { status: 400 })
    }
    const consultationFee = normalizedFee.value
    const amountCollected = normalizedCollected.value

    const now = new Date().toISOString()
    const fields: Record<string, unknown> = {
      [F.KEY]: clinicRecordKey(`${patientId}:${Date.now()}`),
      [F.PATIENT]: [patientId],
      [F.PATIENT_ID]: patientId,
      [F.PATIENT_NAME]: String(patient.fields['Nombre Completo'] ?? 'Paciente'),
      [F.CONSULTATION_AT]: now,
      [F.TYPE]: consultationType,
      [F.WEIGHT_UNIT]: normalizedWeight?.ok ? normalizedWeight.unit : weightUnit,
      [F.PHASE]: phase,
      [F.PAYMENT_METHOD]: paymentMethod,
      [F.AUTHOR_EMAIL]: actor.email,
      [F.AUTHOR_LABEL]: 'Rom / Founder',
      [F.PREVIEW_ONLY]: clinicUsesPreviewRecords(),
    }

    if (consultationDate) fields[F.CONSULTATION_DATE] = consultationDate
    if (weight !== null) fields[F.WEIGHT] = weight
    if (bodyFat !== null) fields[F.BODY_FAT] = bodyFat
    if (waistCm !== null) fields[F.WAIST] = waistCm
    if (hipsCm !== null) fields[F.HIPS] = hipsCm
    if (armsCm !== null) fields[F.ARMS] = armsCm
    if (thighsCm !== null) fields[F.THIGHS] = thighsCm
    if (chestCm !== null) fields[F.CHEST] = chestCm
    if (phaseWeek !== null) fields[F.PHASE_WEEK] = phaseWeek
    if (recommendations) fields[F.RECOMMENDATIONS] = recommendations
    if (nextAppointment) fields[F.NEXT_APPOINTMENT] = new Date(nextAppointment).toISOString()
    if (consultationFee !== null) fields[F.CONSULTATION_FEE] = consultationFee
    if (amountCollected !== null) fields[F.AMOUNT_COLLECTED] = amountCollected

    const response = await fetch(`${baseUrl()}?returnFieldsByFieldId=true`, {
      method: 'POST', headers: headers(), cache: 'no-store',
      body: JSON.stringify({ records: [{ fields }], typecast: true }),
    })
    if (!response.ok) return NextResponse.json({ ok: false, error: 'save_failed' }, { status: 500 })
    const saved = await response.json()
    const savedRecord = saved.records?.[0]
    if (!savedRecord?.id) return NextResponse.json({ ok: false, error: 'verify_failed' }, { status: 500 })
    if (weightUpdateMode) {
      const verificationResponse = await fetch(`${baseUrl()}/${savedRecord.id}?returnFieldsByFieldId=true`, {
        headers: headers(), cache: 'no-store',
      })
      if (!verificationResponse.ok) return NextResponse.json({ ok: false, error: 'verify_failed' }, { status: 500 })
      const verifiedRecord = await verificationResponse.json()
      const savedFields = verifiedRecord.fields ?? {}
      const verified = savedFields[F.PATIENT_ID] === patientId
        && selectName(savedFields[F.TYPE]) === CLINIC_WEIGHT_UPDATE_TYPE
        && Number(savedFields[F.WEIGHT]) === weight
        && selectName(savedFields[F.WEIGHT_UNIT]) === normalizedWeight?.unit
        && savedFields[F.PREVIEW_ONLY] === clinicUsesPreviewRecords()
      if (!verified) return NextResponse.json({ ok: false, error: 'verify_failed' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, saved: true, recordId: savedRecord.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FORBIDDEN'
    const status = message === 'CLINIC_CANDIDATE_READ_ONLY' ? 409 : message === 'NOT_FOUND' ? 404 : message === 'UNAUTHENTICATED' ? 401 : 403
    return NextResponse.json({ ok: false }, { status })
  }
}
