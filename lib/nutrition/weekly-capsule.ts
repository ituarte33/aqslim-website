import type { GuidedPlan, MealSlot, PlateOption } from './types'

export const WEEK_LENGTH_DAYS = 7

export type RecipePreference = 'favorite' | 'liked' | 'avoid'
export type RecipePreferenceMap = Readonly<Record<string, RecipePreference | undefined>>

export type WeeklyRotationEntry = {
  dayIndex: number
  slot: MealSlot
  option: PlateOption
}

export type ShoppingCategory = 'protein' | 'produce' | 'refrigerated' | 'pantry'

export type ShoppingItem = {
  ingredient: string
  category: ShoppingCategory
  label: { es: string; en: string }
  mealUses: number
}

const INGREDIENTS: Record<string, Omit<ShoppingItem, 'ingredient' | 'mealUses'>> = {
  chicken: { category: 'protein', label: { es: 'Pechuga de pollo', en: 'Chicken breast' } },
  egg: { category: 'protein', label: { es: 'Huevos', en: 'Eggs' } },
  'ground beef': { category: 'protein', label: { es: 'Carne molida', en: 'Ground beef' } },
  pork: { category: 'protein', label: { es: 'Lomo de cerdo', en: 'Pork loin' } },
  sirloin: { category: 'protein', label: { es: 'Bistec', en: 'Steak' } },
  tilapia: { category: 'protein', label: { es: 'Tilapia', en: 'Tilapia' } },
  tuna: { category: 'protein', label: { es: 'Atún en agua', en: 'Tuna in water' } },
  'bell pepper': { category: 'produce', label: { es: 'Pimiento', en: 'Bell pepper' } },
  cauliflower: { category: 'produce', label: { es: 'Coliflor', en: 'Cauliflower' } },
  cucumber: { category: 'produce', label: { es: 'Pepino', en: 'Cucumber' } },
  jalapeño: { category: 'produce', label: { es: 'Chile jalapeño', en: 'Jalapeño' } },
  nopales: { category: 'produce', label: { es: 'Nopales', en: 'Nopales' } },
  onion: { category: 'produce', label: { es: 'Cebolla', en: 'Onion' } },
  romaine: { category: 'produce', label: { es: 'Lechuga romana', en: 'Romaine lettuce' } },
  spinach: { category: 'produce', label: { es: 'Espinaca', en: 'Spinach' } },
  tomato: { category: 'produce', label: { es: 'Tomate', en: 'Tomato' } },
  'oaxaca cheese': { category: 'refrigerated', label: { es: 'Queso Oaxaca', en: 'Oaxaca cheese' } },
  mayonnaise: { category: 'pantry', label: { es: 'Mayonesa', en: 'Mayonnaise' } },
  'olive oil': { category: 'pantry', label: { es: 'Aceite de oliva', en: 'Olive oil' } },
}

const PREFERENCE_PRIORITY: Record<Exclude<RecipePreference, 'avoid'>, number> = {
  favorite: 2,
  liked: 1,
}

function priority(option: PlateOption, preferences: RecipePreferenceMap) {
  const preference = preferences[option.familyId]
  return preference && preference !== 'avoid' ? PREFERENCE_PRIORITY[preference] : 0
}

export function buildWeeklyRotation(
  plan: GuidedPlan,
  preferences: RecipePreferenceMap,
): WeeklyRotationEntry[] {
  if (plan.status !== 'ready_for_review') return []

  return plan.groups.flatMap(group => {
    const included = group.options.filter(option => preferences[option.familyId] !== 'avoid')
    const ranked = included
      .map((option, originalIndex) => ({ option, originalIndex }))
      .toSorted((left, right) => (
        priority(right.option, preferences) - priority(left.option, preferences)
        || left.originalIndex - right.originalIndex
      ))

    if (ranked.length === 0) return []

    return Array.from({ length: WEEK_LENGTH_DAYS }, (_, dayIndex) => ({
      dayIndex,
      slot: group.slot,
      option: ranked[dayIndex % ranked.length].option,
    }))
  })
}

export function rotationFrequency(rotation: readonly WeeklyRotationEntry[]) {
  const counts: Record<string, number> = {}
  for (const entry of rotation) {
    const key = weeklyRotationKey(entry.slot, entry.option.id)
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

export function weeklyRotationKey(slot: MealSlot, optionId: string) {
  return `${slot}:${optionId}`
}

export function buildShoppingList(rotation: readonly WeeklyRotationEntry[]): ShoppingItem[] {
  const uses = new Map<string, number>()

  for (const entry of rotation) {
    for (const ingredient of new Set(entry.option.ingredients)) {
      uses.set(ingredient, (uses.get(ingredient) ?? 0) + 1)
    }
  }

  const categoryOrder: Record<ShoppingCategory, number> = {
    protein: 0,
    produce: 1,
    refrigerated: 2,
    pantry: 3,
  }

  return [...uses]
    .map(([ingredient, mealUses]): ShoppingItem => ({
      ingredient,
      mealUses,
      ...(INGREDIENTS[ingredient] ?? {
        category: 'pantry' as const,
        label: { es: ingredient, en: ingredient },
      }),
    }))
    .filter(item => item.mealUses >= 2)
    .toSorted((left, right) => (
      categoryOrder[left.category] - categoryOrder[right.category]
      || right.mealUses - left.mealUses
      || left.ingredient.localeCompare(right.ingredient)
    ))
}
