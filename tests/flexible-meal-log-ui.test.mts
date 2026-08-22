import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('meal log offers photo, manual description, and portion controls', async () => {
  const component = await readFile(new URL('../app/food-scanner/scanner-client.tsx', import.meta.url), 'utf8')
  assert.match(component, /inputModes:\s*\{ photo: 'Con fotografía', description: 'Sin fotografía' \}/)
  assert.match(component, /manualPlaceholder: 'Ejemplo: un tazón de Rice Krispies con 8 oz de leche'/)
  assert.match(component, /\[25, 50, 75, 100\]\.map/)
  assert.match(component, /portionPercent/)
  assert.match(component, /inputMode === 'photo'.*imageBase64/s)
})
