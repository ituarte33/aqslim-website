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

test('meal analysis requests localized and internally checked estimates', async () => {
  const route = await readFile(new URL('../app/api/food-scan/route.ts', import.meta.url), 'utf8')
  assert.match(route, /Write the food name and notes in \$\{responseLanguage\}/)
  assert.match(route, /Estimate each named ingredient separately/)
  assert.match(route, /compare calories with the macro totals/)
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
  assert.match(airtable, /updateUnconfirmedMealLogEstimate/)
  assert.doesNotMatch(route.match(/if \(payload\.action === 'reanalyze'\)[\s\S]*?\n  }\n\n  if \(/)?.[0] ?? '', /createMealLog/)
})
