import { NextRequest, NextResponse } from 'next/server'
import { getActor, getOwnPatient, requireCapability } from '@/lib/auth'

const PREVIEW_BRANCH = 'myaq-ent-p5-1-extended-ai-live-canary'
const TABLE_ID = 'tblSrSHrgmqTHyQzq'

const F = {
  PROFILE_KEY: 'fldDtD7YGjXOe0cOK',
  PATIENT_ID: 'fldeqDBVGEWUyomlx',
  SUBJECT_ID: 'fldkw93taB4kxrgSx',
  VERSION: 'fldZXQ4HDJmffMZ5o',
  STATUS: 'fldX0EEQ91GllIuuh',
  LANGUAGE: 'fldFSYg7MIfcBrGSW',
  HEALTH: 'fldRywkEy9ZGEaZXI',
  OTHER_HEALTH: 'fldfEDQrA3tZUeYzU',
  ALLERGIES: 'fldLwsAdYRcZeGMwv',
  MEDICATIONS: 'fld9NnPy6DPS6E9M4',
  MEDICATION_UNCERTAIN: 'fld8GMTU5wrTw5rNP',
  MEALS_PER_DAY: 'fld3P13T09s9BiENL',
  BREAKFAST: 'fldPeI9DvJAsWdDgI',
  FIRST_MEAL: 'fldzpRTvAXkd67QBB',
  SECOND_MEAL: 'fldSJnJmkimi8HBDY',
  LAST_MEAL: 'fldr0qhYh1Ku4jvwR',
  EATING_PATTERN: 'fld6qswPn2zNBCRAl',
  PROTEINS: 'fld4ZjN01aIbXDtXs',
  OTHER_PROTEIN: 'fld4sQTJ2RXf7LpJs',
  VEGETABLES: 'fldjTzydG7Te7TCH7',
  CARBS: 'flduKV9BjwXBoEy8h',
  OTHER_CARB: 'fldr4osjDJJdft33x',
  FAVORITE_DISH: 'fld59sIPBJFKIkdOr',
  DISLIKED_FOODS: 'fldwGNbXN9QCgXZQA',
  HARDEST_FOOD: 'fld6br1MjRgieZqEE',
  CRAVING: 'fldV8aqFALjNZ7Z4A',
  OTHER_CRAVING: 'fldxafdyGjM2yrJ6G',
  DRINKS: 'fldJPMz9L8WRggdvZ',
  OTHER_DRINK: 'fldj0Q9FRBn4WrjHh',
  MEAL_PREPARER: 'fldoIkH5tHheJRfcR',
  COOKING_TIME: 'fldzKzACzzfbTjAlN',
  RESTAURANT_FREQUENCY: 'fldtC5hIIgzllxaoz',
  RESTAURANT_TYPES: 'fldmGMc5CqPXaBGLf',
  MEAL_STRUCTURE: 'fldQlnQGwnS0UlmIB',
  PLAN_STYLE: 'fldH5IEJTsGhAXm1o',
  GOALS: 'fldCkXbqUn5NJFTSD',
  OTHER_GOAL: 'fldFYV5TounHAIm04',
  NOTES: 'fldtc5BqAc1SGViTf',
  COMPLETED_AT: 'flddNXQjhsGjIMCmz',
  UPDATED_AT: 'fldIaZrunaHL68ZXn',
  PREVIEW_ONLY: 'fld3HEYS6bhCSdFsM',
} as const

function previewOnly() {
  return process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF === PREVIEW_BRANCH
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

function escapeFormula(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 4000) : ''
}

function list(value: unknown, max = 20) {
  return Array.isArray(value)
    ? value.filter(item => typeof item === 'string').map(item => String(item).trim()).filter(Boolean).slice(0, max)
    : []
}

async function findRecord(profileKey: string) {
  const params = new URLSearchParams({
    maxRecords: '1',
    filterByFormula: `{Profile Key} = "${escapeFormula(profileKey)}"`,
    returnFieldsByFieldId: 'true',
  })
  const response = await fetch(`${baseUrl()}?${params}`, { headers: headers(), cache: 'no-store' })
  if (!response.ok) throw new Error('nutrition_profile_read_failed')
  const data = await response.json()
  return data.records?.[0] ?? null
}

