import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { withAqslimPatientBinding } from '../lib/patient-binding.ts'

test('sets the stable Airtable patient binding without discarding existing private metadata', () => {
  assert.deepEqual(
    withAqslimPatientBinding(
      { plan: 'pro', unrelatedSetting: true, aqslimPatientId: 'rec-old' },
      'rec-romulo',
    ),
    { plan: 'pro', unrelatedSetting: true, aqslimPatientId: 'rec-romulo' },
  )
})

test('the admin binding action is capability protected and updates Clerk private metadata', async () => {
  const action = await readFile(
    new URL('../app/dashboard/[id]/edit/actions.ts', import.meta.url),
    'utf8',
  )

  assert.match(action, /requireCapability\('patients:write:any'\)/)
  assert.match(action, /users\.updateUserMetadata/)
  assert.match(action, /withAqslimPatientBinding/)
})
