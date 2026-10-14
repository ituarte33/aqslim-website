import type { RecipePreference, RecipePreferenceMap } from './weekly-capsule'

const STORAGE_PREFIX = 'myaq-preview-recipe-preferences'
const STORAGE_VERSION = 1

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

type StoredRecipePreferences = {
  version: typeof STORAGE_VERSION
  preferences: Record<string, RecipePreference>
}

function isRecipePreference(value: unknown): value is RecipePreference {
  return value === 'favorite' || value === 'liked' || value === 'avoid'
}

export function recipePreferenceStorageKey(profileId: string) {
  return `${STORAGE_PREFIX}:v${STORAGE_VERSION}:${profileId.trim().toLowerCase()}`
}

export function parseStoredRecipePreferences(
  rawValue: string | null,
  allowedFamilyIds: readonly string[],
): RecipePreferenceMap {
  if (!rawValue) return {}

  try {
    const stored = JSON.parse(rawValue) as Partial<StoredRecipePreferences>
    if (stored.version !== STORAGE_VERSION || !stored.preferences || typeof stored.preferences !== 'object') {
      return {}
    }

    const allowed = new Set(allowedFamilyIds)
    const preferences: Record<string, RecipePreference> = {}
    for (const [familyId, preference] of Object.entries(stored.preferences)) {
      if (allowed.has(familyId) && isRecipePreference(preference)) preferences[familyId] = preference
    }
    return preferences
  } catch {
    return {}
  }
}

export function loadRecipePreferences(
  storage: StorageLike,
  profileId: string,
  allowedFamilyIds: readonly string[],
) {
  try {
    return parseStoredRecipePreferences(storage.getItem(recipePreferenceStorageKey(profileId)), allowedFamilyIds)
  } catch {
    return {}
  }
}

export function saveRecipePreferences(
  storage: StorageLike,
  profileId: string,
  preferences: RecipePreferenceMap,
) {
  const key = recipePreferenceStorageKey(profileId)
  const compact = Object.fromEntries(
    Object.entries(preferences).filter((entry): entry is [string, RecipePreference] => isRecipePreference(entry[1])),
  )

  try {
    if (Object.keys(compact).length === 0) storage.removeItem(key)
    else storage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, preferences: compact } satisfies StoredRecipePreferences))
    return true
  } catch {
    return false
  }
}
