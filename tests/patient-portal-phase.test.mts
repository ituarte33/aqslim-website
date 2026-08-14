import assert from 'node:assert/strict'
import test from 'node:test'
import { toCanonicalPhaseName } from '../lib/phase-names.ts'

test('the legacy keto label is presented as the canonical Jing phase', () => {
  assert.equal(toCanonicalPhaseName('Qi-Xue (Keto)'), 'Jing')
  assert.equal(toCanonicalPhaseName(' QI‑XUE (KETO) '), 'Jing')
})

test('canonical and unknown phase names are preserved', () => {
  assert.equal(toCanonicalPhaseName('Jing'), 'Jing')
  assert.equal(toCanonicalPhaseName('Qi'), 'Qi')
  assert.equal(toCanonicalPhaseName('Future governed phase'), 'Future governed phase')
})

test('missing phase values remain missing', () => {
  assert.equal(toCanonicalPhaseName(null), null)
  assert.equal(toCanonicalPhaseName('   '), null)
})
