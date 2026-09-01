import assert from 'node:assert/strict'
import test from 'node:test'
import {
  loadRecipePreferences,
  parseStoredRecipePreferences,
  recipePreferenceStorageKey,
  saveRecipePreferences,
} from '../lib/nutrition/recipe-preference-storage.ts'

class MemoryStorage {
  private values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

test('scopes synthetic recipe preferences by profile and schema version', () => {
  assert.equal(recipePreferenceStorageKey('SYN-JING-SOFIA-1800'), 'myaq-preview-recipe-preferences:v1:syn-jing-sofia-1800')
  assert.notEqual(recipePreferenceStorageKey('SYN-JING-SOFIA-1800'), recipePreferenceStorageKey('SYN-JING-ROM-001'))
})

test('persists and restores only valid recipe families and preferences', () => {
  const storage = new MemoryStorage()
  assert.equal(saveRecipePreferences(storage, 'SYN-JING-SOFIA-1800', {
    'PIL-J04': 'favorite',
    'PIL-J05': 'avoid',
  }), true)

  assert.deepEqual(loadRecipePreferences(storage, 'SYN-JING-SOFIA-1800', ['PIL-J04', 'PIL-J05']), {
    'PIL-J04': 'favorite',
    'PIL-J05': 'avoid',
  })
  assert.deepEqual(loadRecipePreferences(storage, 'SYN-JING-ROM-001', ['PIL-J04', 'PIL-J05']), {})
})

test('rejects stale, malformed, unknown, and invalid stored values', () => {
  assert.deepEqual(parseStoredRecipePreferences('{', ['PIL-J04']), {})
  assert.deepEqual(parseStoredRecipePreferences(JSON.stringify({
    version: 2,
    preferences: { 'PIL-J04': 'favorite' },
  }), ['PIL-J04']), {})
  assert.deepEqual(parseStoredRecipePreferences(JSON.stringify({
    version: 1,
    preferences: { 'PIL-J04': 'favorite', 'PIL-J99': 'liked', 'PIL-J05': 'allergy' },
  }), ['PIL-J04', 'PIL-J05']), { 'PIL-J04': 'favorite' })
})

test('removes empty preference state instead of storing an empty payload', () => {
  const storage = new MemoryStorage()
  saveRecipePreferences(storage, 'SYN-JING-SOFIA-1800', { 'PIL-J04': 'liked' })
  saveRecipePreferences(storage, 'SYN-JING-SOFIA-1800', {})
  assert.equal(storage.getItem(recipePreferenceStorageKey('SYN-JING-SOFIA-1800')), null)
})
