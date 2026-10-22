export type KenkhoTier = 'Start' | 'Plus' | 'Elite'

export type PlanMaterialAttachment = {
  id: string
  url: string
  filename: string
  type?: string
  size?: number
}

export type PortalMaterial = PlanMaterialAttachment & {
  kind: 'nutrition-plan' | 'quick-start' | 'cartography' | 'participant-manual' | 'guide' | 'document'
  titleEs: string
  titleEn: string
  typeEs: string
  typeEn: string
  detailEs: string
  detailEn: string
}

export type PatientMaterialsData = {
  kenkhoTier: KenkhoTier | null
  materials: PortalMaterial[]
  previewReview?: boolean
}

// An attachment alone does not establish a nutrition plan's effective dates.
// Keep this clarification scoped to the Clinic candidate until physical review.
export function reviewClinicMaterials(materials: PortalMaterial[], enabled: boolean): PortalMaterial[] {
  if (!enabled) return materials
  return materials.map(material => {
    if (material.id.startsWith('phase-guide-')) return {
      ...material,
      titleEs: material.titleEs.replace('Guía de fase', 'Resumen de fase'),
      titleEn: material.titleEn.replace('phase guide', 'phase summary'),
      detailEs: materials.some(item => item.id === material.id.replace('phase-guide-', 'phase-document-'))
        ? 'Resumen dentro de la app. El documento completo aparece por separado en esta biblioteca.'
        : 'Resumen dentro de la app. La guía completa de esta fase todavía no está vinculada.',
      detailEn: materials.some(item => item.id === material.id.replace('phase-guide-', 'phase-document-'))
        ? 'In-app summary. The full document is listed separately in this library.'
        : 'In-app summary. The full guide for this phase has not been linked yet.',
    }
    if (material.kind !== 'nutrition-plan') return material
    return {
      ...material,
      detailEs: 'Archivo adjunto a tu plan. Revisa sus fechas con AQSLIM antes de usarlo como plan vigente.',
      detailEn: 'File attached to your plan. Confirm its dates with AQSLIM before using it as your current plan.',
    }
  })
}

const KENKHO_TIERS = new Set<KenkhoTier>(['Start', 'Plus', 'Elite'])

export function normalizeKenkhoTier(value: unknown): KenkhoTier | null {
  return typeof value === 'string' && KENKHO_TIERS.has(value as KenkhoTier)
    ? value as KenkhoTier
    : null
}

export function materialKind(filename: string): PortalMaterial['kind'] {
  const normalized = filename.toLowerCase()
  if (normalized.includes('hipocal') || normalized.includes('nutrition_plan') || normalized.includes('nutrition-plan')) return 'nutrition-plan'
  if (normalized.includes('quick') && normalized.includes('start')) return 'quick-start'
  if (normalized.includes('cartograf') || normalized.includes('auricular-chart')) return 'cartography'
  if (normalized.includes('manual') && normalized.includes('particip')) return 'participant-manual'
  if (normalized.includes('guia') || normalized.includes('guide')) return 'guide'
  return 'document'
}

function cartographyReleaseWeek(filename: string): number | null {
  const match = filename.toLowerCase().match(/(?:semana|week)[-_ ]?(2|4|8|12)(?:\D|$)/)
  return match ? Number(match[1]) : null
}

export function isPlanMaterialVisible({
  filename,
  kenkhoTier,
  weekInPhase,
}: {
  filename: string
  kenkhoTier: KenkhoTier | null
  weekInPhase: number | null
}): boolean {
  const kind = materialKind(filename)
  if ((kind === 'quick-start' || kind === 'cartography') && !kenkhoTier) return false
  if (kind !== 'cartography') return true

  const releaseWeek = cartographyReleaseWeek(filename)
  return releaseWeek === null || (weekInPhase !== null && weekInPhase >= releaseWeek)
}

function cleanDocumentTitle(filename: string): string {
  return filename
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function describeMaterial(attachment: PlanMaterialAttachment): PortalMaterial {
  const kind = materialKind(attachment.filename)
  const fallbackTitle = cleanDocumentTitle(attachment.filename)
  const copy = {
    'nutrition-plan': {
      titleEs: 'Plan hipocalórico',
      titleEn: 'Hypocaloric plan',
      typeEs: 'Plan de alimentación',
      typeEn: 'Nutrition plan',
      detailEs: 'Tu plan de alimentación personalizado para esta semana.',
      detailEn: 'Your personalized nutrition plan for this week.',
    },
    'quick-start': {
      titleEs: 'Quick Start de Kenkho Path',
      titleEn: 'Kenkho Path Quick Start',
      typeEs: 'Inicio rápido',
      typeEn: 'Quick start',
      detailEs: 'Instrucciones para comenzar Kenkho Path fuera de la clínica.',
      detailEn: 'Instructions for starting Kenkho Path outside the clinic.',
    },
    cartography: {
      titleEs: 'Cartografía auricular',
      titleEn: 'Auricular chart',
      typeEs: 'Kenkho Path',
      typeEn: 'Kenkho Path',
      detailEs: 'La cartografía autorizada para tu momento actual.',
      detailEn: 'The authorized chart for your current point in the program.',
    },
    'participant-manual': {
      titleEs: 'Manual del Participante',
      titleEn: 'Participant Manual',
      typeEs: 'Manual',
      typeEn: 'Manual',
      detailEs: 'Tu referencia general para trabajar con AQSLIM.',
      detailEn: 'Your general reference for working with AQSLIM.',
    },
    guide: {
      titleEs: fallbackTitle,
      titleEn: fallbackTitle,
      typeEs: 'Guía',
      typeEn: 'Guide',
      detailEs: 'Guía asignada a tu plan actual.',
      detailEn: 'A guide assigned to your current plan.',
    },
    document: {
      titleEs: fallbackTitle,
      titleEn: fallbackTitle,
      typeEs: 'Material',
      typeEn: 'Material',
      detailEs: 'Documento asignado a tu plan actual.',
      detailEn: 'A document assigned to your current plan.',
    },
  }[kind]

  return { ...attachment, kind, ...copy }
}

export function visiblePlanMaterials({
  attachments,
  kenkhoTier,
  weekInPhase,
}: {
  attachments: PlanMaterialAttachment[]
  kenkhoTier: KenkhoTier | null
  weekInPhase: number | null
}): PortalMaterial[] {
  return attachments
    .filter(attachment => isPlanMaterialVisible({ filename: attachment.filename, kenkhoTier, weekInPhase }))
    .map(describeMaterial)
}
