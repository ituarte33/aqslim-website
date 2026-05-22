import { auth, currentUser } from '@clerk/nextjs/server'
import Anthropic from '@anthropic-ai/sdk'
import { countTodayScans, createMealLog, getMealLogsSince, type MealType } from '@/lib/airtable'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SCAN_LIMITS: Record<string, number> = {
  free: 1,
  mid:  3,
  top:  100,
}

function todayPT(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user  = await currentUser()
  const plan  = (user?.privateMetadata?.plan as string | undefined) ?? 'free'
  const email = user?.emailAddresses[0]?.emailAddress ?? ''
  const limit = SCAN_LIMITS[plan] ?? 1
  const today = todayPT()

  let used: number
  try {
    used = await countTodayScans(userId, today)
  } catch {
    // Can't verify count — deny to prevent bypass on infra errors
    return Response.json({ error: 'limit_reached', used: limit, limit }, { status: 429 })
  }
  if (used >= limit) {
    return Response.json({ error: 'limit_reached', used, limit }, { status: 429 })
  }

  const { imageBase64, mimeType, mealType } = await req.json() as {
    imageBase64: string
    mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    mealType?: MealType
  }
  if (!imageBase64 || !mimeType) {
    return Response.json({ error: 'image_required' }, { status: 400 })
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
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
            text: `You are a nutrition analysis AI. Analyze this food image and return ONLY valid JSON with no markdown or extra text:
{
  "food": "concise food name",
  "calories": number,
  "carbs": number,
  "fats": number,
  "proteins": number,
  "notes": "brief note on serving size assumptions or estimation confidence"
}
All numeric values are integers representing grams (carbs/fats/proteins) or kcal (calories) for the visible portion.`,
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

  await createMealLog({
    userId,
    userEmail:       email,
    date:            today,
    foodDescription: result.food,
    calories:        result.calories,
    carbs:           result.carbs,
    fats:            result.fats,
    proteins:        result.proteins,
    plan,
    notes:           result.notes,
    mealType,
  })

  return Response.json({
    ...result,
    used:      used + 1,
    limit,
    remaining: limit - used - 1,
  })
}

// GET — return today's usage + monthly logs for period filtering
export async function GET() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user  = await currentUser()
  const plan  = (user?.privateMetadata?.plan as string | undefined) ?? 'free'
  const limit = SCAN_LIMITS[plan] ?? 1
  const today = todayPT()

  const [y, m, d] = today.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()
  const weekStart  = new Date(Date.UTC(y, m - 1, d - (dow === 0 ? 6 : dow - 1), 12)).toISOString().slice(0, 10)
  const monthStart = `${today.slice(0, 7)}-01`

  const [used, logs] = await Promise.all([
    countTodayScans(userId, today),
    getMealLogsSince(userId, monthStart, 200),
  ])

  return Response.json({ used, limit, remaining: limit - used, plan, today, weekStart, monthStart, logs })
}
