import type { GuidedPlan, LocalizedText, MealSlot, PlateOption, PortionBand } from './types'

export const WEEK_LENGTH_DAYS = 7
export const APPROXIMATE_PALM_OUNCES = 4

export type RecipePreference = 'favorite' | 'liked' | 'avoid'
export type RecipePreferenceMap = Readonly<Record<string, RecipePreference | undefined>>

export type WeeklyRotationEntry = {
  dayIndex: number
  slot: MealSlot
  option: PlateOption
}

export type ShoppingCategory = 'protein' | 'produce' | 'refrigerated' | 'pantry'
export type ShoppingUnit = 'ounce' | 'can' | 'egg' | 'bag_5oz' | 'head' | 'heart' | 'piece' | 'cup' | 'tablespoon' | 'pantry_check'

export type ShoppingItem = {
  ingredient: string
  category: ShoppingCategory
  label: LocalizedText
  mealUses: number
  quantity: number
  unit: ShoppingUnit
}

type PurchaseRequirement = Omit<ShoppingItem, 'mealUses'>
type IngredientDefinition = Pick<ShoppingItem, 'category' | 'label'>

const INGREDIENTS: Record<string, IngredientDefinition> = {
  chicken: { category: 'protein', label: { es: 'Pechuga de pollo', en: 'Chicken breast' } },
  egg: { category: 'protein', label: { es: 'Huevos', en: 'Eggs' } },
  'ground beef': { category: 'protein', label: { es: 'Carne molida', en: 'Ground beef' } },
  pork: { category: 'protein', label: { es: 'Lomo de cerdo', en: 'Pork loin' } },
  sirloin: { category: 'protein', label: { es: 'Bistec', en: 'Steak' } },
  tilapia: { category: 'protein', label: { es: 'Tilapia', en: 'Tilapia' } },
  tuna: { category: 'protein', label: { es: 'Atún en agua', en: 'Tuna in water' } },
  'fajita vegetables': { category: 'produce', label: { es: 'Pimiento y cebolla', en: 'Bell pepper and onion' } },
  cauliflower: { category: 'produce', label: { es: 'Coliflor', en: 'Cauliflower' } },
  cucumber: { category: 'produce', label: { es: 'Pepino', en: 'Cucumber' } },
  'mexican vegetables': { category: 'produce', label: { es: 'Tomate, cebolla y chile', en: 'Tomato, onion, and chile' } },
  nopales: { category: 'produce', label: { es: 'Nopales cocidos', en: 'Cooked nopales' } },
  romaine: { category: 'produce', label: { es: 'Lechuga romana', en: 'Romaine lettuce' } },
  spinach: { category: 'produce', label: { es: 'Espinaca fresca', en: 'Fresh spinach' } },
  tomato: { category: 'produce', label: { es: 'Tomate', en: 'Tomato' } },
  'tomato onion mix': { category: 'produce', label: { es: 'Tomate y cebolla', en: 'Tomato and onion' } },
  'oaxaca cheese': { category: 'refrigerated', label: { es: 'Queso Oaxaca', en: 'Oaxaca cheese' } },
  mayonnaise: { category: 'pantry', label: { es: 'Mayonesa', en: 'Mayonnaise' } },
  'olive oil': { category: 'pantry', label: { es: 'Aceite de oliva', en: 'Olive oil' } },
  seasonings: { category: 'pantry', label: { es: 'Ajo, sal, pimienta, limón y especias', en: 'Garlic, salt, pepper, lemon, and spices' } },
}

function requirement(ingredient: string, quantity: number, unit: ShoppingUnit): PurchaseRequirement {
  return { ingredient, quantity, unit, ...INGREDIENTS[ingredient] }
}

function protein(ingredient: string, palms: number) {
  return requirement(ingredient, palms * APPROXIMATE_PALM_OUNCES, 'ounce')
}

function bands(
  low: readonly PurchaseRequirement[],
  standard: readonly PurchaseRequirement[],
  medium: readonly PurchaseRequirement[],
  high: readonly PurchaseRequirement[] = medium,
): Record<PortionBand, readonly PurchaseRequirement[]> {
  return { L: low, E: standard, M: medium, H: high }
}

