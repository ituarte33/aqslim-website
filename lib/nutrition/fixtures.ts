import type {
  CompletionComponent,
  LocalizedText,
  MealSlot,
  NutritionProfile,
  NutritionTotals,
  PortionBand,
  RecipeVariant,
} from './types'

const text = (es: string, en: string): LocalizedText => ({ es, en })
const totals = (calories: number, proteinG: number, fatG: number, netCarbsG: number): NutritionTotals => ({
  calories,
  proteinG,
  fatG,
  netCarbsG,
})

function recipe({
  id,
  familyId,
  name,
  portion,
  slots,
  band,
  conditional = false,
  minutes,
  ingredients,
  allergens = [],
  nutrition,
}: {
  id: string
  familyId: string
  name: LocalizedText
  portion: LocalizedText
  slots: readonly MealSlot[]
  band: PortionBand
  conditional?: boolean
  minutes: number
  ingredients: readonly string[]
  allergens?: readonly string[]
  nutrition: NutritionTotals
}): RecipeVariant {
  return {
    id,
    familyId,
    source: 'synthetic_fixture',
    status: 'approved',
    active: true,
    name,
    portion,
    phase: 'Jing',
    slots,
    band,
    conditional,
    minutes,
    ingredients,
    allergens,
    totals: nutrition,
  }
}

const FIRST: readonly MealSlot[] = ['first_meal']
const FIRST_OR_LUNCH: readonly MealSlot[] = ['first_meal', 'lunch']
const MAIN: readonly MealSlot[] = ['lunch', 'dinner']

