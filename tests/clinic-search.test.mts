import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeClinicSearch } from '../lib/clinic-search.ts'

test('Clinic search ignores accents and accidental trailing punctuation', () => {
  assert.equal(normalizeClinicSearch(' María Prueba AQSLIM. '), 'maria prueba aqslim')
  assert.equal(normalizeClinicSearch('Maria'), 'maria')
  assert.equal(normalizeClinicSearch('Prueba!'), 'prueba')
})