const RECIPE_REQUIREMENTS: Readonly<Record<string, Record<PortionBand, readonly PurchaseRequirement[]>>> = {
  'PIL-J01': bands(
    [requirement('egg', 2, 'egg'), requirement('oaxaca cheese', 1, 'ounce'), requirement('mexican vegetables', .25, 'cup'), requirement('olive oil', 1 / 3, 'tablespoon')],
    [requirement('egg', 3, 'egg'), requirement('oaxaca cheese', 1, 'ounce'), requirement('mexican vegetables', .25, 'cup'), requirement('olive oil', 1 / 3, 'tablespoon')],
    [requirement('egg', 4, 'egg'), requirement('oaxaca cheese', 1, 'ounce'), requirement('mexican vegetables', 1 / 3, 'cup'), requirement('olive oil', 1 / 3, 'tablespoon')],
  ),
  'PIL-J02': bands(
    [requirement('tuna', 1, 'can'), requirement('cucumber', .5, 'piece'), requirement('mayonnaise', 1, 'tablespoon')],
    [requirement('tuna', 1.5, 'can'), requirement('cucumber', .5, 'piece'), requirement('mayonnaise', 2, 'tablespoon')],
    [requirement('tuna', 2, 'can'), requirement('cucumber', .75, 'piece'), requirement('mayonnaise', 2, 'tablespoon')],
  ),
  'PIL-J03': bands(
    [protein('chicken', 1.5), requirement('fajita vegetables', 1, 'cup'), requirement('olive oil', 1 / 3, 'tablespoon')],
    [protein('chicken', 2), requirement('fajita vegetables', 1, 'cup'), requirement('olive oil', 1, 'tablespoon')],
    [protein('chicken', 2.5), requirement('fajita vegetables', 1.5, 'cup'), requirement('olive oil', 1, 'tablespoon')],
    [protein('chicken', 2.5), requirement('fajita vegetables', 2, 'cup'), requirement('olive oil', 3, 'tablespoon')],
  ),
  'PIL-J04': bands(
    [protein('sirloin', 1.5), requirement('mexican vegetables', .75, 'cup'), requirement('olive oil', 1 / 3, 'tablespoon')],
    [protein('sirloin', 1.5), requirement('mexican vegetables', 1, 'cup'), requirement('olive oil', 1, 'tablespoon')],
    [protein('sirloin', 2.5), requirement('mexican vegetables', 1, 'cup'), requirement('olive oil', 1, 'tablespoon')],
    [protein('sirloin', 2.5), requirement('mexican vegetables', 1.5, 'cup'), requirement('olive oil', 3, 'tablespoon')],
  ),
  'PIL-J05': bands(
    [protein('tilapia', 1.5), requirement('spinach', .6, 'bag_5oz'), requirement('olive oil', 2 / 3, 'tablespoon')],
    [protein('tilapia', 2), requirement('spinach', .6, 'bag_5oz'), requirement('olive oil', 2, 'tablespoon')],
    [protein('tilapia', 3), requirement('spinach', .6, 'bag_5oz'), requirement('olive oil', 2, 'tablespoon')],
    [protein('tilapia', 2.5), requirement('spinach', .8, 'bag_5oz'), requirement('olive oil', 4, 'tablespoon')],
  ),
  'PIL-J06': bands(
    [protein('pork', 1.5), requirement('nopales', 1, 'cup'), requirement('tomato onion mix', .5, 'cup'), requirement('olive oil', 1 / 3, 'tablespoon')],
    [protein('pork', 2), requirement('nopales', 1, 'cup'), requirement('tomato onion mix', .5, 'cup'), requirement('olive oil', 1, 'tablespoon')],
    [protein('pork', 2.5), requirement('nopales', 1, 'cup'), requirement('tomato onion mix', .75, 'cup'), requirement('olive oil', 1, 'tablespoon')],
    [protein('pork', 2.5), requirement('nopales', 1.5, 'cup'), requirement('tomato onion mix', 1, 'cup'), requirement('olive oil', 3, 'tablespoon')],
  ),
  'PIL-J07': bands(
    [protein('chicken', 1.5), requirement('cauliflower', .5, 'head'), requirement('olive oil', 1 / 3, 'tablespoon')],
    [protein('chicken', 2), requirement('cauliflower', .5, 'head'), requirement('olive oil', 1, 'tablespoon')],
    [protein('chicken', 2.5), requirement('cauliflower', .625, 'head'), requirement('olive oil', 1, 'tablespoon')],
    [protein('chicken', 2.5), requirement('cauliflower', .75, 'head'), requirement('olive oil', 3, 'tablespoon')],
  ),
  'PIL-J08': bands(
    [protein('ground beef', 1.5), requirement('romaine', 2 / 3, 'heart'), requirement('tomato', .5, 'piece'), requirement('cucumber', .25, 'piece')],
    [protein('ground beef', 1.5), requirement('romaine', 2 / 3, 'heart'), requirement('tomato', .5, 'piece'), requirement('cucumber', .25, 'piece')],
    [protein('ground beef', 2.5), requirement('romaine', 2 / 3, 'heart'), requirement('tomato', 1, 'piece'), requirement('cucumber', .5, 'piece')],
    [protein('ground beef', 2.5), requirement('romaine', 1, 'heart'), requirement('tomato', 1, 'piece'), requirement('cucumber', .5, 'piece'), requirement('olive oil', 2, 'tablespoon')],
  ),
}

