import assert from 'node:assert/strict'
import test from 'node:test'
import { formatPortalPlanDate } from '../lib/portal-plan-date.ts'
test('Clinic Preview preserves the calendar day while Production retains its existing behavior', () => {
 assert.equal(formatPortalPlanDate('2026-10-23', 'es', true), '23 de octubre de 2026')
 assert.equal(formatPortalPlanDate('2026-10-23', 'en', true), 'October 23, 2026')
 assert.equal(formatPortalPlanDate('2026-10-23', 'es'), '22 de octubre de 2026')
 assert.equal(formatPortalPlanDate('2026-10-23T01:00:00Z', 'en', true), 'October 22, 2026')
 assert.equal(formatPortalPlanDate(null, 'es', true), 'Por confirmar')
 assert.equal(formatPortalPlanDate('invalid', 'es', true), 'Por confirmar')
})
