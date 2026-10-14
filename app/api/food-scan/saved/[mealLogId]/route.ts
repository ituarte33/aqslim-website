import { auth } from '@clerk/nextjs/server'
import Anthropic from '@anthropic-ai/sdk'
import { getActor } from '@/lib/auth'
import { getMealLogForUser, updateUnconfirmedMealLogEstimate } from '@/lib/airtable'
import { evaluateAiEntitlementAccess } from '@/lib/ai-entitlement-access'
import { isP5FounderCanaryIdentity } from '@/lib/p5-founder-canary-policy'
import {
  getPreviewReanalysisUsage,
  recordPreviewReanalysisCompleted,
  REANALYSIS_LIMIT_PER_MEAL,
} from '@/lib/preview-reanalysis-store'
import { parseMealCorrection, parseMealPortion, applyMealPortion } from '@/lib/meal-entry'
import { isFoodAnalysisConsistent, normalizeFoodAnalysisMath, parseFoodAnalysis } from '@/lib/food-analysis'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = process.env.ANTHROPIC_FOOD_SCAN_MODEL ?? 'claude-haiku-4-5-20251001'

function canUseFounderSavedEditor(email: string) {
  return isP5FounderCanaryIdentity({
    email,
    environment: {
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
      MYAQ_P5_FOUNDER_CANARY: process.env.MYAQ_P5_FOUNDER_CANARY,
    },
  })
}

async function requireSavedEditorAccess(mealLogId: string) {
  const { userId } = await auth()
  if (!userId || !/^rec[A-Za-z0-9]{14}$/.test(mealLogId)) return null

  const actor = await getActor()
  if (!actor || actor.clerkUserId !== userId || !canUseFounderSavedEditor(actor.email)) return null

  const access = await evaluateAiEntitlementAccess({
    clerkUserId: actor.clerkUserId,
    capability: 'food_scan:reanalyze',
    currentAccessAllowed: true,
    rawPlan: actor.rawPlan,
    hasPilotAccess: actor.shadowPilotFeatures !== null,
    pilotFeatures: actor.shadowPilotFeatures ?? undefined,
    authenticatedPatientRecordId: actor.boundPatientId,
  })
  if (!access.allowed || !access.p3Gate.enforced || access.p3Gate.tier !== 'clinic_ai') return null

  const log = await getMealLogForUser(mealLogId, userId)
  if (!log) return null
  return { userId, actor, log }
}

function portionFromNotes(notes: string): number {
  const match = notes.match(/(?:Porción registrada|Portion logged):\s*(\d+)%/i)
  const parsed = match?.[1] ? Number(match[1]) : 100
  return Number.isInteger(parsed) && parsed >= 10 && parsed <= 100 ? parsed : 100
}