const COMPONENT_REQUIREMENTS: Readonly<Record<string, readonly PurchaseRequirement[]>> = {
  'CT-J01': [requirement('romaine', .5, 'heart'), requirement('cucumber', .25, 'piece'), requirement('tomato', .5, 'piece'), requirement('olive oil', 1, 'tablespoon')],
  'CT-J02': [requirement('spinach', .2, 'bag_5oz'), requirement('oaxaca cheese', 1, 'ounce'), requirement('olive oil', 1 / 3, 'tablespoon')],
  'CT-J03': [requirement('nopales', 1, 'cup'), requirement('oaxaca cheese', 1, 'ounce'), requirement('olive oil', 1 / 3, 'tablespoon')],
  'CT-J04': [requirement('egg', 2, 'egg'), requirement('olive oil', 1 / 3, 'tablespoon')],
  'CT-J05': [requirement('oaxaca cheese', 1, 'ounce')],
  'CT-J06-CHICKEN': [requirement('chicken', 2, 'ounce')],
  'CT-J06-SIRLOIN': [requirement('sirloin', 2, 'ounce')],
  'CT-J06-TILAPIA': [requirement('tilapia', 2, 'ounce')],
  'CT-J06-PORK': [requirement('pork', 2, 'ounce')],
  'CT-J06-BEEF': [requirement('ground beef', 2, 'ounce')],
  'CT-J06-TUNA': [requirement('tuna', .5, 'can')],
  'CT-J07-TSP': [requirement('olive oil', 1 / 3, 'tablespoon')],
  'CT-J07-TBSP': [requirement('olive oil', 1, 'tablespoon')],
  'CT-J07-2TBSP': [requirement('olive oil', 2, 'tablespoon')],
  'CT-J08': [requirement('mayonnaise', 1, 'tablespoon')],
}

const PREFERENCE_PRIORITY: Record<Exclude<RecipePreference, 'avoid'>, number> = { favorite: 2, liked: 1 }

function priority(option: PlateOption, preferences: RecipePreferenceMap) {
  const preference = preferences[option.familyId]
  return preference && preference !== 'avoid' ? PREFERENCE_PRIORITY[preference] : 0
}