export const JING_RECIPE_VARIANTS: readonly RecipeVariant[] = [
  recipe({
    id: 'PIL-J01-L', familyId: 'PIL-J01', name: text('Omelette a la mexicana', 'Mexican-style omelet'),
    portion: text('2 huevos, queso pequeño y 1 cucharadita de aceite', '2 eggs, a small cheese portion, and 1 teaspoon oil'),
    slots: FIRST, band: 'L', minutes: 12, ingredients: ['egg', 'oaxaca cheese', 'tomato', 'onion', 'jalapeño', 'olive oil'],
    allergens: ['egg', 'dairy'], nutrition: totals(257, 17.4, 19, 2.9),
  }),
  recipe({
    id: 'PIL-J01-E', familyId: 'PIL-J01', name: text('Omelette a la mexicana', 'Mexican-style omelet'),
    portion: text('3 huevos, queso pequeño y 1 cucharadita de aceite', '3 eggs, a small cheese portion, and 1 teaspoon oil'),
    slots: FIRST, band: 'E', minutes: 12, ingredients: ['egg', 'oaxaca cheese', 'tomato', 'onion', 'jalapeño', 'olive oil'],
    allergens: ['egg', 'dairy'], nutrition: totals(359, 25.9, 26, 3.5),
  }),
  recipe({
    id: 'PIL-J02-L', familyId: 'PIL-J02', name: text('Atún fresco con pepino', 'Fresh tuna and cucumber'),
    portion: text('1 lata de atún, pepino y 1 cucharada de mayonesa', '1 can tuna, cucumber, and 1 tablespoon mayonnaise'),
    slots: FIRST_OR_LUNCH, band: 'L', minutes: 8, ingredients: ['tuna', 'cucumber', 'mayonnaise'],
    allergens: ['fish', 'egg'], nutrition: totals(230, 23.7, 12.5, 4.2),
  }),
  recipe({
    id: 'PIL-J02-E', familyId: 'PIL-J02', name: text('Atún fresco con pepino', 'Fresh tuna and cucumber'),
    portion: text('1½ latas de atún, pepino y 2 cucharadas de mayonesa', '1½ cans tuna, cucumber, and 2 tablespoons mayonnaise'),
    slots: FIRST_OR_LUNCH, band: 'E', minutes: 8, ingredients: ['tuna', 'cucumber', 'mayonnaise'],
    allergens: ['fish', 'egg'], nutrition: totals(404, 39, 24.5, 4.4),
  }),
  recipe({
    id: 'PIL-J03-L', familyId: 'PIL-J03', name: text('Fajitas de pollo', 'Chicken fajitas'),
    portion: text('1½ palmas de pollo con pimiento y cebolla', '1½ palms chicken with bell pepper and onion'),
    slots: MAIN, band: 'L', minutes: 22, ingredients: ['chicken', 'bell pepper', 'onion', 'olive oil'],
    nutrition: totals(330, 47.9, 10.7, 6.2),
  }),
  recipe({
    id: 'PIL-J03-E', familyId: 'PIL-J03', name: text('Fajitas de pollo', 'Chicken fajitas'),
    portion: text('2 palmas de pollo con pimiento y cebolla', '2 palms chicken with bell pepper and onion'),
    slots: MAIN, band: 'E', minutes: 22, ingredients: ['chicken', 'bell pepper', 'onion', 'olive oil'],
    nutrition: totals(456, 63.4, 17.5, 6.2),
  }),
  recipe({
    id: 'PIL-J03-M', familyId: 'PIL-J03', name: text('Fajitas de pollo', 'Chicken fajitas'),
    portion: text('2½ palmas de pollo con pimiento y cebolla', '2½ palms chicken with bell pepper and onion'),
    slots: MAIN, band: 'M', conditional: true, minutes: 22, ingredients: ['chicken', 'bell pepper', 'onion', 'olive oil'],
    nutrition: totals(574, 78.9, 23.3, 6.2),
  }),
  recipe({
    id: 'PIL-J04-E', familyId: 'PIL-J04', name: text('Bistec a la mexicana', 'Mexican-style steak'),
    portion: text('1½ palmas de bistec con tomate, cebolla y chile', '1½ palms steak with tomato, onion, and chile'),
    slots: MAIN, band: 'E', minutes: 24, ingredients: ['sirloin', 'tomato', 'onion', 'jalapeño', 'olive oil'],
    nutrition: totals(384, 44.8, 19.7, 3.7),
  }),
  recipe({
    id: 'PIL-J04-M', familyId: 'PIL-J04', name: text('Bistec a la mexicana', 'Mexican-style steak'),
    portion: text('2½ palmas de bistec con tomate, cebolla y chile', '2½ palms steak with tomato, onion, and chile'),
    slots: MAIN, band: 'M', conditional: true, minutes: 24, ingredients: ['sirloin', 'tomato', 'onion', 'jalapeño', 'olive oil'],
    nutrition: totals(676, 74.1, 38.4, 3.7),
  }),
  recipe({
    id: 'PIL-J05-L', familyId: 'PIL-J05', name: text('Tilapia con espinaca', 'Tilapia with spinach'),
    portion: text('1½ palmas de tilapia con espinaca', '1½ palms tilapia with spinach'),
    slots: MAIN, band: 'L', minutes: 20, ingredients: ['tilapia', 'spinach', 'olive oil'],
    allergens: ['fish'], nutrition: totals(283, 47, 9.9, 1.3),
  }),
  recipe({
    id: 'PIL-J05-E', familyId: 'PIL-J05', name: text('Tilapia con espinaca', 'Tilapia with spinach'),
    portion: text('2 palmas de tilapia con espinaca', '2 palms tilapia with spinach'),
    slots: MAIN, band: 'E', minutes: 20, ingredients: ['tilapia', 'spinach', 'olive oil'],
    allergens: ['fish'], nutrition: totals(473, 67.9, 22, 1.3),
  }),
  recipe({
    id: 'PIL-J05-M', familyId: 'PIL-J05', name: text('Tilapia con espinaca', 'Tilapia with spinach'),
    portion: text('3 palmas de tilapia con espinaca', '3 palms tilapia with spinach'),
    slots: MAIN, band: 'M', conditional: true, minutes: 20, ingredients: ['tilapia', 'spinach', 'olive oil'],
    allergens: ['fish'], nutrition: totals(580, 91.5, 23.4, 1.3),
  }),
  recipe({
    id: 'PIL-J06-L', familyId: 'PIL-J06', name: text('Cerdo con nopales', 'Pork with nopales'),
    portion: text('1½ palmas de cerdo con 1 taza de nopales', '1½ palms pork with 1 cup nopales'),
    slots: MAIN, band: 'L', minutes: 25, ingredients: ['pork', 'nopales', 'olive oil'],
    nutrition: totals(334, 43.6, 14.2, 3.4),
  }),
  recipe({
    id: 'PIL-J06-E', familyId: 'PIL-J06', name: text('Cerdo con nopales', 'Pork with nopales'),
    portion: text('2 palmas de cerdo con 1 taza de nopales', '2 palms pork with 1 cup nopales'),
    slots: MAIN, band: 'E', minutes: 25, ingredients: ['pork', 'nopales', 'olive oil'],
    nutrition: totals(465, 57.4, 22.2, 3.4),
  }),
  recipe({
    id: 'PIL-J06-M', familyId: 'PIL-J06', name: text('Cerdo con nopales', 'Pork with nopales'),
    portion: text('2½ palmas de cerdo con 1 taza de nopales', '2½ palms pork with 1 cup nopales'),
    slots: MAIN, band: 'M', conditional: true, minutes: 25, ingredients: ['pork', 'nopales', 'olive oil'],
    nutrition: totals(587, 71.2, 29.3, 3.4),
  }),
  recipe({
    id: 'PIL-J07-L', familyId: 'PIL-J07', name: text('Pollo con coliflor', 'Chicken with cauliflower'),
    portion: text('1½ palmas de pollo con coliflor dorada', '1½ palms chicken with browned cauliflower'),
    slots: MAIN, band: 'L', minutes: 24, ingredients: ['chicken', 'cauliflower', 'olive oil'],
    nutrition: totals(349, 50, 11.6, 6),
  }),
  recipe({
    id: 'PIL-J07-E', familyId: 'PIL-J07', name: text('Pollo con coliflor', 'Chicken with cauliflower'),
    portion: text('2 palmas de pollo con coliflor dorada', '2 palms chicken with browned cauliflower'),
    slots: MAIN, band: 'E', minutes: 24, ingredients: ['chicken', 'cauliflower', 'olive oil'],
    nutrition: totals(476, 65.5, 18.4, 6),
  }),
  recipe({
    id: 'PIL-J07-M', familyId: 'PIL-J07', name: text('Pollo con coliflor', 'Chicken with cauliflower'),
    portion: text('2½ palmas de pollo con coliflor dorada', '2½ palms chicken with browned cauliflower'),
    slots: MAIN, band: 'M', conditional: true, minutes: 24, ingredients: ['chicken', 'cauliflower', 'olive oil'],
    nutrition: totals(594, 81, 24.2, 6),
  }),
  recipe({
    id: 'PIL-J08-E', familyId: 'PIL-J08', name: text('Hamburguesa al plato', 'Bunless burger plate'),
    portion: text('1½ palmas de carne con lechuga y tomate', '1½ palms beef with lettuce and tomato'),
    slots: MAIN, band: 'E', minutes: 20, ingredients: ['ground beef', 'romaine', 'tomato'],
    nutrition: totals(454, 40.8, 28.5, 4.8),
  }),
  recipe({
    id: 'PIL-J08-M', familyId: 'PIL-J08', name: text('Hamburguesa al plato', 'Bunless burger plate'),
    portion: text('2½ palmas de carne con lechuga y tomate', '2½ palms beef with lettuce and tomato'),
    slots: MAIN, band: 'M', conditional: true, minutes: 20, ingredients: ['ground beef', 'romaine', 'tomato'],
    nutrition: totals(704, 66.7, 43.9, 4.8),
  }),
]

