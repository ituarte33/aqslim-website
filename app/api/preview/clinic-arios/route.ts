import { NextRequest, NextResponse } from 'next/server'
import { requireActor } from '@/lib/auth'
import { isClinicFounderIdentity, isClinicPreviewEnvironment } from '@/lib/clinic-preview-policy'

function clinicEnvironment() {
  return {
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
  }
}

function extractText(data: any): string {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim()
  const parts: string[] = []
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (typeof content?.text === 'string' && content.text.trim()) parts.push(content.text.trim())
    }
  }
  return parts.join('\n').trim()
}

export async function POST(request: NextRequest) {
  const environment = clinicEnvironment()
  if (!isClinicPreviewEnvironment(environment)) return NextResponse.json({ ok: false }, { status: 404 })

  const actor = await requireActor()
  if (!isClinicFounderIdentity({ email: actor.email, environment })) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 6000) : ''
  if (!message) return NextResponse.json({ ok: false, error: 'message_required' }, { status: 400 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ ok: false, error: 'provider_unavailable' }, { status: 503 })

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_AQ_BUDDY_MODEL || 'gpt-5.6-luna',
      instructions: [
        'You are ARIOS inside AQSLIM Clinic Preview, assisting the Founder with clinic operations.',
        'Be calm, precise, concise, strategic, and operational.',
        'Help with workflow, follow-up, consultation preparation, notes organization, patient communication drafts, and identifying unanswered operational questions.',
        'Do not claim access to patient records, consultation notes, messages, plans, or other Clinic data unless those facts are explicitly included in the user message or provided by the application context.',
        'Do not diagnose, prescribe, or replace licensed medical advice. When a question depends on clinical facts not provided, say what information is missing.',
        'Respond in the language used by the Founder.',
      ].join(' '),
      input: message,
      max_output_tokens: 800,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    console.error('[clinic-arios-preview] provider_failed', { status: response.status })
    return NextResponse.json({ ok: false, error: 'provider_failed' }, { status: 502 })
  }

  const data = await response.json()
  const text = extractText(data)
  if (!text) return NextResponse.json({ ok: false, error: 'empty_response' }, { status: 502 })

  return NextResponse.json({ ok: true, text })
}
