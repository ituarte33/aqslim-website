import 'server-only'

import { cache } from 'react'
import { getPlanById, type AirtableAttachment } from '@/lib/airtable'
import { requireOwnPatient } from '@/lib/auth'
import {
  normalizeKenkhoTier,
  visiblePlanMaterials,
  type PatientMaterialsData,
  type PlanMaterialAttachment,
} from '@/lib/materials-policy'

function validAttachment(value: AirtableAttachment): value is AirtableAttachment & PlanMaterialAttachment {
  return Boolean(value.id && value.url && value.filename)
}

export const getPatientPortalMaterials = cache(async (
  weekInPhase: number | null,
): Promise<PatientMaterialsData> => {
  const patient = await requireOwnPatient('portal:read:self')
  const planId = patient.fields['Plan AQSLIM']?.[0]
  if (!planId) return { kenkhoTier: null, materials: [] }

  const plan = await getPlanById(planId).catch(() => null)
  if (!plan) return { kenkhoTier: null, materials: [] }

  const kenkhoTier = normalizeKenkhoTier(plan.fields['Nivel Kenkho Path'])
  const attachments = Array.isArray(plan.fields['Materiales asignados'])
    ? plan.fields['Materiales asignados'].filter(validAttachment)
    : []

  return {
    kenkhoTier,
    materials: visiblePlanMaterials({ attachments, kenkhoTier, weekInPhase }),
  }
})
