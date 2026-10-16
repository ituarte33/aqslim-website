import assert from 'node:assert/strict'
import test from 'node:test'
import { beginClinicSubmit, finishClinicSubmit } from '../lib/clinic-submit-guard.ts'

test('blocks a repeated consultation submission until the active save finishes', () => {
  const guard = { active: false }

  assert.equal(beginClinicSubmit(guard), true)
  assert.equal(beginClinicSubmit(guard), false)

  finishClinicSubmit(guard)
  assert.equal(beginClinicSubmit(guard), true)
})
