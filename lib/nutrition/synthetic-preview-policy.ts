export const SYNTHETIC_PREVIEW_BRANCH = 'myaq-rec-001-preview-010'
export const SYNTHETIC_PREVIEW_CLIENT_ID = 'SYN-CLIENT-001'
export const SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID = 'appuUHRs26ATXnZjf'

export function isSyntheticPreviewEnvironment(environment: {
  VERCEL_ENV?: string
  VERCEL_GIT_COMMIT_REF?: string
}) {
  return environment.VERCEL_ENV === 'preview'
    && environment.VERCEL_GIT_COMMIT_REF === SYNTHETIC_PREVIEW_BRANCH
}

export function hasSyntheticPreviewStorageConfiguration(environment: {
  AIRTABLE_BASE_ID?: string
  AIRTABLE_PAT?: string
}) {
  return environment.AIRTABLE_BASE_ID === SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID
    && Boolean(environment.AIRTABLE_PAT)
}

export function isAllowedSyntheticPreviewClient(clientId: unknown): clientId is typeof SYNTHETIC_PREVIEW_CLIENT_ID {
  return clientId === SYNTHETIC_PREVIEW_CLIENT_ID
}

function previewReviewerEmails(value?: string) {
  return new Set(
    (value ?? '')
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function canReviewSyntheticPreview({
  role,
  email,
  environment,
}: {
  role: 'admin' | 'patient'
  email: string
  environment: {
    VERCEL_ENV?: string
    VERCEL_GIT_COMMIT_REF?: string
    MYAQ_PREVIEW_REVIEWER_EMAILS?: string
  }
}) {
  if (!isSyntheticPreviewEnvironment(environment)) return false
  if (role === 'admin') return true

  return previewReviewerEmails(environment.MYAQ_PREVIEW_REVIEWER_EMAILS)
    .has(email.trim().toLowerCase())
}

export function syntheticPreviewScopeKey(accountId: string, clientId: string) {
  return `preview:${accountId}:${clientId}`
}
