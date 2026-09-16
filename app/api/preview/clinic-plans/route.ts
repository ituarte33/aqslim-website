import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/auth'
import { getClienteById, getClientes, getPlanById } from '@/lib/airtable'
import { isP5FounderCanaryIdentity } from '@/lib/p5-founder-canary-policy'

const PREVIEW_BRANCH = 'myaq-ent-p5-1-extended-ai-live-canary'
const TABLE_ID = 'tblSaxNRZxJLpsnIm'

const F = {
  KEY: 'fldveDoqvsLCaIX7F',
  PATIENT: 'fldbFbqo3aQk1nExc',
  PATIENT_ID: 'fldrVeUTIBCToRfi1',
  PATIENT_NAME: 'fldNPOaYtprtop6HM',
  STATUS: 'fldvlqK8R7M4qOyTe',
  LABEL: 'fldT4Uij0PLOEfZBd',
  TREATMENT_START: 'fldIWdTJmEB7Eg9UC',
  PHASE: 'fldMKSHDq2iZC3Y2X',
  PHASE_WEEK: 'fldeWJMD0LVuR0dj2',
  PHASE_START: 'fldoD7594cfTGXAgs',
  CALORIES: 'fldSRpejfqp8tfO0T',
  DIET: 'flddveVX3mKwDpyt7',
  INSTRUCTIONS: 'fld64qRy16w0lC5QD',
  TIER: 'fld9GiPmLnoie3RPa',
  CADENCE: 'fldqfbMc6U1a2fewW',
  START_WEIGHT: 'fld9JQJ5Xt7hvwHAZ',
  CURRENT_WEIGHT: 'fldWhxbUVzRxRlD9o',
  GOAL_WEIGHT: 'fld6mhu5sHh2b45iy',
  AUTHOR_EMAIL: 'fldkFf8B6XiSnTVw6',
  AUTHOR_LABEL: 'fld1lRysXgAjiSFoo',
  UPDATED_AT: 'fldkhxdO6i7bDyjtK',
  PREVIEW_ONLY: 'fldLkK8zopv1hBDzL',
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

function text(value: unknown, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function numberOrNull(value: unknown) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function escapeFormula(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

async function resolvePatient(request: NextRequest, body?: Record<string, unknown>) {
  const patientId = text(body?.patientId ?? request.nextUrl.searchParams.get('patientId'), 100)
  if (patientId.startsWith('rec')) return getClienteById(patientId)

  const patientName = text(body?.patientName ?? request.nextUrl.searchParams.get('patientName'), 250)
  const patientEmail = text(body?.patientEmail ?? request.nextUrl.searchParams.get('patientEmail'), 250).toLowerCase()
  const patientPhone = text(body?.patientPhone ?? request.nextUrl.searchParams.get('patientPhone'), 80)
  if (!patientName) return null

  const all = await getClientes()
  const matches = all.filter(patient => {
    const name = String(patient.fields['Nombre Completo'] ?? '').trim()
    if (name !== patientName) return false
    if (patientEmail) return String(patient.fields['Email'] ?? '').trim().toLowerCase() === patientEmail
    if (patientPhone) return String(patient.fields['Teléfono'] ?? '').replace(/\D/g, '') === patientPhone.replace(/\D/g, '')
    return true
  })
  return matches.length === 1 ? matches[0] : null
}

function mapDraft(record: any) {
  const f = record?.fields ?? {}
  return {
    id: record?.id ?? '',
    status: f[F.STATUS] ?? 'Draft',
    planLabel: f[F.LABEL] ?? '',
    treatmentStart: f[F.TREATMENT_START] ?? '',
    phase: f[F.PHASE] ?? 'Sin fase',
    phaseWeek: f[F.PHASE_WEEK] ?? null,
    phaseStart: f[F.PHASE_START] ?? '',
    calorieTarget: f[F.CALORIES] ?? null,
    dietName: f[F.DIET] ?? '',
    specialInstructions: f[F.INSTRUCTIONS] ?? '',
    kenkhoTier: f[F.TIER] ?? 'Clinic',
    visitCadenceDays: f[F.CADENCE] ?? null,
    startingWeightKg: f[F.START_WEIGHT] ?? null,
    currentWeightKg: f[F.CURRENT_WEIGHT] ?? null,
    goalWeightKg: f[F.GOAL_WEIGHT] ?? null,
    updatedAt: f[F.UPDATED_AT] ?? null,
  }
}

function mapLivePlan(plan: any) {
  const f = plan?.fields ?? {}
  return {
    id: plan?.id ?? '',
    planLabel: f['Notas del Plan'] ?? '',
    treatmentStart: f['Fecha Inicio Tratamiento'] ?? '',
    phase: f['Fase Actual'] ?? 'Sin fase',
    phaseWeek: f['Semana en Fase Actual'] ?? null,
    phaseStart: f['Fecha Inicio Fase Actual'] ?? '',
    calorieTarget: f['Calorías Objetivo'] ?? null,
    dietName: f['Dieta en Nutrimind'] ?? '',
    specialInstructions: f['Instrucciones Especiales'] ?? '',
    kenkhoTier: f['Nivel Kenkho Path'] ?? 'Clinic',
    startingWeightKg: f['Peso Inicio (kg)'] ?? null,
    currentWeightKg: f['Peso Actual (kg)'] ?? null,
    goalWeightKg: f['Peso Meta (kg)'] ?? null,
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireFounder()
    const patient = await resolvePatient(request)
    if (!patient) return NextResponse.json({ ok: false, error: 'patient_not_found_or_ambiguous' }, { status: 404 })

    const key = `${patient.id}:v1`
    const params = new URLSearchParams({
      maxRecords: '1',
      filterByFormula: `{Plan Key} = "${escapeFormula(key)}"`,
      returnFieldsByFieldId: 'true',
    })
    const response = await fetch(`${baseUrl()}?${params}`, { headers: headers(), cache: 'no-store' })
    if (!response.ok) return NextResponse.json({ ok: false, error: 'draft_load_failed' }, { status: 500 })
    const data = await response.json()
    const draftRecord = data.records?.[0] ?? null

    let livePlan = null
    const livePlanIds = patient.fields['Plan AQSLIM']
    if (Array.isArray(livePlanIds) && livePlanIds[0]) {
      try { livePlan = mapLivePlan(await getPlanById(String(livePlanIds[0]))) } catch { livePlan = null }
    }

    return NextResponse.json({
      ok: true,
      patient: { id: patient.id, name: patient.fields['Nombre Completo'] ?? 'Paciente' },
      draft: draftRecord ? mapDraft(draftRecord) : null,
      livePlan,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FORBIDDEN'
    const status = message === 'NOT_FOUND' ? 404 : message === 'UNAUTHENTICATED' ? 401 : 403
    return NextResponse.json({ ok: false }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireFounder()
    const body = await request.json() as Record<string, unknown>
    const patient = await resolvePatient(request, body)
    if (!patient) return NextResponse.json({ ok: false, error: 'patient_not_found_or_ambiguous' }, { status: 404 })

    const allowedPhases = ['Jing', 'Qi', 'Xue', 'Yang Sheng', 'Sin fase']
    const allowedTiers = ['Clinic', 'Start', 'Plus', 'Elite']
    const allowedStatuses = ['Draft', 'Ready for Review', 'Published Preview']
    const phase = allowedPhases.includes(String(body.phase)) ? String(body.phase) : 'Sin fase'
    const tier = allowedTiers.includes(String(body.kenkhoTier)) ? String(body.kenkhoTier) : 'Clinic'
    const status = allowedStatuses.includes(String(body.status)) ? String(body.status) : 'Draft'
    const now = new Date().toISOString()
    const key = `${patient.id}:v1`

    const fields: Record<string, unknown> = {
      [F.KEY]: key,
      [F.PATIENT]: [patient.id],
      [F.PATIENT_ID]: patient.id,
      [F.PATIENT_NAME]: String(patient.fields['Nombre Completo'] ?? 'Paciente'),
      [F.STATUS]: status,
      [F.PHASE]: phase,
      [F.TIER]: tier,
      [F.AUTHOR_EMAIL]: actor.email,
      [F.AUTHOR_LABEL]: 'Rom / Founder',
      [F.UPDATED_AT]: now,
      [F.PREVIEW_ONLY]: true,
    }

    const stringFields: Array<[string, unknown, number]> = [
      [F.LABEL, body.planLabel, 300],
      [F.DIET, body.dietName, 4000],
      [F.INSTRUCTIONS, body.specialInstructions, 8000],
    ]
    for (const [field, value, max] of stringFields) {
      const clean = text(value, max)
      if (clean) fields[field] = clean
    }

    const dateFields: Array<[string, unknown]> = [[F.TREATMENT_START, body.treatmentStart], [F.PHASE_START, body.phaseStart]]
    for (const [field, value] of dateFields) {
      const clean = text(value, 20)
      if (clean) fields[field] = clean
    }

    const numberFields: Array<[string, unknown]> = [
      [F.PHASE_WEEK, body.phaseWeek],
      [F.CALORIES, body.calorieTarget],
      [F.CADENCE, body.visitCadenceDays],
      [F.START_WEIGHT, body.startingWeightKg],
      [F.CURRENT_WEIGHT, body.currentWeightKg],
      [F.GOAL_WEIGHT, body.goalWeightKg],
    ]
    for (const [field, value] of numberFields) {
      const n = numberOrNull(value)
      if (n !== null) fields[field] = n
    }

    const params = new URLSearchParams({
      maxRecords: '1',
      filterByFormula: `{Plan Key} = "${escapeFormula(key)}"`,
      returnFieldsByFieldId: 'true',
    })
    const existingResponse = await fetch(`${baseUrl()}?${params}`, { headers: headers(), cache: 'no-store' })
    if (!existingResponse.ok) return NextResponse.json({ ok: false, error: 'lookup_failed' }, { status: 500 })
    const existingData = await existingResponse.json()
    const existing = existingData.records?.[0]

    const response = await fetch(baseUrl(), {
      method: existing ? 'PATCH' : 'POST',
      headers: headers(),
      cache: 'no-store',
      body: JSON.stringify(existing
        ? { records: [{ id: existing.id, fields }], typecast: true }
        : { records: [{ fields }], typecast: true }),
    })
    if (!response.ok) return NextResponse.json({ ok: false, error: 'save_failed' }, { status: 500 })
    const saved = await response.json()
    return NextResponse.json({ ok: true, draft: mapDraft(saved.records?.[0]) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FORBIDDEN'
    const status = message === 'NOT_FOUND' ? 404 : message === 'UNAUTHENTICATED' ? 401 : 403
    return NextResponse.json({ ok: false }, { status })
  }
}