function component(value: Omit<CompletionComponent, 'source' | 'status' | 'active'>): CompletionComponent {
  return { ...value, source: 'synthetic_fixture', status: 'approved', active: true }
}

const ALL_MAIN_FAMILIES = ['PIL-J03', 'PIL-J04', 'PIL-J05', 'PIL-J06', 'PIL-J07', 'PIL-J08'] as const

export const JING_COMPLETION_COMPONENTS: readonly CompletionComponent[] = [
  component({
    id: 'CT-J01', automatic: true, kind: 'side', name: text('Ensalada con aderezo', 'Dressed salad'),
    portion: text('2 tazas con 1 cucharada de aceite', '2 cups with 1 tablespoon oil'),
    compatibleFamilies: ALL_MAIN_FAMILIES, ingredients: ['romaine', 'cucumber', 'tomato', 'olive oil'], allergens: [],
    totals: totals(158, 1.9, 14.4, 4.8),
  }),
  component({
    id: 'CT-J02', automatic: true, kind: 'side', name: text('Espinaca con queso Oaxaca', 'Spinach with Oaxaca cheese'),
    portion: text('1 taza abundante', '1 generous cup'), compatibleFamilies: ['PIL-J03', 'PIL-J04', 'PIL-J05', 'PIL-J07'],
    ingredients: ['spinach', 'oaxaca cheese', 'olive oil'], allergens: ['dairy'], totals: totals(154, 9.2, 12, 2),
  }),
  component({
    id: 'CT-J03', automatic: true, kind: 'side', name: text('Nopales con queso Oaxaca', 'Nopales with Oaxaca cheese'),
    portion: text('1 taza', '1 cup'), compatibleFamilies: ['PIL-J03', 'PIL-J04', 'PIL-J06', 'PIL-J07'],
    ingredients: ['nopales', 'oaxaca cheese', 'olive oil'], allergens: ['dairy'], totals: totals(156, 8.7, 11.7, 2.6),
  }),
  component({
    id: 'CT-J04', automatic: true, kind: 'protein', name: text('Dos huevos preparados', 'Two prepared eggs'),
    portion: text('2 huevos', '2 eggs'), compatibleFamilies: ['PIL-J04', 'PIL-J08'],
    ingredients: ['egg', 'olive oil'], allergens: ['egg'], totals: totals(187, 12.6, 14.5, 0.7),
  }),
  component({
    id: 'CT-J05', automatic: true, kind: 'dairy', name: text('Queso Oaxaca', 'Oaxaca cheese'),
    portion: text('1 porción pequeña', '1 small portion'), compatibleFamilies: ['PIL-J01', 'PIL-J03', 'PIL-J04', 'PIL-J06', 'PIL-J08'],
    ingredients: ['oaxaca cheese'], allergens: ['dairy'], totals: totals(89, 6.6, 6.6, 0.7),
  }),
  component({
    id: 'CT-J06-CHICKEN', automatic: false, kind: 'protein', name: text('Media palma adicional de pollo', 'Extra half-palm chicken'),
    portion: text('½ palma', '½ palm'), compatibleFamilies: ['PIL-J03', 'PIL-J07'], ingredients: ['chicken'], allergens: [],
    totals: totals(83, 15.5, 1.8, 0),
  }),
  component({
    id: 'CT-J06-SIRLOIN', automatic: false, kind: 'protein', name: text('Media palma adicional de bistec', 'Extra half-palm steak'),
    portion: text('½ palma', '½ palm'), compatibleFamilies: ['PIL-J04'], ingredients: ['sirloin'], allergens: [],
    totals: totals(106, 14.7, 4.8, 0),
  }),
  component({
    id: 'CT-J06-TILAPIA', automatic: false, kind: 'protein', name: text('Media palma adicional de tilapia', 'Extra half-palm tilapia'),
    portion: text('½ palma', '½ palm'), compatibleFamilies: ['PIL-J05'], ingredients: ['tilapia'], allergens: ['fish'],
    totals: totals(64, 13.1, 1.3, 0),
  }),
  component({
    id: 'CT-J06-PORK', automatic: false, kind: 'protein', name: text('Media palma adicional de cerdo', 'Extra half-palm pork'),
    portion: text('½ palma', '½ palm'), compatibleFamilies: ['PIL-J06'], ingredients: ['pork'], allergens: [],
    totals: totals(87, 13.8, 3, 0),
  }),
  component({
    id: 'CT-J06-BEEF', automatic: false, kind: 'protein', name: text('Media palma adicional de carne', 'Extra half-palm beef'),
    portion: text('½ palma', '½ palm'), compatibleFamilies: ['PIL-J08'], ingredients: ['ground beef'], allergens: [],
    totals: totals(125, 13, 7.7, 0),
  }),
  component({
    id: 'CT-J06-TUNA', automatic: false, kind: 'protein', name: text('Media palma adicional de atún', 'Extra half-palm tuna'),
    portion: text('½ palma', '½ palm'), compatibleFamilies: ['PIL-J02'], ingredients: ['tuna'], allergens: ['fish'],
    totals: totals(45, 9.5, 0.5, 0),
  }),
  component({
    id: 'CT-J07-TSP', automatic: true, kind: 'fat', name: text('Aceite para cocción', 'Cooking oil'),
    portion: text('1 cucharadita', '1 teaspoon'), compatibleFamilies: ['PIL-J01', 'PIL-J02', ...ALL_MAIN_FAMILIES],
    ingredients: ['olive oil'], allergens: [], totals: totals(44, 0, 5, 0),
  }),
  component({
    id: 'CT-J07-TBSP', automatic: true, kind: 'fat', name: text('Aceite para cocción o aderezo', 'Cooking oil or dressing'),
    portion: text('1 cucharada', '1 tablespoon'), compatibleFamilies: ['PIL-J01', 'PIL-J02', ...ALL_MAIN_FAMILIES],
    ingredients: ['olive oil'], allergens: [], totals: totals(124, 0, 14, 0),
  }),
  component({
    id: 'CT-J08', automatic: false, kind: 'fat', name: text('Aderezo cremoso medido', 'Measured creamy dressing'),
    portion: text('1 cucharada', '1 tablespoon'), compatibleFamilies: ['PIL-J02'], ingredients: ['mayonnaise'], allergens: ['egg'],
    totals: totals(102, 0.1, 11.2, 0.1),
  }),
]

export const SYNTHETIC_GUIDED_PROFILE: NutritionProfile = {
  id: 'SYN-JING-ROM-001',
  firstName: 'Rom',
  language: 'es',
  phase: 'Jing',
  calorieTarget: 1_600,
  mealSlots: ['lunch', 'dinner'],
  preferredFoods: ['sirloin', 'ground beef', 'nopales', 'chicken'],
  dislikedFoods: [],
  excludedFoods: [],
  safetyReviewRequired: false,
}
