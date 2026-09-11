import 'server-only'

import {
  ENTITLEMENT_P3_PREVIEW_BRANCH,
  SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID,
} from './nutrition/synthetic-preview-policy'

export const PREVIEW_REANALYSIS_TABLE = 'tblvbgakurEZYnNys'
export const REANALYSIS_LIMIT_PER_MEAL = 2

const FIELDS = {
  ENTRY_KEY: 'fld13sccoPDgtPJ8u',
  SUBJECT_ID: 'fldhw3Z7vkY0mtkUH',
  MEAL_LOG_ID: 'fldkP2AcdR7UoDY6Z',
  SEQUENCE: 'fld7Ni9y9R8etmtrr',
  EVENT_AT: 'fld7F8ut6QsnOvRPm',
  STATUS: 'fldyvSnqOK5NrJNE3',
  PREVIEW_ONLY: 'fldinyQay91CqzNvr',
} as const

function storeEnabled(): boolean {
  return process.env.VERCEL_ENV === 'preview'
    && process.env.VERCEL_GIT_COMMIT_REF === ENTITLEMENT_P3_PREVIEW_BRANCH
    && process.env.AIRTABLE_BASE_ID === SYNTHETIC_PREVIEW_AIRTABLE_BASE_ID
    && Boolean(process.env.AIRTABLE_PAT)
}

function escapeFormulaString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

async function fetchCompletedEvents(subjectId: string, mealLogId: string) {
  if (!storeEnabled()) return [] as Array<{ id: string; fields: Record<string, unknown> }>
  if (!subjectId.trim() || !/^rec[A-Za-z0-9]{14}$/.test(mealLogId)) return []

  const baseId = process.env.AIRTABLE_BASE_ID as string
  const pat = process.env.AIRTABLE_PAT as string
  const params = new URLSearchParams({
    maxRecords: String(REANALYSIS_LIMIT_PER_MEAL + 1),
    returnFieldsByFieldId: 'true',
    filterByFormula: `AND({Subject ID} = "${escapeFormulaString(subjectId)}", {Meal Log ID} = "${escapeFormulaString(mealLogId)}", {Status} = "completed", {Preview Only} = TRUE())`,
  })
  Object.values(FIELDS).forEach(fieldId => params.append('fields[]', fieldId))

  const response = await fetch(
    `https://api.airtable.com/v0/${baseId}/${PREVIEW_REANALYSIS_TABLE}?${params}`,
    { headers: { Authorization: `Bearer ${pat}` }, cache: 'no-store' },
  )
  if (!response.ok) throw new Error('Preview reanalysis store unavailable')
  const payload = await response.json() as {
    records?: Array<{ id: string; fields: Record<string, unknown> }>
  }
  return payload.records ?? []
}

export async function getPreviewReanalysisUsage(subjectId: string, mealLogId: string) {
  const completed = await fetchCompletedEvents(subjectId, mealLogId)
  const used = completed.length
  return {
    used,
    limit: REANALYSIS_LIMIT_PER_MEAL,
    remaining: Math.max(0, REANALYSIS_LIMIT_PER_MEAL - used),
    allowed: used < REANALYSIS_LIMIT_PER_MEAL,
  }
}

export async function recordPreviewReanalysisCompleted(
  subjectId: string,
  mealLogId: string,
): Promise<{ used: number; limit: number; remaining: number }> {
  if (!storeEnabled()) {
    return { used: 0, limit: REANALYSIS_LIMIT_PER_MEAL, remaining: REANALYSIS_LIMIT_PER_MEAL }
  }

  const before = await getPreviewReanalysisUsage(subjectId, mealLogId)
  if (!before.allowed) throw new Error('Preview reanalysis limit reached')

  const sequence = before.used + 1
  const baseId = process.env.AIRTABLE_BASE_ID as string
  const pat = process.env.AIRTABLE_PAT as string
  const response = await fetch(
    `https://api.airtable.com/v0/${baseId}/${PREVIEW_REANALYSIS_TABLE}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pat}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [{
          fields: {
            [FIELDS.ENTRY_KEY]: `${mealLogId}:${subjectId}:${sequence}:${crypto.randomUUID()}`,
            [FIELDS.SUBJECT_ID]: subjectId,
            [FIELDS.MEAL_LOG_ID]: mealLogId,
            [FIELDS.SEQUENCE]: sequence,
            [FIELDS.EVENT_AT]: new Date().toISOString(),
            [FIELDS.STATUS]: 'completed',
            [FIELDS.PREVIEW_ONLY]: true,
          },
        }],
      }),
    },
  )
  if (!response.ok) throw new Error('Could not record Preview reanalysis completion')

  const after = await getPreviewReanalysisUsage(subjectId, mealLogId)
  return { used: after.used, limit: after.limit, remaining: after.remaining }
}
