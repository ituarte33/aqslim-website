import type { PlanMaterialAttachment } from './materials-policy.ts'

export type MaterialPlan = {
  id: string
  fields: Record<string, unknown>
}
export type ClinicMaterialEvent = {
  kind: 'clinic-plan-materials-v1'
  action: 'release' | 'archive'
  planId: string
  revision: string
  at: string
  label: string
  attachments: PlanMaterialAttachment[]
  planFields?: Record<string, unknown>
}

// Week and measured weights evolve within a plan; they do not renew a release.
// A changed diet, phase, start, label or instructions requires a new assignment.
export function materialPlanRevision(plan: MaterialPlan): string {
  return JSON.stringify([plan.id, ...[
    'Notas del Plan', 'Dieta en Nutrimind', 'Fase Actual',
    'Fecha Inicio Tratamiento', 'Fecha Inicio Fase Actual', 'Instrucciones Especiales', 'Calorías Objetivo',
  ].map(key => plan.fields[key] ?? '')])
}

export function planAttachments(plan: MaterialPlan): PlanMaterialAttachment[] {
  const attachments = plan.fields['Materiales asignados']
  return Array.isArray(attachments) ? attachments.filter((item): item is PlanMaterialAttachment =>
    Boolean(item && typeof item.id === 'string' && typeof item.filename === 'string'
      && typeof item.url === 'string' && /^https:\/\//i.test(item.url))) : []
}

export function decodeClinicMaterialEvent(note: unknown): ClinicMaterialEvent | null {
  if (typeof note !== 'string') return null
  try {
    const value = JSON.parse(note)
    if (value?.kind !== 'clinic-plan-materials-v1' || !['release', 'archive'].includes(value.action)
      || typeof value.planId !== 'string' || typeof value.revision !== 'string'
      || typeof value.label !== 'string' || typeof value.at !== 'string'
      || !Number.isFinite(Date.parse(value.at)) || !Array.isArray(value.attachments)) return null
    const checked = planAttachments({ id: value.planId, fields: { 'Materiales asignados': value.attachments } })
    if (checked.length !== value.attachments.length) return null
    return { ...value, attachments: checked }
  } catch { return null }
}

export function currentPlanAttachments(plan: MaterialPlan, events: ClinicMaterialEvent[]): PlanMaterialAttachment[] {
  const revision = materialPlanRevision(plan)
  const latest = events.filter(event => event.planId === plan.id)
    .sort((a, b) => b.at.localeCompare(a.at))[0]
  // Unversioned legacy files stay in Clinic until explicitly assigned.
  if (!latest || latest.action !== 'release' || latest.revision !== revision) return []
  const ids = new Set(latest.attachments.map(item => item.id))
  // Use current Airtable URLs rather than expired snapshot URLs.
  return planAttachments(plan).filter(item => ids.has(item.id))
}

export function activePlanIncludesFast36(plan: MaterialPlan | null): boolean {
  if (!plan) return false
  const instructions = String(plan.fields['Instrucciones Especiales'] ?? '')
  if (/\b(?:sin|no|without)\s+fast\s*36\b/i.test(instructions)) return false
  return /\bfast\s*36\b/i.test(`${plan.fields['Notas del Plan'] ?? ''} ${plan.fields['Dieta en Nutrimind'] ?? ''}`)
}
