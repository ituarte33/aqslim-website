import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canReviewSyntheticPreview,
  isSyntheticPreviewEnvironment,
  SYNTHETIC_PREVIEW_BRANCH,
} from '../lib/nutrition/synthetic-preview-policy.ts'

const previewEnvironment = {
  VERCEL_ENV: 'preview',
  VERCEL_GIT_COMMIT_REF: SYNTHETIC_PREVIEW_BRANCH,
  MYAQ_PREVIEW_REVIEWER_EMAILS: 'reviewer.one@example.test, Reviewer.Two@example.test ',
}

test('the synthetic plan remains limited to the dedicated Preview branch', () => {
  assert.equal(isSyntheticPreviewEnvironment(previewEnvironment), true)
  assert.equal(isSyntheticPreviewEnvironment({
    VERCEL_ENV: 'production',
    VERCEL_GIT_COMMIT_REF: SYNTHETIC_PREVIEW_BRANCH,
  }), false)
})

test('an admin retains access to the synthetic review surface', () => {
  assert.equal(canReviewSyntheticPreview({
    role: 'admin',
    email: 'admin@example.test',
    environment: {},
  }), true)
})

test('an allowlisted internal reviewer can enter only in the dedicated Preview environment', () => {
  assert.equal(canReviewSyntheticPreview({
    role: 'patient',
    email: 'reviewer.two@EXAMPLE.test',
    environment: previewEnvironment,
  }), true)
  assert.equal(canReviewSyntheticPreview({
    role: 'patient',
    email: 'reviewer.two@example.test',
    environment: { ...previewEnvironment, VERCEL_ENV: 'production' },
  }), false)
})

test('an unlisted account cannot enter the synthetic review surface', () => {
  assert.equal(canReviewSyntheticPreview({
    role: 'patient',
    email: 'not-listed@example.test',
    environment: previewEnvironment,
  }), false)
})
