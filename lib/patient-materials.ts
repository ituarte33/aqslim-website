import { currentPlanAttachments } from '@/lib/clinic-plan-materials'
import { getClinicMaterialEvents } from '@/lib/clinic-plan-materials-store'
import 'server-only'

import { cache } from 'react'
import { getPlanById, type AirtableAttachment } from '@/lib/airtable'
import { requireOwnPatient } from '@/lib/auth'
import {
  normalizeKenkhoTier,
  visiblePlanMaterials,
  reviewClinicMaterials,
  type PatientMaterialsData,
  type PlanMaterialAttachment,
} from '@/lib/materials-policy'
import { phaseGuideMaterial, phaseGuideDocument } from '@/lib/phase-materials'
import { isClinicPreviewEnvironment } from '@/lib/clinic-preview-policy'

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
  const previewReview = isClinicPreviewEnvironment({ VERCEL_ENV: process.env.VERCEL_ENV, VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF })
  const currentAttachments = previewReview
    ? currentPlanAttachments(plan, await getClinicMaterialEvents(patient.id))
    : attachments
  const assignedMaterials = visiblePlanMaterials({ attachments: currentAttachments, kenkhoTier, weekInPhase })
  const phaseMaterial = phaseGuideMaterial(plan.fields['Fase Actual'])
  const fullGuide = previewReview ? phaseGuideDocument(plan.fields['Fase Actual']) : null

  return {
    kenkhoTier,
    materials: reviewClinicMaterials([
      ...(phaseMaterial ? [phaseMaterial] : []),
      ...(fullGuide ? [fullGuide] : []),
      ...assignedMaterials,
    ], previewReview),
    previewReview,
  }
})
