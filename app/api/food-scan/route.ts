import { auth, currentUser } from '@clerk/nextjs/server'
import Anthropic from '@anthropic-ai/sdk'
import { countScansBetween, createMealLog, getMealLogsSince, type MealType } from '@/lib/airtable'
import {
  evaluateFoodScanUsage,
  foodScanPeriodBoundaries,
  foodScanPolicyFor,
} from '@/lib/food-scan-policy'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const FOOD_SCAN_MODEL = process.env.ANTHROPIC_FOOD_SCAN_MODEL ?? 'claude-haiku-4-5-20251001'
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const MAX_BASE64_LENGTH = 7_000_000

function todayPT(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user  = await currentUser()
  const policy = foodScanPolicyFor(user?.privateMetadata?.plan)
  const email = user?.emailAddresses[0]?.emailAddress ?? ''
  const today = todayPT()
  const boundaries = foodScanPeriodBoundaries(today)

  let dailyUsed: number
  let monthlyUsed: number
  try {
    ;[dailyUsed, monthlyUsed] = await Promise.all([
      countScansBetween(userId, boundaries.dayStartUtc, boundaries.dayEndUtc),
      countScansBetween(userId, boundaries.monthStartUtc, boundaries.monthEndUtc),
    ])
  } catch {
    // Can't verify count — deny to prevent bypass on infra errors
    return Response.json({
      error: 'usage_unavailable',
      used: policy.dailyLimit,
      limit: policy.dailyLimit,
      monthlyUsed: policy.monthlyLimit,
      monthlyLimit: policy.monthlyLimit,
    }, { status: 503 })
  }
  const decision = evaluateFoodScanUsage(policy, dailyUsed, monthlyUsed)
  if (!decision.allowed) {
    return Response.json({
      error: 'limit_reached',
      period: decision.reason === 'monthly_limit' ? 'month' : 'day',
      used: dailyUsed,
      limit: policy.dailyLimit,
      monthlyUsed,
      monthlyLimit: policy.monthlyLimit,
    }, { status: 429 })
  }

  const { imageBase64, mimeType, mealType } = await req.json() as {
    imageBase64: string
    mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    mealType?: MealType
  }
  if (!imageBase64 || !mimeType) {
    return Response.json({ error: 'image_required' }, { status: 400 })
  }
  if (!ALLOWED_IMAGE_TYPES.has(mimeType) || imageBase64.length > MAX_BASE64_LENGTH) {
    return Response.json({ error: 'invalid_image' }, { status: 400 })
  }

  const message = await client.messages.create({
    model: FOOD_SCAN_MODEL,
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `You are the image-analysis component used by AQ Buddy. Estimate the visible serving only. Do not imply laboratory or label-level precision. Analyze this food image and return ONLY valid JSON with no markdown or extra text:
{
  "food": "concise food name",
  "calories": number,
  "carbs": number,
  "fats": number,
  "proteins": number,
  "notes": "brief note on serving size assumptions or estimation confidence"
}
All numeric values are non-negative integers representing grams (carbs/fats/proteins) or kcal (calories) for the visible portion. The notes must briefly state the key serving-size or ingredient assumptions and that the result is an estimate.`,
          },
        ],
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  let result: { food: string; calories: number; carbs: number; fats: number; proteins: number; notes: string }
  try {
    result = JSON.parse(raw)
  } catch {
    return Response.json({ error: 'parse_failed', raw }, { status: 500 })
  }
  const numericValues = [result.calories, result.carbs, result.fats, result.proteins]
  if (
    typeof result.food !== 'string'
    || typeof result.notes !== 'string'
    || numericValues.some(value => !Number.isFinite(value) || value < 0)
  ) {
    return Response.json({ error: 'invalid_analysis' }, { status: 500 })
  }

  await createMealLog({
    userId,
    userEmail:       email,
    date:            today,
    foodDescription: result.food,
    calories:        result.calories,
    carbs:           result.carbs,
    fats:            result.fats,
    proteins:        result.proteins,
    plan:            policy.plan,
    notes:           result.notes,
    mealType,
  })

  return Response.json({
    ...result,
    used:             dailyUsed + 1,
    limit:            policy.dailyLimit,
    remaining:        Math.max(0, policy.dailyLimit - dailyUsed - 1),
    monthlyUsed:      monthlyUsed + 1,
    monthlyLimit:     policy.monthlyLimit,
    monthlyRemaining: Math.max(0, policy.monthlyLimit - monthlyUsed - 1),
  })
}

// GET — return today's usage + monthly logs for period filtering
export async function GET() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user  = await currentUser()
  const policy = foodScanPolicyFor(user?.privateMetadata?.plan)
  const today = todayPT()
  const boundaries = foodScanPeriodBoundaries(today)

  const [y, m, d] = today.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()
  const weekStart  = new Date(Date.UTC(y, m - 1, d - (dow === 0 ? 6 : dow - 1), 12)).toISOString().slice(0, 10)
  const monthStart = boundaries.monthStart

  const [used, monthlyUsed, logs] = await Promise.all([
    countScansBetween(userId, boundaries.dayStartUtc, boundaries.dayEndUtc),
    countScansBetween(userId, boundaries.monthStartUtc, boundaries.monthEndUtc),
    getMealLogsSince(userId, monthStart, 200),
  ])

  return Response.json({
    used,
    limit: policy.dailyLimit,
    remaining: Math.max(0, policy.dailyLimit - used),
    monthlyUsed,
    monthlyLimit: policy.monthlyLimit,
    monthlyRemaining: Math.max(0, policy.monthlyLimit - monthlyUsed),
    plan: policy.plan,
    today,
    weekStart,
    monthStart,
    logs,
  })
}