function profileFromFields(fields: Record<string, unknown>) {
  return {
    language: fields[F.LANGUAGE] ?? '',
    healthConstraints: fields[F.HEALTH] ?? [],
    otherHealthCondition: fields[F.OTHER_HEALTH] ?? '',
    allergies: fields[F.ALLERGIES] ?? '',
    medications: fields[F.MEDICATIONS] ?? '',
    medicationUncertain: fields[F.MEDICATION_UNCERTAIN] === true,
    mealsPerDay: fields[F.MEALS_PER_DAY] ?? '',
    breakfast: fields[F.BREAKFAST] ?? '',
    firstMealTime: fields[F.FIRST_MEAL] ?? '',
    secondMealTime: fields[F.SECOND_MEAL] ?? '',
    lastMealTime: fields[F.LAST_MEAL] ?? '',
    eatingPattern: fields[F.EATING_PATTERN] ?? '',
    proteins: fields[F.PROTEINS] ?? [],
    otherProtein: fields[F.OTHER_PROTEIN] ?? '',
    vegetables: fields[F.VEGETABLES] ?? '',
    carbs: fields[F.CARBS] ?? [],
    otherCarb: fields[F.OTHER_CARB] ?? '',
    favoriteDish: fields[F.FAVORITE_DISH] ?? '',
    dislikedFoods: fields[F.DISLIKED_FOODS] ?? '',
    hardestFood: fields[F.HARDEST_FOOD] ?? '',
    craving: fields[F.CRAVING] ?? '',
    otherCraving: fields[F.OTHER_CRAVING] ?? '',
    drinks: fields[F.DRINKS] ?? [],
    otherDrink: fields[F.OTHER_DRINK] ?? '',
    mealPreparer: fields[F.MEAL_PREPARER] ?? '',
    cookingTime: fields[F.COOKING_TIME] ?? '',
    restaurantFrequency: fields[F.RESTAURANT_FREQUENCY] ?? '',
    restaurantTypes: fields[F.RESTAURANT_TYPES] ?? '',
    mealStructure: fields[F.MEAL_STRUCTURE] ?? '',
    planStyle: fields[F.PLAN_STYLE] ?? '',
    goals: fields[F.GOALS] ?? [],
    otherGoal: fields[F.OTHER_GOAL] ?? '',
    notes: fields[F.NOTES] ?? '',
    updatedAt: fields[F.UPDATED_AT] ?? null,
  }
}

export async function GET() {
  if (!previewOnly()) return NextResponse.json({ ok: false }, { status: 404 })

  await requireCapability('portal:read:self')
  const patient = await getOwnPatient()
  const profileKey = `${patient.id}:v1`
  const record = await findRecord(profileKey)

  return NextResponse.json({
    ok: true,
    profile: record ? profileFromFields(record.fields ?? {}) : null,
  })
}

export async function POST(request: NextRequest) {
  if (!previewOnly()) return NextResponse.json({ ok: false }, { status: 404 })

  const actor = await requireCapability('profile:write:self')
  const patient = await getOwnPatient()
  const authenticatedActor = await getActor()
  if (!authenticatedActor || actor.clerkUserId !== authenticatedActor.clerkUserId) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  const body = await request.json()
  const profileKey = `${patient.id}:v1`
  const now = new Date().toISOString()

  const fields: Record<string, unknown> = {
    [F.PROFILE_KEY]: profileKey,
    [F.PATIENT_ID]: patient.id,
    [F.SUBJECT_ID]: actor.clerkUserId,
    [F.VERSION]: 1,
    [F.STATUS]: 'Completed',
    [F.LANGUAGE]: body.language === 'English' ? 'English' : 'Español',
    [F.HEALTH]: list(body.healthConstraints),
    [F.OTHER_HEALTH]: text(body.otherHealthCondition),
    [F.ALLERGIES]: text(body.allergies),
    [F.MEDICATIONS]: text(body.medications),
    [F.MEDICATION_UNCERTAIN]: body.medicationUncertain === true,
    [F.MEALS_PER_DAY]: text(body.mealsPerDay),
    [F.BREAKFAST]: text(body.breakfast),
    [F.FIRST_MEAL]: text(body.firstMealTime),
    [F.SECOND_MEAL]: text(body.secondMealTime),
    [F.LAST_MEAL]: text(body.lastMealTime),
    [F.EATING_PATTERN]: text(body.eatingPattern),
    [F.PROTEINS]: list(body.proteins),
    [F.OTHER_PROTEIN]: text(body.otherProtein),
    [F.VEGETABLES]: text(body.vegetables),
    [F.CARBS]: list(body.carbs),
    [F.OTHER_CARB]: text(body.otherCarb),
    [F.FAVORITE_DISH]: text(body.favoriteDish),
    [F.DISLIKED_FOODS]: text(body.dislikedFoods),
    [F.HARDEST_FOOD]: text(body.hardestFood),
    [F.CRAVING]: text(body.craving),
    [F.OTHER_CRAVING]: text(body.otherCraving),
    [F.DRINKS]: list(body.drinks),
    [F.OTHER_DRINK]: text(body.otherDrink),
    [F.MEAL_PREPARER]: text(body.mealPreparer),
    [F.COOKING_TIME]: text(body.cookingTime),
    [F.RESTAURANT_FREQUENCY]: text(body.restaurantFrequency),
    [F.RESTAURANT_TYPES]: text(body.restaurantTypes),
    [F.MEAL_STRUCTURE]: text(body.mealStructure),
    [F.PLAN_STYLE]: text(body.planStyle),
    [F.GOALS]: list(body.goals, 2),
    [F.OTHER_GOAL]: text(body.otherGoal),
    [F.NOTES]: text(body.notes),
    [F.COMPLETED_AT]: now,
    [F.UPDATED_AT]: now,
    [F.PREVIEW_ONLY]: true,
  }

  const existing = await findRecord(profileKey)
  const method = existing ? 'PATCH' : 'POST'
  const payload = existing
    ? { records: [{ id: existing.id, fields }], typecast: true }
    : { records: [{ fields }], typecast: true }

  const response = await fetch(baseUrl(), {
    method,
    headers: headers(),
    body: JSON.stringify(payload),
    cache: 'no-store',
  })
  if (!response.ok) {
    console.error('[nutrition-profile-preview] save_failed', { status: response.status })
    return NextResponse.json({ ok: false, error: 'save_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, saved: true, updatedAt: now })
}
