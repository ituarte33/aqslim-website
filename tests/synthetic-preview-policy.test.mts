import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AQ_BUDDY_OPENAI_PREVIEW_BRANCH,
  canReviewSyntheticPreview,
  ENTITLEMENT_P2_PREVIEW_BRANCH,
  ENTITLEMENT_P3_PREVIEW_BRANCH,
  ENTITLEMENT_PREVIEW_BRANCH,
  isSyntheticPreviewEnvironment,
  SYNTHETIC_PREVIEW_BRANCH,
} from '../lib/nutrition/synthetic-preview-policy.ts'

const previewEnvironment = {
  VERCEL_ENV: 'preview',
  VERCEL_GIT_COMMIT_REF: SYNTHETIC_PREVIEW_BRANCH,
  MYAQ_PREVIEW_REVIEWER_EMAILS: 'reviewer.one@example.test, Reviewer.Two@example.test ',
}

test('the synthetic plan remains limited to the approved Preview branches', () => {
  assert.equal(isSyntheticPreviewEnvironment(previewEnvironment), true)
  assert.equal(isSyntheticPreviewEnvironment({
    ...previewEnvironment,
    VERCEL_GIT_COMMIT_REF: ENTITLEMENT_PREVIEW_BRANCH,
  }), true)
  assert.equal(isSyntheticPreviewEnvironment({
    ...previewEnvironment,
    VERCEL_GIT_COMMIT_REF: AQ_BUDDY_OPENAI_PREVIEW_BRANCH,
  }), true)
  assert.equal(isSyntheticPreviewEnvironment({
    ...previewEnvironment,
    VERCEL_GIT_COMMIT_REF: ENTITLEMENT_P2_PREVIEW_BRANCH,
  }), true)
  assert.equal(isSyntheticPreviewEnvironment({
    ...previewEnvironment,
    VERCEL_GIT_COMMIT_REF: ENTITLEMENT_P3_PREVIEW_BRANCH,
  }), true)
  assert.equal(isSyntheticPreviewEnvironment({
    VERCEL_ENV: 'production',
    VERCEL_GIT_COMMIT_REF: SYNTHETIC_PREVIEW_BRANCH,
  }), false)
  assert.equal(isSyntheticPreviewEnvironment({
    VERCEL_ENV: 'preview',
    VERCEL_GIT_COMMIT_REF: 'main',
  }), false)
})

test('an admin retains access only on an approved Preview branch', () => {
  assert.equal(canReviewSyntheticPreview({
    role: 'admin',
    email: 'admin@example.test',
    environment: previewEnvironment,
  }), true)
  assert.equal(canReviewSyntheticPreview({
    role: 'admin',
    email: 'admin@example.test',
    environment: { ...previewEnvironment, VERCEL_ENV: 'production' },
  }), false)
})

test('an allowlisted internal reviewer can enter only in an approved Preview environment', () => {
  assert.equal(canReviewSyntheticPreview({
    role: 'patient',
    email: 'reviewer.two@EXAMPLE.test',
    environment: previewEnvironment,
  }), true)
  assert.equal(canReviewSyntheticPreview({
    role: 'patient',
    email: 'reviewer.two@example.test',
    environment: { ...previewEnvironment, VERCEL_GIT_COMMIT_REF: ENTITLEMENT_PREVIEW_BRANCH },
  }), true)
  assert.equal(canReviewSyntheticPreview({
    role: 'patient',
    email: 'reviewer.two@example.test',
    environment: { ...previewEnvironment, VERCEL_GIT_COMMIT_REF: AQ_BUDDY_OPENAI_PREVIEW_BRANCH },
  }), true)
  assert.equal(canReviewSyntheticPreview({
    role: 'patient',
    email: 'reviewer.two@example.test',
    environment: { ...previewEnvironment, VERCEL_GIT_COMMIT_REF: ENTITLEMENT_P2_PREVIEW_BRANCH },
  }), true)
  assert.equal(canReviewSyntheticPreview({
    role: 'patient',
    email: 'reviewer.two@example.test',
    environment: { ...previewEnvironment, VERCEL_GIT_COMMIT_REF: ENTITLEMENT_P3_PREVIEW_BRANCH },
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