export function buildWeeklyRotation(plan: GuidedPlan, preferences: RecipePreferenceMap): WeeklyRotationEntry[] {
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

function optionRequirements(option: PlateOption) {
  return [
    ...(RECIPE_REQUIREMENTS[option.familyId]?.[option.band] ?? []),
    ...option.componentIds.flatMap(id => COMPONENT_REQUIREMENTS[id] ?? []),
  ]
}

export function buildShoppingList(rotation: readonly WeeklyRotationEntry[]): ShoppingItem[] {
  const items = new Map<string, ShoppingItem>()

  for (const entry of rotation) {
    const perMeal = new Map<string, PurchaseRequirement>()
    for (const item of optionRequirements(entry.option)) {
      const key = `${item.ingredient}:${item.unit}`
      const existing = perMeal.get(key)
      perMeal.set(key, existing ? { ...existing, quantity: existing.quantity + item.quantity } : item)
    }
    for (const item of perMeal.values()) {
      const key = `${item.ingredient}:${item.unit}`
      const existing = items.get(key)
      items.set(key, existing
        ? { ...existing, mealUses: existing.mealUses + 1, quantity: existing.quantity + item.quantity }
        : { ...item, mealUses: 1 })
    }
  }

  if (rotation.length > 0) {
    const seasonings = requirement('seasonings', 1, 'pantry_check')
    items.set('seasonings:pantry_check', { ...seasonings, mealUses: rotation.length })
  }

  const categoryOrder: Record<ShoppingCategory, number> = { protein: 0, produce: 1, refrigerated: 2, pantry: 3 }
  return [...items.values()]
    .filter(item => item.mealUses >= 2)
    .toSorted((left, right) => (
      categoryOrder[left.category] - categoryOrder[right.category]
      || right.mealUses - left.mealUses
      || left.ingredient.localeCompare(right.ingredient)
    ))
}

function rounded(value: number, increment = 1) {
  return Math.ceil(value / increment) * increment
}

function decimal(value: number, language: 'es' | 'en') {
  return new Intl.NumberFormat(language === 'es' ? 'es-MX' : 'en-US', { maximumFractionDigits: 2 }).format(value)
}

export function formatShoppingQuantity(item: ShoppingItem, language: 'es' | 'en') {
  const es = language === 'es'
  if (item.unit === 'ounce') {
    if (item.category === 'refrigerated') {
      const packageOunces = rounded(item.quantity, 8)
      const packages = packageOunces / 8
      return es
        ? `${packageOunces} oz · ${packages} paquete${packages === 1 ? '' : 's'} de 8 oz`
        : `${packageOunces} oz · ${packages} 8-oz package${packages === 1 ? '' : 's'}`
    }
    const pounds = rounded(item.quantity, 4) / 16
    return `≈ ${decimal(pounds, language)} lb`
  }
  if (item.unit === 'can') {
    const cans = rounded(item.quantity)
    return es ? `${cans} lata${cans === 1 ? '' : 's'}` : `${cans} can${cans === 1 ? '' : 's'}`
  }
  if (item.unit === 'egg') {
    const eggs = rounded(item.quantity, 6)

    if (eggs % 12 === 0) {
      const dozens = eggs / 12
      return es ? `${eggs} huevos · ${dozens} docena${dozens === 1 ? '' : 's'}` : `${eggs} eggs · ${dozens} dozen`
    }

    return es ? `${eggs} huevos · paquete de ${eggs}` : `${eggs} eggs · ${eggs}-count carton`
  }
  if (item.unit === 'bag_5oz') {
    const bags = rounded(item.quantity)
    return es ? `${bags} bolsa${bags === 1 ? '' : 's'} de 5 oz` : `${bags} 5-oz bag${bags === 1 ? '' : 's'}`
  }
  if (item.unit === 'head') {
    const heads = rounded(item.quantity)
    return es ? `${heads} cabeza${heads === 1 ? '' : 's'} mediana${heads === 1 ? '' : 's'}` : `${heads} medium head${heads === 1 ? '' : 's'}`
  }
  if (item.unit === 'heart') {
    const hearts = rounded(item.quantity)
    return es ? `${hearts} ${hearts === 1 ? 'corazón' : 'corazones'} de lechuga` : `${hearts} romaine heart${hearts === 1 ? '' : 's'}`
  }
  if (item.unit === 'piece') {
    const pieces = rounded(item.quantity)
    return es ? `${pieces} pieza${pieces === 1 ? '' : 's'}` : `${pieces} piece${pieces === 1 ? '' : 's'}`
  }
  if (item.unit === 'cup') {
    const cups = rounded(item.quantity, .25)
    return es ? `${decimal(cups, language)} tazas` : `${decimal(cups, language)} cups`
  }
  if (item.unit === 'tablespoon') {
    const tablespoons = rounded(item.quantity)
    const containerOunces = rounded(tablespoons / 2, 8)
    return es ? `${tablespoons} cucharadas · envase de ${containerOunces} oz` : `${tablespoons} tablespoons · ${containerOunces}-oz container`
  }
  return es ? 'Revisar existencias antes de comprar' : 'Check pantry before buying'
}
