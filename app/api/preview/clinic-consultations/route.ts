import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/auth'
import { getClienteById } from '@/lib/airtable'
import { isP5FounderCanaryIdentity } from '@/lib/p5-founder-canary-policy'

const PREVIEW_BRANCH = 'myaq-ent-p5-1-extended-ai-live-canary'
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

function previewOnly() {
  return process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF === PREVIEW_BRANCH
}

function baseUrl() {
  return `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${TABLE_ID}`
}

function headers() {
  return { Authorization: `Bearer ${process.env.AIRTABLE_PAT}`, 'Content-Type': 'application/json' }
}

async function requireFounder() {
  if (!previewOnly()) throw new Error('NOT_FOUND')
  const actor = await getActor()
  if (!actor) throw new Error('UNAUTHENTICATED')
  const allowed = actor.role === 'admin' || isP5FounderCanaryIdentity({
    email: actor.email,
    environment: {
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
      MYAQ_P5_FOUNDER_CANARY: process.env.MYAQ_P5_FOUNDER_CANARY,
    },
  })
  if (!allowed) throw new Error('FORBIDDEN')
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

function escapeFormula(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export async function GET(request: NextRequest) {
  try {
    await requireFounder()
    const patientId = safeText(request.nextUrl.searchParams.get('patientId'), 100)
    if (!patientId.startsWith('rec')) return NextResponse.json({ ok: false }, { status: 400 })

    const params = new URLSearchParams({
      pageSize: '100',
      filterByFormula: `{Patient Record ID} = "${escapeFormula(patientId)}"`,
      returnFieldsByFieldId: 'true',
    })
    params.append('sort[0][field]', 'Consultation At')
    params.append('sort[0][direction]', 'desc')

    const response = await fetch(`${baseUrl()}?${params}`, { headers: headers(), cache: 'no-store' })
    if (!response.ok) return NextResponse.json({ ok: false }, { status: 500 })
    const data = await response.json()
    const consultations = (data.records ?? []).map((record: any) => ({
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
    }))
    return NextResponse.json({ ok: true, consultations })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FORBIDDEN'
    const status = message === 'NOT_FOUND' ? 404 : message === 'UNAUTHENTICATED' ? 401 : 403
    return NextResponse.json({ ok: false }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireFounder()
    const body = await request.json()
    const patientId = safeText(body.patientId, 100)
    if (!patientId.startsWith('rec')) return NextResponse.json({ ok: false, error: 'invalid_patient' }, { status: 400 })

    const patient = await getClienteById(patientId)
    if (!patient) return NextResponse.json({ ok: false, error: 'patient_not_found' }, { status: 404 })

    const allowedTypes = ['Cliente Nuevo', 'Cliente subsecuente', 'Cliente Re-Inicio', 'Seguimiento']
    const allowedPhases = ['Jing', 'Qi', 'Xue', 'Yang Sheng', 'Sin fase']
    const allowedUnits = ['lb', 'kg']
    const allowedPayments = ['Efectivo', 'Card', 'Venmo', 'Zelle', 'Transferencia', 'Sin especificar']

    const consultationType = allowedTypes.includes(body.consultationType) ? body.consultationType : 'Cliente subsecuente'
    const phase = allowedPhases.includes(body.phase) ? body.phase : 'Sin fase'
    const weightUnit = allowedUnits.includes(body.weightUnit) ? body.weightUnit : 'lb'
    const paymentMethod = allowedPayments.includes(body.paymentMethod) ? body.paymentMethod : 'Sin especificar'

    const consultationDate = safeText(body.consultationDate, 20)
    const weight = safeNumber(body.weight)
    const bodyFat = safeNumber(body.bodyFat)
    const waistCm = safeNumber(body.waistCm)
    const hipsCm = safeNumber(body.hipsCm)
    const armsCm = safeNumber(body.armsCm)
    const thighsCm = safeNumber(body.thighsCm)
    const chestCm = safeNumber(body.chestCm)
    const phaseWeek = safeNumber(body.phaseWeek)
    const recommendations = safeText(body.recommendations, 5000)
    const nextAppointment = safeText(body.nextAppointment, 40)
    const consultationFee = safeNumber(body.consultationFee)
    const amountCollected = safeNumber(body.amountCollected)

    const now = new Date().toISOString()
    const fields: Record<string, unknown> = {
      [F.KEY]: `${patientId}:${Date.now()}`,
      [F.PATIENT]: [patientId],
      [F.PATIENT_ID]: patientId,
      [F.PATIENT_NAME]: String(patient.fields['Nombre Completo'] ?? 'Paciente'),
      [F.CONSULTATION_AT]: now,
      [F.TYPE]: consultationType,
      [F.WEIGHT_UNIT]: weightUnit,
      [F.PHASE]: phase,
      [F.PAYMENT_METHOD]: paymentMethod,
      [F.AUTHOR_EMAIL]: actor.email,
      [F.AUTHOR_LABEL]: 'Rom / Founder',
      [F.PREVIEW_ONLY]: true,
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

    const response = await fetch(baseUrl(), {
      method: 'POST', headers: headers(), cache: 'no-store',
      body: JSON.stringify({ records: [{ fields }], typecast: true }),
    })
    if (!response.ok) return NextResponse.json({ ok: false, error: 'save_failed' }, { status: 500 })
    return NextResponse.json({ ok: true, saved: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FORBIDDEN'
    const status = message === 'NOT_FOUND' ? 404 : message === 'UNAUTHENTICATED' ? 401 : 403
    return NextResponse.json({ ok: false }, { status })
  }
}
