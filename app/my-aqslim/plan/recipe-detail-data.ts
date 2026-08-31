import type { LocalizedText, PortionBand } from '@/lib/nutrition/types'

export type RecipeAllergen = 'dairy' | 'egg' | 'fish'

export type RecipeDetail = {
  image: string
  imageAlt: LocalizedText
  ingredients: Record<PortionBand, readonly LocalizedText[]>
  steps: readonly LocalizedText[]
  substitutions: readonly LocalizedText[]
  allergens: readonly RecipeAllergen[]
}

const text = (es: string, en: string): LocalizedText => ({ es, en })
const bands = (
  low: readonly LocalizedText[],
  standard: readonly LocalizedText[],
  medium: readonly LocalizedText[],
  high: readonly LocalizedText[] = medium,
): Record<PortionBand, readonly LocalizedText[]> => ({ L: low, E: standard, M: medium, H: high })

export const RECIPE_DETAILS: Readonly<Record<string, RecipeDetail>> = {
  'PIL-J01': {
    image: '/images/recipes/omelette-mexicana-v1.webp',
    imageAlt: text('Omelette a la mexicana con tomate, cebolla y chile', 'Mexican-style omelet with tomato, onion, and chile'),
    ingredients: bands(
      [text('2 huevos', '2 eggs'), text('1 porción pequeña de queso Oaxaca', '1 small portion Oaxaca cheese'), text('¼ taza de tomate, cebolla y chile picados', '¼ cup chopped tomato, onion, and chile'), text('1 cucharadita de aceite', '1 teaspoon oil')],
      [text('3 huevos', '3 eggs'), text('1 porción pequeña de queso Oaxaca', '1 small portion Oaxaca cheese'), text('¼ taza de tomate, cebolla y chile picados', '¼ cup chopped tomato, onion, and chile'), text('1 cucharadita de aceite', '1 teaspoon oil')],
      [text('4 huevos', '4 eggs'), text('1 porción pequeña de queso Oaxaca', '1 small portion Oaxaca cheese'), text('⅓ taza de tomate, cebolla y chile picados', '⅓ cup chopped tomato, onion, and chile'), text('1 cucharadita de aceite', '1 teaspoon oil')],
    ),
    steps: [
      text('Bate los huevos con una pizca de sal y pimienta.', 'Beat the eggs with a pinch of salt and pepper.'),
      text('Calienta el aceite y cocina el tomate, la cebolla y el chile durante 2 minutos.', 'Heat the oil and cook the tomato, onion, and chile for 2 minutes.'),
      text('Agrega el huevo y cocina a fuego medio hasta que casi cuaje.', 'Add the eggs and cook over medium heat until almost set.'),
      text('Añade el queso, dobla el omelette y termina la cocción.', 'Add the cheese, fold the omelet, and finish cooking.'),
    ],
    substitutions: [
      text('Queso Oaxaca → queso panela, conservando la porción', 'Oaxaca cheese → panela cheese, keeping the same portion'),
      text('Chile → pimiento verde si no deseas picante', 'Chile → green bell pepper if you do not want heat'),
    ],
    allergens: ['egg', 'dairy'],
  },
  'PIL-J02': {
    image: '/images/recipes/atun-pepino-v1.webp',
    imageAlt: text('Atún cremoso servido con pepino fresco', 'Creamy tuna served with fresh cucumber'),
    ingredients: bands(
      [text('1 lata de atún en agua, escurrida', '1 can tuna in water, drained'), text('1 taza de pepino en medias lunas', '1 cup cucumber half-moons'), text('1 cucharada de mayonesa', '1 tablespoon mayonnaise'), text('Limón, pimienta y hierbas al gusto', 'Lemon, pepper, and herbs to taste')],
      [text('1½ latas de atún en agua, escurridas', '1½ cans tuna in water, drained'), text('1 taza de pepino en medias lunas', '1 cup cucumber half-moons'), text('2 cucharadas de mayonesa', '2 tablespoons mayonnaise'), text('Limón, pimienta y hierbas al gusto', 'Lemon, pepper, and herbs to taste')],
      [text('2 latas de atún en agua, escurridas', '2 cans tuna in water, drained'), text('1½ tazas de pepino en medias lunas', '1½ cups cucumber half-moons'), text('2 cucharadas de mayonesa', '2 tablespoons mayonnaise'), text('Limón, pimienta y hierbas al gusto', 'Lemon, pepper, and herbs to taste')],
    ),
    steps: [
      text('Escurre muy bien el atún y colócalo en un tazón.', 'Drain the tuna thoroughly and place it in a bowl.'),
      text('Mezcla el atún con la mayonesa, unas gotas de limón y pimienta.', 'Mix the tuna with the mayonnaise, a few drops of lemon, and pepper.'),
      text('Corta el pepino en medias lunas.', 'Slice the cucumber into half-moons.'),
      text('Sirve el atún con el pepino y termina con las hierbas.', 'Serve the tuna with the cucumber and finish with the herbs.'),
    ],
    substitutions: [
      text('Atún → salmón en agua, conservando la porción', 'Tuna → salmon in water, keeping the same portion'),
      text('Pepino → apio o calabacita cruda', 'Cucumber → celery or raw zucchini'),
    ],
    allergens: ['fish', 'egg'],
  },
  'PIL-J03': {
    image: '/images/recipes/fajitas-pollo-v1.webp',
    imageAlt: text('Fajitas de pollo con pimientos y cebolla', 'Chicken fajitas with bell peppers and onion'),
    ingredients: bands(
      [text('1½ palmas de pechuga de pollo en tiras', '1½ palms chicken breast strips'), text('1 taza de pimiento y cebolla en tiras', '1 cup sliced bell pepper and onion'), text('1 cucharadita de aceite', '1 teaspoon oil'), text('Ajo, comino, sal y pimienta al gusto', 'Garlic, cumin, salt, and pepper to taste')],
      [text('2 palmas de pechuga de pollo en tiras', '2 palms chicken breast strips'), text('1 taza de pimiento y cebolla en tiras', '1 cup sliced bell pepper and onion'), text('1 cucharada de aceite', '1 tablespoon oil'), text('Ajo, comino, sal y pimienta al gusto', 'Garlic, cumin, salt, and pepper to taste')],
      [text('2½ palmas de pechuga de pollo en tiras', '2½ palms chicken breast strips'), text('1½ tazas de pimiento y cebolla en tiras', '1½ cups sliced bell pepper and onion'), text('1 cucharada de aceite', '1 tablespoon oil'), text('Ajo, comino, sal y pimienta al gusto', 'Garlic, cumin, salt, and pepper to taste')],
      [text('2½ palmas de pechuga de pollo en tiras', '2½ palms chicken breast strips'), text('2 tazas de pimiento y cebolla en tiras', '2 cups sliced bell pepper and onion'), text('3 cucharadas de aceite', '3 tablespoons oil'), text('Ajo, comino, sal y pimienta al gusto', 'Garlic, cumin, salt, and pepper to taste')],
    ),
    steps: [
      text('Sazona el pollo con ajo, comino, sal y pimienta.', 'Season the chicken with garlic, cumin, salt, and pepper.'),
      text('Calienta la mitad del aceite y dora el pollo de 5 a 7 minutos.', 'Heat half the oil and brown the chicken for 5 to 7 minutes.'),
      text('Agrega el pimiento y la cebolla; cocina de 4 a 5 minutos.', 'Add the bell pepper and onion; cook for 4 to 5 minutes.'),
      text('Añade el resto del aceite si corresponde y mezcla antes de servir.', 'Add the remaining oil if applicable and toss before serving.'),
    ],
    substitutions: [
      text('Pollo → pechuga de pavo, conservando la porción', 'Chicken → turkey breast, keeping the same portion'),
      text('Pimiento → calabacita en tiras', 'Bell pepper → sliced zucchini'),
    ],
    allergens: [],
  },
  'PIL-J04': {
    image: '/images/recipes/bistec-mexicana-v1.webp',
    imageAlt: text('Bistec a la mexicana con tomate, cebolla y chile', 'Mexican-style steak with tomato, onion, and chile'),
    ingredients: bands(
      [text('1½ palmas de bistec en tiras', '1½ palms sliced steak'), text('¾ taza de tomate, cebolla y chile picados', '¾ cup chopped tomato, onion, and chile'), text('1 cucharadita de aceite', '1 teaspoon oil'), text('Ajo, sal y pimienta al gusto', 'Garlic, salt, and pepper to taste')],
      [text('1½ palmas de bistec en tiras', '1½ palms sliced steak'), text('1 taza de tomate, cebolla y chile picados', '1 cup chopped tomato, onion, and chile'), text('1 cucharada de aceite', '1 tablespoon oil'), text('Ajo, sal y pimienta al gusto', 'Garlic, salt, and pepper to taste')],
      [text('2½ palmas de bistec en tiras', '2½ palms sliced steak'), text('1 taza de tomate, cebolla y chile picados', '1 cup chopped tomato, onion, and chile'), text('1 cucharada de aceite', '1 tablespoon oil'), text('Ajo, sal y pimienta al gusto', 'Garlic, salt, and pepper to taste')],
      [text('2½ palmas de bistec en tiras', '2½ palms sliced steak'), text('1½ tazas de tomate, cebolla y chile picados', '1½ cups chopped tomato, onion, and chile'), text('3 cucharadas de aceite', '3 tablespoons oil'), text('Ajo, sal y pimienta al gusto', 'Garlic, salt, and pepper to taste')],
    ),
    steps: [
      text('Sazona el bistec con ajo, sal y pimienta.', 'Season the steak with garlic, salt, and pepper.'),
      text('Calienta el aceite a fuego alto y dora el bistec rápidamente.', 'Heat the oil over high heat and quickly brown the steak.'),
      text('Agrega la cebolla y el chile; cocina durante 2 minutos.', 'Add the onion and chile; cook for 2 minutes.'),
      text('Incorpora el tomate y cocina 2 minutos más, sin deshacerlo.', 'Add the tomato and cook for 2 more minutes without breaking it down.'),
    ],
    substitutions: [
      text('Bistec → lomo de cerdo magro, conservando la porción', 'Steak → lean pork loin, keeping the same portion'),
      text('Chile → pimiento verde si no deseas picante', 'Chile → green bell pepper if you do not want heat'),
    ],
    allergens: [],
  },
  'PIL-J05': {
    image: '/images/recipes/tilapia-con-espinaca-v1.webp',
    imageAlt: text('Tilapia dorada servida con espinaca salteada', 'Golden tilapia served with sautéed spinach'),
    ingredients: bands(
      [text('1½ palmas de filete de tilapia', '1½ palms tilapia fillet'), text('3 tazas de espinaca fresca', '3 cups fresh spinach'), text('2 cucharaditas de aceite de oliva', '2 teaspoons olive oil'), text('Ajo, sal, pimienta y limón al gusto', 'Garlic, salt, pepper, and lemon to taste')],
      [text('2 palmas de filete de tilapia', '2 palms tilapia fillet'), text('3 tazas de espinaca fresca', '3 cups fresh spinach'), text('2 cucharadas de aceite de oliva', '2 tablespoons olive oil'), text('Ajo, sal, pimienta y limón al gusto', 'Garlic, salt, pepper, and lemon to taste')],
      [text('3 palmas de filete de tilapia', '3 palms tilapia fillet'), text('3 tazas de espinaca fresca', '3 cups fresh spinach'), text('2 cucharadas de aceite de oliva', '2 tablespoons olive oil'), text('Ajo, sal, pimienta y limón al gusto', 'Garlic, salt, pepper, and lemon to taste')],
      [text('2½ palmas de filete de tilapia', '2½ palms tilapia fillet'), text('4 tazas de espinaca fresca', '4 cups fresh spinach'), text('4 cucharadas de aceite de oliva', '4 tablespoons olive oil'), text('Ajo, sal, pimienta y limón al gusto', 'Garlic, salt, pepper, and lemon to taste')],
    ),
    steps: [
      text('Seca la tilapia y sazónala con ajo, sal, pimienta y unas gotas de limón.', 'Pat the tilapia dry and season it with garlic, salt, pepper, and a few drops of lemon.'),
      text('Calienta la mitad del aceite en un sartén a fuego medio.', 'Heat half of the oil in a skillet over medium heat.'),
      text('Cocina la tilapia de 3 a 4 minutos por lado, hasta que se desmenuce fácilmente.', 'Cook the tilapia for 3 to 4 minutes per side, until it flakes easily.'),
      text('Retira el pescado. Agrega el resto del aceite y cocina la espinaca de 2 a 3 minutos.', 'Remove the fish. Add the remaining oil and cook the spinach for 2 to 3 minutes.'),
    ],
    substitutions: [
      text('Tilapia → bacalao o lenguado, conservando la porción', 'Tilapia → cod or sole, keeping the same portion'),
      text('Espinaca → acelga o calabacita', 'Spinach → chard or zucchini'),
    ],
    allergens: ['fish'],
  },
  'PIL-J06': {
    image: '/images/recipes/cerdo-nopales-v1.webp',
    imageAlt: text('Cerdo dorado con nopales, tomate y cebolla', 'Browned pork with nopales, tomato, and onion'),
    ingredients: bands(
      [text('1½ palmas de lomo de cerdo en cubos', '1½ palms cubed pork loin'), text('1 taza de nopales cocidos', '1 cup cooked nopales'), text('½ taza de tomate y cebolla picados', '½ cup chopped tomato and onion'), text('1 cucharadita de aceite, ajo, sal y pimienta', '1 teaspoon oil, garlic, salt, and pepper')],
      [text('2 palmas de lomo de cerdo en cubos', '2 palms cubed pork loin'), text('1 taza de nopales cocidos', '1 cup cooked nopales'), text('½ taza de tomate y cebolla picados', '½ cup chopped tomato and onion'), text('1 cucharada de aceite, ajo, sal y pimienta', '1 tablespoon oil, garlic, salt, and pepper')],
      [text('2½ palmas de lomo de cerdo en cubos', '2½ palms cubed pork loin'), text('1 taza de nopales cocidos', '1 cup cooked nopales'), text('¾ taza de tomate y cebolla picados', '¾ cup chopped tomato and onion'), text('1 cucharada de aceite, ajo, sal y pimienta', '1 tablespoon oil, garlic, salt, and pepper')],
      [text('2½ palmas de lomo de cerdo en cubos', '2½ palms cubed pork loin'), text('1½ tazas de nopales cocidos', '1½ cups cooked nopales'), text('1 taza de tomate y cebolla picados', '1 cup chopped tomato and onion'), text('3 cucharadas de aceite, ajo, sal y pimienta', '3 tablespoons oil, garlic, salt, and pepper')],
    ),
    steps: [
      text('Enjuaga los nopales cocidos y escúrrelos muy bien.', 'Rinse the cooked nopales and drain them thoroughly.'),
      text('Sazona el cerdo y dóralo en el aceite de 6 a 8 minutos.', 'Season the pork and brown it in the oil for 6 to 8 minutes.'),
      text('Agrega la cebolla y cocina durante 2 minutos.', 'Add the onion and cook for 2 minutes.'),
      text('Incorpora los nopales y el tomate; cocina 3 minutos más.', 'Add the nopales and tomato; cook for 3 more minutes.'),
    ],
    substitutions: [
      text('Cerdo → pechuga de pollo, conservando la porción', 'Pork → chicken breast, keeping the same portion'),
      text('Nopales → calabacita en tiras', 'Nopales → sliced zucchini'),
    ],
    allergens: [],
  },
  'PIL-J07': {
    image: '/images/recipes/pollo-coliflor-v1.webp',
    imageAlt: text('Pollo dorado con floretes de coliflor', 'Golden chicken with cauliflower florets'),
    ingredients: bands(
      [text('1½ palmas de pechuga de pollo', '1½ palms chicken breast'), text('2 tazas de floretes de coliflor', '2 cups cauliflower florets'), text('1 cucharadita de aceite', '1 teaspoon oil'), text('Ajo, sal, pimienta y paprika al gusto', 'Garlic, salt, pepper, and paprika to taste')],
      [text('2 palmas de pechuga de pollo', '2 palms chicken breast'), text('2 tazas de floretes de coliflor', '2 cups cauliflower florets'), text('1 cucharada de aceite', '1 tablespoon oil'), text('Ajo, sal, pimienta y paprika al gusto', 'Garlic, salt, pepper, and paprika to taste')],
      [text('2½ palmas de pechuga de pollo', '2½ palms chicken breast'), text('2½ tazas de floretes de coliflor', '2½ cups cauliflower florets'), text('1 cucharada de aceite', '1 tablespoon oil'), text('Ajo, sal, pimienta y paprika al gusto', 'Garlic, salt, pepper, and paprika to taste')],
      [text('2½ palmas de pechuga de pollo', '2½ palms chicken breast'), text('3 tazas de floretes de coliflor', '3 cups cauliflower florets'), text('3 cucharadas de aceite', '3 tablespoons oil'), text('Ajo, sal, pimienta y paprika al gusto', 'Garlic, salt, pepper, and paprika to taste')],
    ),
    steps: [
      text('Corta el pollo en tiras y sazónalo con ajo, sal, pimienta y paprika.', 'Slice the chicken and season it with garlic, salt, pepper, and paprika.'),
      text('Calienta la mitad del aceite y cocina el pollo hasta dorarlo.', 'Heat half the oil and cook the chicken until golden.'),
      text('Retira el pollo; agrega la coliflor y el resto del aceite.', 'Remove the chicken; add the cauliflower and remaining oil.'),
      text('Cocina la coliflor de 6 a 8 minutos y reincorpora el pollo.', 'Cook the cauliflower for 6 to 8 minutes and return the chicken to the pan.'),
    ],
    substitutions: [
      text('Pollo → pechuga de pavo, conservando la porción', 'Chicken → turkey breast, keeping the same portion'),
      text('Coliflor → brócoli', 'Cauliflower → broccoli'),
    ],
    allergens: [],
  },
  'PIL-J08': {
    image: '/images/recipes/hamburguesa-plato-v1.webp',
    imageAlt: text('Hamburguesa sin pan con lechuga, tomate, cebolla y pepino', 'Bunless burger with lettuce, tomato, onion, and cucumber'),
    ingredients: bands(
      [text('1½ palmas de carne molida formada en hamburguesa', '1½ palms ground beef formed into a patty'), text('2 tazas de lechuga', '2 cups lettuce'), text('½ tomate y ¼ de pepino en rebanadas', '½ tomato and ¼ cucumber, sliced'), text('Cebolla, sal y pimienta al gusto', 'Onion, salt, and pepper to taste')],
      [text('1½ palmas de carne molida formada en hamburguesa', '1½ palms ground beef formed into a patty'), text('2 tazas de lechuga', '2 cups lettuce'), text('½ tomate y ¼ de pepino en rebanadas', '½ tomato and ¼ cucumber, sliced'), text('Cebolla, sal y pimienta al gusto', 'Onion, salt, and pepper to taste')],
      [text('2½ palmas de carne molida formada en hamburguesa', '2½ palms ground beef formed into a patty'), text('2 tazas de lechuga', '2 cups lettuce'), text('1 tomate pequeño y ½ pepino en rebanadas', '1 small tomato and ½ cucumber, sliced'), text('Cebolla, sal y pimienta al gusto', 'Onion, salt, and pepper to taste')],
      [text('2½ palmas de carne molida formada en hamburguesa', '2½ palms ground beef formed into a patty'), text('3 tazas de lechuga', '3 cups lettuce'), text('1 tomate pequeño y ½ pepino en rebanadas', '1 small tomato and ½ cucumber, sliced'), text('2 cucharadas de aceite para aderezo, cebolla, sal y pimienta', '2 tablespoons dressing oil, onion, salt, and pepper')],
    ),
    steps: [
      text('Forma la carne en una hamburguesa sin compactarla demasiado.', 'Shape the beef into a patty without packing it too tightly.'),
      text('Sazona con sal y pimienta y cocina de 4 a 5 minutos por lado.', 'Season with salt and pepper and cook for 4 to 5 minutes per side.'),
      text('Lava y corta la lechuga, el tomate, la cebolla y el pepino.', 'Wash and cut the lettuce, tomato, onion, and cucumber.'),
      text('Sirve la hamburguesa sin pan junto a los vegetales.', 'Serve the burger without a bun alongside the vegetables.'),
    ],
    substitutions: [
      text('Carne de res → carne molida de pavo, conservando la porción', 'Beef → ground turkey, keeping the same portion'),
      text('Lechuga → mezcla de hojas verdes', 'Lettuce → mixed leafy greens'),
    ],
    allergens: [],
  },
}
