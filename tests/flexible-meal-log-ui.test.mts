import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('meal log offers photo, manual description, and portion controls', async () => {
  const component = await readFile(new URL('../app/food-scanner/scanner-client.tsx', import.meta.url), 'utf8')
  assert.match(component, /inputModes:\s*\{ photo: 'Con fotografía', description: 'Sin fotografía' \}/)
  assert.match(component, /manualPlaceholder: 'Ejemplo: un tazón de Rice Krispies con 8 oz de leche'/)
  assert.match(component, /\[25, 50, 75, 100\]\.map/)
  assert.match(component, /portionPercent/)
  assert.match(component, /language: lang/)
  assert.match(component, /inputMode === 'photo'.*imageBase64/s)
})

test('meal log always provides a route back to My AQSLIM', async () => {
  const component = await readFile(new URL('../app/food-scanner/scanner-client.tsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8')

  assert.match(component, /href="\/my-aqslim" className="fs-brand-link"/)
  assert.match(component, /href="\/my-aqslim" className="fs-nav-link fs-nav-link--home"/)
  assert.match(styles, /\.fs-nav-link--home\s*\{[\s\S]*?display: inline-flex/)
})

test('My AQSLIM home links directly to each meal logging path and history', async () => {
  const home = await readFile(new URL('../app/my-aqslim/home-view.tsx', import.meta.url), 'utf8')
  const scanner = await readFile(new URL('../app/food-scanner/scanner-client.tsx', import.meta.url), 'utf8')
  const loading = await readFile(new URL('../app/my-aqslim/loading.tsx', import.meta.url), 'utf8')

  assert.match(home, /href="\/food-scanner\?mode=photo"/)
  assert.match(home, /href="\/food-scanner\?mode=description"/)
  assert.match(home, /href="\/food-scanner#food-history"/)
  assert.match(scanner, /new URLSearchParams\(window\.location\.search\)\.get\('mode'\)/)
  assert.match(scanner, /id="food-history"/)
  assert.match(loading, /aria-busy="true"/)
})

test('meal analysis requests localized and internally checked estimates', async () => {
  const route = await readFile(new URL('../app/api/food-scan/route.ts', import.meta.url), 'utf8')
  assert.match(route, /Write the food name and notes in \$\{responseLanguage\}/)
  assert.match(route, /Estimate each named ingredient separately/)
  assert.match(route, /compare calories with the macro totals/)
  assert.match(route, /isFoodAnalysisConsistent/)
  assert.match(route, /repairNutritionMath/)
  assert.match(route, /ingredients array/)
  assert.match(route, /Fuente: \$\{sourceLabel\}/)
})

test('photo estimates can be corrected without creating another scan', async () => {
  const component = await readFile(new URL('../app/food-scanner/scanner-client.tsx', import.meta.url), 'utf8')
  const route = await readFile(new URL('../app/api/food-scan/route.ts', import.meta.url), 'utf8')
  const airtable = await readFile(new URL('../lib/airtable.ts', import.meta.url), 'utf8')
  assert.match(component, /Corregir ingredientes o porción/)
  assert.match(component, /Recalcular sin usar otro escaneo/)
  assert.match(component, /action: 'reanalyze'/)
  assert.match(route, /payload\.action === 'reanalyze'/)
  assert.match(route, /Do not reintroduce an ingredient the member explicitly says is absent/)
  assert.match(route, /do not apply the photo's previously selected plate percentage again/)
  assert.match(route, /portionBasis: 'described_serving'/)
  assert.match(component, /personalServingResult/)
  assert.match(airtable, /updateUnconfirmedMealLogEstimate/)
  const correctionBranch = route.match(/if \(payload\.action === 'reanalyze'\)[\s\S]*?\n  }\n\n  if \(/)?.[0] ?? ''
  assert.doesNotMatch(correctionBranch, /createMealLog/)
  assert.doesNotMatch(correctionBranch, /applyMealPortion/)
})

test('meal type can be corrected on the existing scan without another analysis', async () => {
  const component = await readFile(new URL('../app/food-scanner/scanner-client.tsx', import.meta.url), 'utf8')
  const route = await readFile(new URL('../app/api/food-scan/route.ts', import.meta.url), 'utf8')
  const airtable = await readFile(new URL('../lib/airtable.ts', import.meta.url), 'utf8')
  assert.match(component, /action: 'update_meal_type'/)
  assert.match(component, /selectMealType/)
  assert.match(route, /payload\.action === 'update_meal_type'/)
  assert.match(route, /updateMealLogMealType/)
  assert.match(airtable, /export async function updateMealLogMealType/)
  const updateBranch = route.match(/if \(payload\.action === 'update_meal_type'\)[\s\S]*?\n  }\n\n  if \(payload\.action === 'reanalyze'\)/)?.[0] ?? ''
  assert.doesNotMatch(updateBranch, /createMealLog/)
  assert.doesNotMatch(updateBranch, /client\.messages\.create/)
})

test('meal type can be corrected directly from scan history', async () => {
  const widget = await readFile(new URL('../app/food-log-widget.tsx', import.meta.url), 'utf8')
  const scanner = await readFile(new URL('../app/food-scanner/scanner-client.tsx', import.meta.url), 'utf8')

  assert.match(widget, /onMealTypeChange/)
  assert.match(widget, /editingMealTypeId/)
  assert.match(widget, /changeMealType\(log\.id, option\)/)
  assert.match(scanner, /onMealTypeChange=\{updateSavedMealType\}/)
  assert.match(scanner, /action: 'update_meal_type'/)
})

test('today view exposes a direct edit button for only the latest meal', async () => {
  const widget = await readFile(new URL('../app/food-log-widget.tsx', import.meta.url), 'utf8')
  assert.match(widget, /period === 'today' && index === 0 && onMealTypeChange/)
  assert.match(widget, /className="flw-row-edit-latest"/)
  assert.match(widget, /editLatest: 'Editar'/)
  assert.match(widget, /editLatest: 'Edit'/)
})
