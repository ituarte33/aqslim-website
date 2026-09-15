import 'server-only'

const TABLE_ID = 'tblSrSHrgmqTHyQzq'
const BASE_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`

export const NUTRITION_PROFILE_FIELDS = {
  PROFILE_KEY: 'fldDtD7YGjXOe0cOK',
  PATIENT_RECORD_ID: 'fldeqDBVGEWUyomlx',
  SUBJECT_ID: 'fldkw93taB4kxrgSx',
  PROFILE_VERSION: 'fldZXQ4HDJmffMZ5o',
  STATUS: 'fldX0EEQ91GllIuuh',
  LANGUAGE: 'fldFSYg7MIfcBrGSW',
  HEALTH_CONSTRAINTS: 'fldRywkEy9ZGEaZXI',
  OTHER_HEALTH_CONDITION: 'fldfEDQrA3tZUeYzU',
  ALLERGIES: 'fldLwsAdYRcZeGMwv',
  MEDICATIONS: 'fld9NnPy6DPS6E9M4',
  MEDICATION_UNCERTAIN: 'fld8GMTU5wrTw5rNP',
  MEALS_PER_DAY: 'fld3P13T09s9BiENL',
  BREAKFAST: 'fldPeI9DvJAsWdDgI',
  FIRST_MEAL_TIME: 'fldzpRTvAXkd67QBB',
  SECOND_MEAL_TIME: 'fldSJnJmkimi8HBDY',
  LAST_MEAL_TIME: 'fldr0qhYh1Ku4jvwR',
  EATING_PATTERN: 'fld6qswPn2zNBCRAl',
  PROTEINS: 'fld4ZjN01aIbXDtXs',
  VEGETABLES: 'fldjTzydG7Te7TCH7',
  CARBS: 'flduKV9BjwXBoEy8h',
  FAVORITE_DISH: 'fld59sIPBJFKIkdOr',
  DISLIKED_FOODS: 'fldwGNbXN9QCgXZQA',
  HARDEST_FOOD: 'fld6br1MjRgieZqEE',
  CRAVING: 'fldV8aqFALjNZ7Z4A',
  DRINKS: 'fldJPMz9L8WRggdvZ',
  MEAL_PREPARER: 'fldoIkH5tHheJRfcR',
  COOKING_TIME: 'fldzKzACzzfbTjAlN',
  RESTAURANT_FREQUENCY: 'fldtC5hIIgzllxaoz',
  RESTAURANT_TYPES: 'fldmGMc5CqPXaBGLf',
  MEAL_STRUCTURE: 'fldQlnQGwnS0UlmIB',
  PLAN_STYLE: 'fldH5IEJTsGhAXm1o',
  GOALS: 'fldCkXbqUn5NJFTSD',
  NOTES: 'fldtc5BqAc1SGViTf',
  COMPLETED_AT: 'flddNXQjhsGjIMCmz',
  LAST_UPDATED_AT: 'fldIaZrunaHL68ZXn',
  PREVIEW_ONLY: 'fld3HEYS6bhCSdFsM',
} as const

export type NutritionProfilePreview = {
  recordId?: string
  profileKey: string
  patientRecordId: string
  subjectId: string
  language: 'Español' | 'English'
  healthConstraints: string[]
  otherHealthCondition: string
  allergies: string
  medications: string
  medicationUncertain: boolean
  mealsPerDay: string
  breakfast: string
  firstMealTime: string
  secondMealTime: string
  lastMealTime: string
  eatingPattern: string
  proteins: string[]
  vegetables: string
  carbs: string[]
  favoriteDish: string
  dislikedFoods: string
  hardestFood: string
  craving: string
  drinks: string[]
  mealPreparer: string
  cookingTime: string
  restaurantFrequency: string
  restaurantTypes: string
  mealStructure: string
  planStyle: string
  goals: string[]
  notes: string
}

function assertPreviewOnly() {
  if (process.env.VERCEL_ENV === 'production') {
    throw new Error('Nutrition profile Preview storage is disabled in Production')
  }
}

async function airtableRequest(path: string, options?: RequestInit) {
  assertPreviewOnly()
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_PAT}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('Nutrition profile Preview storage failed')
  return response.json()
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function cleanArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function fromRecord(record: { id: string; fields: Record<string, unknown> }): NutritionProfilePreview {
  const f = record.fields
  return {
    recordId: record.id,
    profileKey: cleanText(f[NUTRITION_PROFILE_FIELDS.PROFILE_KEY]),
    patientRecordId: cleanText(f[NUTRITION_PROFILE_FIELDS.PATIENT_RECORD_ID]),
    subjectId: cleanText(f[NUTRITION_PROFILE_FIELDS.SUBJECT_ID]),
    language: cleanText(f[NUTRITION_PROFILE_FIELDS.LANGUAGE]) === 'English' ? 'English' : 'Español',
    healthConstraints: cleanArray(f[NUTRITION_PROFILE_FIELDS.HEALTH_CONSTRAINTS]),
    otherHealthCondition: cleanText(f[NUTRITION_PROFILE_FIELDS.OTHER_HEALTH_CONDITION]),
    allergies: cleanText(f[NUTRITION_PROFILE_FIELDS.ALLERGIES]),
    medications: cleanText(f[NUTRITION_PROFILE_FIELDS.MEDICATIONS]),
    medicationUncertain: Boolean(f[NUTRITION_PROFILE_FIELDS.MEDICATION_UNCERTAIN]),
    mealsPerDay: cleanText(f[NUTRITION_PROFILE_FIELDS.MEALS_PER_DAY]),
    breakfast: cleanText(f[NUTRITION_PROFILE_FIELDS.BREAKFAST]),
    firstMealTime: cleanText(f[NUTRITION_PROFILE_FIELDS.FIRST_MEAL_TIME]),
    secondMealTime: cleanText(f[NUTRITION_PROFILE_FIELDS.SECOND_MEAL_TIME]),
    lastMealTime: cleanText(f[NUTRITION_PROFILE_FIELDS.LAST_MEAL_TIME]),
    eatingPattern: cleanText(f[NUTRITION_PROFILE_FIELDS.EATING_PATTERN]),
    proteins: cleanArray(f[NUTRITION_PROFILE_FIELDS.PROTEINS]),
    vegetables: cleanText(f[NUTRITION_PROFILE_FIELDS.VEGETABLES]),
    carbs: cleanArray(f[NUTRITION_PROFILE_FIELDS.CARBS]),
    favoriteDish: cleanText(f[NUTRITION_PROFILE_FIELDS.FAVORITE_DISH]),
    dislikedFoods: cleanText(f[NUTRITION_PROFILE_FIELDS.DISLIKED_FOODS]),
    hardestFood: cleanText(f[NUTRITION_PROFILE_FIELDS.HARDEST_FOOD]),
    craving: cleanText(f[NUTRITION_PROFILE_FIELDS.CRAVING]),
    drinks: cleanArray(f[NUTRITION_PROFILE_FIELDS.DRINKS]),
    mealPreparer: cleanText(f[NUTRITION_PROFILE_FIELDS.MEAL_PREPARER]),
    cookingTime: cleanText(f[NUTRITION_PROFILE_FIELDS.COOKING_TIME]),
    restaurantFrequency: cleanText(f[NUTRITION_PROFILE_FIELDS.RESTAURANT_FREQUENCY]),
    restaurantTypes: cleanText(f[NUTRITION_PROFILE_FIELDS.RESTAURANT_TYPES]),
    mealStructure: cleanText(f[NUTRITION_PROFILE_FIELDS.MEAL_STRUCTURE]),
    planStyle: cleanText(f[NUTRITION_PROFILE_FIELDS.PLAN_STYLE]),
    goals: cleanArray(f[NUTRITION_PROFILE_FIELDS.GOALS]),
    notes: cleanText(f[NUTRITION_PROFILE_FIELDS.NOTES]),
  }
}

export async function getNutritionProfilePreview(patientRecordId: string): Promise<NutritionProfilePreview | null> {
  const profileKey = `${patientRecordId}:v1`
  const params = new URLSearchParams({
    maxRecords: '1',
    filterByFormula: `{Profile Key}="${profileKey.replace(/"/g, '\\"')}"`,
    returnFieldsByFieldId: 'true',
  })
  const data = await airtableRequest(`/${TABLE_ID}?${params}`)
  const record = data.records?.[0]
  return record ? fromRecord(record) : null
}

