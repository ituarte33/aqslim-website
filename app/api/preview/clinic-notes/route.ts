import { NextRequest, NextResponse } from 'next/server'
import { getActor } from '@/lib/auth'
import { getClienteById } from '@/lib/airtable'
import { isClinicFounderIdentity, isClinicPreviewEnvironment } from '@/lib/clinic-preview-policy'
import {
  CLINIC_FOLLOWUP_PRIORITIES,
  CLINIC_FOLLOWUP_STATUSES,
  clinicFollowupIsPending,
  decodeClinicFollowup,
  encodeClinicFollowup,
  type ClinicFollowupPriority,
  type ClinicFollowupStatus,
} from '@/lib/clinic-followup'
import {
  CLINIC_MESSAGE_CHANNELS,
  CLINIC_MESSAGE_PURPOSES,
  CLINIC_MESSAGE_STATUSES,
  decodeClinicMessageDraft,
  encodeClinicMessageDraft,
  type ClinicMessageChannel,
  type ClinicMessagePurpose,
  type ClinicMessageStatus,
} from '@/lib/clinic-message-draft'

const TABLE_ID = 'tbljMLa7RCRzBYZBI'

const F = {
  NOTE_KEY: 'fldRePC6iOWS18huz',
  PATIENT: 'fldelIlWTfLuMEqfQ',
  PATIENT_ID: 'fldbQwEqdKsNFn3Ke',
  PATIENT_NAME: 'fldAgbqZ05ALdEfdw',
  NOTE_AT: 'fldlHBasIVIsc9O02',
  AUTHOR_EMAIL: 'fldDXLZpA5kyN4zdJ',
  AUTHOR_LABEL: 'fldR7Pwa37N8UTIFC',
  NOTE_TYPE: 'fldRU6tGS0VkbkpU2',
  NOTE: 'fldsYW351kG68jXLk',
  FOLLOWUP_REQUIRED: 'fldSOqa1HxxknVHI8',
  FOLLOWUP_DATE: 'fldTQzMaWddrG77cI',
  PREVIEW_ONLY: 'fldXhnn0sn0z3XMSX',
} as const

function clinicEnvironment() {
  return {
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
  }
}

