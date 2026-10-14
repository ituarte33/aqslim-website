import assert from 'node:assert/strict'
import test from 'node:test'
import {
  evaluateReanalysisUsage,
  REANALYSIS_LIMIT_PER_MEAL,
} from '../lib/reanalysis-policy.ts'

test('D10 allows two reanalyses per original scan', () => {
  assert.equal(REANALYSIS_LIMIT_PER_MEAL, 2)
  assert.deepEqual(evaluateReanalysisUsage(0), {
    allowed: true,
    used: 0,
    limit: 2,
    remaining: 2,
  })
  assert.deepEqual(evaluateReanalysisUsage(1), {
    allowed: true,
    used: 1,
    limit: 2,
    remaining: 1,
  })
  assert.deepEqual(evaluateReanalysisUsage(2), {
    allowed: false,
    used: 2,
    limit: 2,
    remaining: 0,
  })
})

test('D10 clamps invalid negative usage without expanding the limit', () => {
  assert.deepEqual(evaluateReanalysisUsage(-4), {
    allowed: true,
    used: 0,
    limit: 2,
    remaining: 2,
  })
})
