import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeClinicIsoDate } from '../lib/clinic-date.ts'

test('accepts a real ISO clinic date', () => {
  assert.equal(normalizeClinicIsoDate('2026-10-14'), '2026-10-14')
  assert.equal(normalizeClinicIsoDate(' 2026-10-14 '), '2026-10-14')
})

test('rejects malformed and impossible clinic dates', () => {
  assert.equal(normalizeClinicIsoDate('10/14/2026'), null)
  assert.equal(normalizeClinicIsoDate('2026-02-30'), null)
  assert.equal(normalizeClinicIsoDate(''), null)
  assert.equal(normalizeClinicIsoDate(null), null)
})
