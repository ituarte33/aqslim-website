import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('food scanner passes only the saved meal-log reference into AQ Buddy', async () => {
  const [scanRoute, scanner, widget, chatRoute, airtable] = await Promise.all([
    readFile(new URL('../app/api/food-scan/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/food-scanner/scanner-client.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/chat-widget.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/api/chat/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../lib/airtable.ts', import.meta.url), 'utf8'),
  ])

  assert.match(scanRoute, /mealLogId:\s+mealLog\.id/)
  assert.match(scanRoute, /latestMealLogId:\s+logs\[0\]\?\.id/)
  assert.match(scanner, /detail: context/)
  assert.match(widget, /context: foodScannerContext/)
  assert.match(chatRoute, /getMealLogForUser\(reference\.mealLogId, clerkUserId\)/)
  assert.match(chatRoute, /getMealLogsBetween\(/)
  assert.match(chatRoute, /carbsLoggedTodayExcludingCurrentMeal/)
  assert.match(chatRoute, /fields\['Consumption Status'\] === 'Consumed'/)
  assert.match(scanRoute, /updateMealLogConsumptionStatus/)
  assert.match(scanner, /Solo estoy evaluándolo/)
  assert.match(airtable, /record\.fields\['User ID'\] === userId/)
  assert.match(airtable, /getMealLogForUser\(recordId, userId\)/)
})
