import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CLINIC_FOUNDER_EMAIL,
  CLINIC_PREVIEW_BRANCH,
  isClinicFounderIdentity,
  isClinicPreviewEnvironment,
} from '../lib/clinic-preview-policy.ts'

const CLINIC_ENV = {
  VERCEL_ENV: 'preview',
  VERCEL_GIT_COMMIT_REF: CLINIC_PREVIEW_BRANCH,
} as const

test('Clinic is enabled only on its dedicated Preview branch', () => {
  assert.equal(isClinicPreviewEnvironment(CLINIC_ENV), true)
  assert.equal(isClinicPreviewEnvironment({ ...CLINIC_ENV, VERCEL_ENV: 'production' }), false)
  assert.equal(isClinicPreviewEnvironment({
    ...CLINIC_ENV,
    VERCEL_GIT_COMMIT_REF: 'myaq-ent-p5-1-extended-ai-live-canary',
  }), false)
  assert.equal(isClinicPreviewEnvironment({ ...CLINIC_ENV, VERCEL_GIT_COMMIT_REF: 'main' }), false)
})

test('Clinic Founder identity is exact and fail-closed', () => {
  assert.equal(isClinicFounderIdentity({ email: CLINIC_FOUNDER_EMAIL, environment: CLINIC_ENV }), true)
  assert.equal(isClinicFounderIdentity({ email: 'ROM@ITUARTECONSULTING.COM', environment: CLINIC_ENV }), true)
  assert.equal(isClinicFounderIdentity({ email: 'another-admin@example.com', environment: CLINIC_ENV }), false)
  assert.equal(isClinicFounderIdentity({
    email: CLINIC_FOUNDER_EMAIL,
    environment: { ...CLINIC_ENV, VERCEL_ENV: 'production' },
  }), false)
})