function portionMentionFromCorrection(value: string): number | null {
  const patterns = [
    /(?:consum(?:ir|iré|ire|o)|comer(?:é|e|emos)?|voy\s+a\s+comer|porci[oó]n|serving|consume|eat)[^.!?\n]{0,60}?(\d{1,3})\s*%/i,
    /(\d{1,3})\s*%[^.!?\n]{0,60}?(?:de\s+(?:la\s+)?porci[oó]n|del\s+plato|of\s+(?:the\s+)?(?:portion|serving|plate))/i,
  ]

  for (const pattern of patterns) {
    const match = value.match(pattern)
    const parsed = match?.[1] ? Number(match[1]) : NaN
    if (Number.isInteger(parsed) && parsed >= 10 && parsed <= 100) return parsed
  }
  return null
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mealLogId: string }> },
) {
  const { mealLogId } = await params
  const context = await requireSavedEditorAccess(mealLogId)
  if (!context) return Response.json({ error: 'not_found' }, { status: 404 })

  const { log, userId } = context
  const usage = await getPreviewReanalysisUsage(userId, mealLogId)
  const notes = log.fields['Notes'] ?? ''

  return Response.json({
    mealLogId,
    food: log.fields['Food Description'] ?? '—',
    calories: log.fields['Calories'] ?? 0,
    carbs: log.fields['Carbs (g)'] ?? 0,
    fats: log.fields['Fats (g)'] ?? 0,
    proteins: log.fields['Proteins (g)'] ?? 0,
    notes,
    mealType: log.fields['Meal Type'] ?? 'Other',
    consumptionStatus: log.fields['Consumption Status'] ?? 'Unconfirmed',
    portionPercent: portionFromNotes(notes),
    reanalysisUsed: usage.used,
    reanalysisLimit: REANALYSIS_LIMIT_PER_MEAL,
    reanalysisRemaining: usage.remaining,
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ mealLogId: string }> },
) {
  const { mealLogId } = await params
  const context = await requireSavedEditorAccess(mealLogId)
  if (!context) return Response.json({ error: 'not_found' }, { status: 404 })

  const { log, userId } = context
  if ((log.fields['Consumption Status'] ?? 'Unconfirmed') !== 'Unconfirmed') {
    return Response.json({ error: 'not_found_or_confirmed' }, { status: 409 })
  }

  let body: { correction?: unknown; portionPercent?: unknown; language?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  const correction = parseMealCorrection(body.correction)
  const portionPercent = parseMealPortion(body.portionPercent ?? 100)
  const language = body.language === 'en' ? 'en' : 'es'
  if (!correction || !portionPercent) return Response.json({ error: 'invalid_correction' }, { status: 400 })

  const mentionedPortionPercent = portionMentionFromCorrection(correction)
  if (mentionedPortionPercent !== null) {
    return Response.json({
      error: 'portion_instruction_in_text',
      mentionedPortionPercent,
      selectedPortionPercent: portionPercent,
    }, { status: 409 })
  }

  const usage = await getPreviewReanalysisUsage(userId, mealLogId)
  if (!usage.allowed) {
    return Response.json({
      error: 'reanalysis_limit_reached',
      reanalysisUsed: usage.used,
      reanalysisLimit: usage.limit,
      reanalysisRemaining: usage.remaining,
    }, { status: 429 })
  }

  const prior = {
    food: log.fields['Food Description'] ?? '',
    calories: log.fields['Calories'] ?? 0,
    carbs: log.fields['Carbs (g)'] ?? 0,
    fats: log.fields['Fats (g)'] ?? 0,
    proteins: log.fields['Proteins (g)'] ?? 0,
    notes: log.fields['Notes'] ?? '',
  }
  const responseLanguage = language === 'es' ? 'Spanish' : 'English'

  let raw = ''
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      messages: [{
        role: 'user',
        content: `You are correcting a previously saved AQ Buddy meal estimate. The member correction is authoritative meal data: ${JSON.stringify(correction)}. The previous saved estimate is context only: ${JSON.stringify(prior)}. Do not invent ingredients that conflict with the member correction. Reconstruct the COMPLETE corrected plate first; the application will apply ${portionPercent}% afterward. Return ONLY valid JSON with food, calories, carbs, fats, proteins, notes, and ingredients. Each ingredient must contain name, calories, carbs, fats, proteins. Use 4 kcal/g carbs, 9 kcal/g fat, 4 kcal/g protein and cross-check totals. Write food, ingredient names, and notes in ${responseLanguage}.`,
      }],
    })
    raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
  } catch (error) {
    console.error('[saved-scan-correction] provider_failed', {
      mealLogId,
      errorType: error instanceof Error ? error.name : 'unknown',
    })
    return Response.json({ error: 'provider_unavailable' }, { status: 502 })
  }

  const parsed = parseFoodAnalysis(raw)
  const complete = parsed && isFoodAnalysisConsistent(parsed)
    ? parsed
    : parsed
      ? normalizeFoodAnalysisMath(parsed)
      : null
  if (!complete || !isFoodAnalysisConsistent(complete)) {
    return Response.json({ error: 'analysis_format_invalid' }, { status: 502 })
  }

  const portioned = applyMealPortion(complete, portionPercent)
  const sourceNote = language === 'es'
    ? `Fuente: corrección del usuario sobre escaneo guardado; no se reutilizó la fotografía original. Porción registrada: ${portionPercent}% de la porción completa corregida.`
    : `Source: member correction of a saved scan; the original photo was not reused. Portion logged: ${portionPercent}% of the complete corrected serving.`
  const notes = `${portioned.notes} ${sourceNote}`.trim()

  const updated = await updateUnconfirmedMealLogEstimate(mealLogId, userId, {
    foodDescription: portioned.food,
    calories: portioned.calories,
    carbs: portioned.carbs,
    fats: portioned.fats,
    proteins: portioned.proteins,
    notes,
  })
  if (!updated) return Response.json({ error: 'not_found_or_confirmed' }, { status: 409 })

  let recorded = {
    used: usage.used + 1,
    limit: usage.limit,
    remaining: Math.max(0, usage.remaining - 1),
  }
  try {
    recorded = await recordPreviewReanalysisCompleted(userId, mealLogId)
  } catch (error) {
    console.error('[saved-scan-correction] reanalysis_audit_degraded', {
      mealLogId,
      errorType: error instanceof Error ? error.name : 'unknown',
    })
  }

  return Response.json({
    mealLogId,
    food: portioned.food,
    calories: portioned.calories,
    carbs: portioned.carbs,
    fats: portioned.fats,
    proteins: portioned.proteins,
    notes,
    portionPercent,
    consumptionStatus: 'Unconfirmed',
    reanalysisUsed: recorded.used,
    reanalysisLimit: recorded.limit,
    reanalysisRemaining: recorded.remaining,
  })
}