function baseUrl() {
  return `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${TABLE_ID}`
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.AIRTABLE_PAT}`,
    'Content-Type': 'application/json',
  }
}

async function requireFounder() {
  const environment = clinicEnvironment()
  if (!isClinicPreviewEnvironment(environment)) throw new Error('NOT_FOUND')
  const actor = await getActor()
  if (!actor) throw new Error('UNAUTHENTICATED')
  if (!isClinicFounderIdentity({ email: actor.email, environment })) throw new Error('FORBIDDEN')
  return actor
}

function safeText(value: unknown, max = 8000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
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
    params.append('sort[0][field]', 'Note At')
    params.append('sort[0][direction]', 'desc')

    const response = await fetch(`${baseUrl()}?${params}`, { headers: headers(), cache: 'no-store' })
    if (!response.ok) return NextResponse.json({ ok: false }, { status: 500 })
    const data = await response.json()

    const notes = (data.records ?? []).map((record: any) => {
      const rawNote = record.fields?.[F.NOTE] ?? ''
      const followup = decodeClinicFollowup(rawNote)
      const messageDraft = decodeClinicMessageDraft(rawNote)
      return {
        id: record.id,
        noteAt: record.fields?.[F.NOTE_AT] ?? null,
        authorEmail: record.fields?.[F.AUTHOR_EMAIL] ?? '',
        authorLabel: record.fields?.[F.AUTHOR_LABEL] ?? '',
        noteType: record.fields?.[F.NOTE_TYPE] ?? 'General',
        note: followup?.action ?? messageDraft?.body ?? rawNote,
        followupRequired: record.fields?.[F.FOLLOWUP_REQUIRED] === true,
        followupDate: record.fields?.[F.FOLLOWUP_DATE] ?? null,
        followup,
        messageDraft,
      }
    })

    return NextResponse.json({ ok: true, notes })
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
    const isStructuredFollowup = body.kind === 'followup'
    const isMessageDraft = body.kind === 'messageDraft'
    const action = safeText(body.action)
    const priority = CLINIC_FOLLOWUP_PRIORITIES.includes(body.priority as ClinicFollowupPriority)
      ? body.priority as ClinicFollowupPriority
      : 'Normal'
    const status = CLINIC_FOLLOWUP_STATUSES.includes(body.status as ClinicFollowupStatus)
      ? body.status as ClinicFollowupStatus
      : 'Pendiente'
    const messageBody = safeText(body.messageBody)
    const messageChannel = CLINIC_MESSAGE_CHANNELS.includes(body.channel as ClinicMessageChannel)
      ? body.channel as ClinicMessageChannel
      : 'SMS'
    const messagePurpose = CLINIC_MESSAGE_PURPOSES.includes(body.purpose as ClinicMessagePurpose)
      ? body.purpose as ClinicMessagePurpose
      : 'General'
    const messageStatus = CLINIC_MESSAGE_STATUSES.includes(body.messageStatus as ClinicMessageStatus)
      ? body.messageStatus as ClinicMessageStatus
      : 'Borrador'
    const note = isStructuredFollowup
      ? encodeClinicFollowup({ action, priority, status })
      : isMessageDraft
        ? encodeClinicMessageDraft({
          channel: messageChannel,
          purpose: messagePurpose,
          status: messageStatus,
          subject: safeText(body.subject, 500),
          body: messageBody,
        })
        : safeText(body.note)
    const noteType = isStructuredFollowup
      ? 'Seguimiento'
      : isMessageDraft
        ? 'General'
        : ['Consulta', 'Entrevista', 'Seguimiento', 'General'].includes(body.noteType) ? body.noteType : 'General'
    const followupRequired = isStructuredFollowup ? clinicFollowupIsPending(status) : body.followupRequired === true
    const followupDate = followupRequired ? safeText(body.followupDate, 20) : ''

    if (!patientId.startsWith('rec') || !note || (isStructuredFollowup && !action) || (isMessageDraft && !messageBody)) {
      return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 })
    }

    const patient = await getClienteById(patientId)
    if (!patient) return NextResponse.json({ ok: false, error: 'patient_not_found' }, { status: 404 })

    const now = new Date().toISOString()
    const noteKey = `${patientId}:${Date.now()}`
    const patientName = String(patient.fields['Nombre Completo'] ?? 'Paciente')

    const fields: Record<string, unknown> = {
      [F.NOTE_KEY]: noteKey,
      [F.PATIENT]: [patientId],
      [F.PATIENT_ID]: patientId,
      [F.PATIENT_NAME]: patientName,
      [F.NOTE_AT]: now,
      [F.AUTHOR_EMAIL]: actor.email,
      [F.AUTHOR_LABEL]: 'Rom / Founder',
      [F.NOTE_TYPE]: noteType,
      [F.NOTE]: note,
      [F.FOLLOWUP_REQUIRED]: followupRequired,
      [F.PREVIEW_ONLY]: true,
    }
    if (followupDate) fields[F.FOLLOWUP_DATE] = followupDate

    const response = await fetch(baseUrl(), {
      method: 'POST',
      headers: headers(),
      cache: 'no-store',
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

export async function PATCH(request: NextRequest) {
  try {
    await requireFounder()
    const body = await request.json()
    const patientId = safeText(body.patientId, 100)
    const recordId = safeText(body.recordId, 100)
    if (!patientId.startsWith('rec') || !recordId.startsWith('rec')) {
      return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 })
    }

    const currentResponse = await fetch(`${baseUrl()}/${recordId}?returnFieldsByFieldId=true`, {
      headers: headers(),
      cache: 'no-store',
    })
    if (!currentResponse.ok) return NextResponse.json({ ok: false, error: 'followup_not_found' }, { status: 404 })
    const current = await currentResponse.json()
    if (current.fields?.[F.PATIENT_ID] !== patientId) {
      return NextResponse.json({ ok: false, error: 'patient_mismatch' }, { status: 403 })
    }

    const existingMessageDraft = decodeClinicMessageDraft(current.fields?.[F.NOTE])
    if (body.kind === 'messageDraft') {
      if (!existingMessageDraft) return NextResponse.json({ ok: false, error: 'not_message_draft' }, { status: 400 })
      const messageBody = safeText(body.messageBody) || existingMessageDraft.body
      const channel = CLINIC_MESSAGE_CHANNELS.includes(body.channel as ClinicMessageChannel)
        ? body.channel as ClinicMessageChannel
        : existingMessageDraft.channel
      const purpose = CLINIC_MESSAGE_PURPOSES.includes(body.purpose as ClinicMessagePurpose)
        ? body.purpose as ClinicMessagePurpose
        : existingMessageDraft.purpose
      const status = CLINIC_MESSAGE_STATUSES.includes(body.messageStatus as ClinicMessageStatus)
        ? body.messageStatus as ClinicMessageStatus
        : existingMessageDraft.status
      const subject = typeof body.subject === 'string' ? safeText(body.subject, 500) : existingMessageDraft.subject
      const response = await fetch(baseUrl(), {
        method: 'PATCH',
        headers: headers(),
        cache: 'no-store',
        body: JSON.stringify({
          records: [{
            id: recordId,
            fields: {
              [F.NOTE]: encodeClinicMessageDraft({ channel, purpose, status, subject, body: messageBody }),
              [F.FOLLOWUP_REQUIRED]: false,
            },
          }],
          typecast: true,
        }),
      })
      if (!response.ok) return NextResponse.json({ ok: false, error: 'update_failed' }, { status: 500 })
      return NextResponse.json({ ok: true, updated: true })
    }

    const existing = decodeClinicFollowup(current.fields?.[F.NOTE])
    if (!existing) return NextResponse.json({ ok: false, error: 'not_structured_followup' }, { status: 400 })

    const action = safeText(body.action) || existing.action
    const priority = CLINIC_FOLLOWUP_PRIORITIES.includes(body.priority as ClinicFollowupPriority)
      ? body.priority as ClinicFollowupPriority
      : existing.priority
    const status = CLINIC_FOLLOWUP_STATUSES.includes(body.status as ClinicFollowupStatus)
      ? body.status as ClinicFollowupStatus
      : existing.status
    const followupDate = safeText(body.followupDate, 20)
    const fields: Record<string, unknown> = {
      [F.NOTE]: encodeClinicFollowup({ action, priority, status }),
      [F.FOLLOWUP_REQUIRED]: clinicFollowupIsPending(status),
    }
    if (followupDate) fields[F.FOLLOWUP_DATE] = followupDate

    const response = await fetch(baseUrl(), {
      method: 'PATCH',
      headers: headers(),
      cache: 'no-store',
      body: JSON.stringify({ records: [{ id: recordId, fields }], typecast: true }),
    })
    if (!response.ok) return NextResponse.json({ ok: false, error: 'update_failed' }, { status: 500 })
    return NextResponse.json({ ok: true, updated: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FORBIDDEN'
    const status = message === 'NOT_FOUND' ? 404 : message === 'UNAUTHENTICATED' ? 401 : 403
    return NextResponse.json({ ok: false }, { status })
  }
}