export async function saveNutritionProfilePreview(profile: NutritionProfilePreview): Promise<void> {
  const now = new Date().toISOString()
  const fields: Record<string, unknown> = {
    [NUTRITION_PROFILE_FIELDS.PROFILE_KEY]: profile.profileKey,
    [NUTRITION_PROFILE_FIELDS.PATIENT_RECORD_ID]: profile.patientRecordId,
    [NUTRITION_PROFILE_FIELDS.SUBJECT_ID]: profile.subjectId,
    [NUTRITION_PROFILE_FIELDS.PROFILE_VERSION]: 1,
    [NUTRITION_PROFILE_FIELDS.STATUS]: 'Completed',
    [NUTRITION_PROFILE_FIELDS.LANGUAGE]: profile.language,
    [NUTRITION_PROFILE_FIELDS.HEALTH_CONSTRAINTS]: profile.healthConstraints,
    [NUTRITION_PROFILE_FIELDS.OTHER_HEALTH_CONDITION]: profile.otherHealthCondition,
    [NUTRITION_PROFILE_FIELDS.ALLERGIES]: profile.allergies,
    [NUTRITION_PROFILE_FIELDS.MEDICATIONS]: profile.medications,
    [NUTRITION_PROFILE_FIELDS.MEDICATION_UNCERTAIN]: profile.medicationUncertain,
    [NUTRITION_PROFILE_FIELDS.MEALS_PER_DAY]: profile.mealsPerDay,
    [NUTRITION_PROFILE_FIELDS.BREAKFAST]: profile.breakfast,
    [NUTRITION_PROFILE_FIELDS.FIRST_MEAL_TIME]: profile.firstMealTime,
    [NUTRITION_PROFILE_FIELDS.SECOND_MEAL_TIME]: profile.secondMealTime,
    [NUTRITION_PROFILE_FIELDS.LAST_MEAL_TIME]: profile.lastMealTime,
    [NUTRITION_PROFILE_FIELDS.EATING_PATTERN]: profile.eatingPattern,
    [NUTRITION_PROFILE_FIELDS.PROTEINS]: profile.proteins,
    [NUTRITION_PROFILE_FIELDS.VEGETABLES]: profile.vegetables,
    [NUTRITION_PROFILE_FIELDS.CARBS]: profile.carbs,
    [NUTRITION_PROFILE_FIELDS.FAVORITE_DISH]: profile.favoriteDish,
    [NUTRITION_PROFILE_FIELDS.DISLIKED_FOODS]: profile.dislikedFoods,
    [NUTRITION_PROFILE_FIELDS.HARDEST_FOOD]: profile.hardestFood,
    [NUTRITION_PROFILE_FIELDS.CRAVING]: profile.craving,
    [NUTRITION_PROFILE_FIELDS.DRINKS]: profile.drinks,
    [NUTRITION_PROFILE_FIELDS.MEAL_PREPARER]: profile.mealPreparer,
    [NUTRITION_PROFILE_FIELDS.COOKING_TIME]: profile.cookingTime,
    [NUTRITION_PROFILE_FIELDS.RESTAURANT_FREQUENCY]: profile.restaurantFrequency,
    [NUTRITION_PROFILE_FIELDS.RESTAURANT_TYPES]: profile.restaurantTypes,
    [NUTRITION_PROFILE_FIELDS.MEAL_STRUCTURE]: profile.mealStructure,
    [NUTRITION_PROFILE_FIELDS.PLAN_STYLE]: profile.planStyle,
    [NUTRITION_PROFILE_FIELDS.GOALS]: profile.goals,
    [NUTRITION_PROFILE_FIELDS.NOTES]: profile.notes,
    [NUTRITION_PROFILE_FIELDS.COMPLETED_AT]: now,
    [NUTRITION_PROFILE_FIELDS.LAST_UPDATED_AT]: now,
    [NUTRITION_PROFILE_FIELDS.PREVIEW_ONLY]: true,
  }

  const current = await getNutritionProfilePreview(profile.patientRecordId)
  if (current?.recordId) {
    await airtableRequest(`/${TABLE_ID}/${current.recordId}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields, typecast: true }),
    })
    return
  }

  await airtableRequest(`/${TABLE_ID}`, {
    method: 'POST',
    body: JSON.stringify({ records: [{ fields }], typecast: true }),
  })
}
