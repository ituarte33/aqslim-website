import type { PortalMaterial } from './materials-policy.ts'
import { toCanonicalPhaseName } from './phase-names.ts'

export type AQSLIMPhase = 'Jing' | 'Qi' | 'Xue' | 'Yang Sheng'

export type PhaseGuide = {
  phase: AQSLIMPhase
  number: number
  subtitleEs: string
  subtitleEn: string
  purposeEs: string
  purposeEn: string
  objectivesEs: string[]
  objectivesEn: string[]
  learningEs: string[]
  learningEn: string[]
  watchEs: string
  watchEn: string
}

// Patient-facing copy is governed by the Drive source “05- Las 4 Fases.docx”.
// Drive file ID: 1MtU7o2ZkgueJfU0P7aLscUlvQPk_YF64.
export const PHASE_GUIDES: Readonly<Record<AQSLIMPhase, PhaseGuide>> = {
  Jing: {
    phase: 'Jing',
    number: 1,
    subtitleEs: 'La fase del control',
    subtitleEn: 'The control phase',
    purposeEs: 'Recuperar el control sobre tu alimentación con una estructura sencilla y clara.',
    purposeEn: 'Regain control of your eating with a simple, clear structure.',
    objectivesEs: ['Reducir carbohidratos', 'Disminuir antojos', 'Aprender nuevas rutinas', 'Recuperar confianza', 'Iniciar la pérdida de peso'],
    objectivesEn: ['Reduce carbohydrates', 'Reduce cravings', 'Build new routines', 'Regain confidence', 'Begin weight loss'],
    learningEs: ['Identificar carbohidratos', 'Construir comidas simples', 'Manejar restaurantes y eventos sociales', 'Reconocer hambre real y hambre emocional'],
    learningEn: ['Identify carbohydrates', 'Build simple meals', 'Navigate restaurants and social events', 'Recognize physical and emotional hunger'],
    watchEs: 'Durante los primeros días pueden aparecer dolor de cabeza, antojos, cansancio o irritabilidad. Estas sensaciones suelen ser temporales durante la adaptación.',
    watchEn: 'Headaches, cravings, fatigue, or irritability may appear during the first few days. These feelings are usually temporary while you adapt.',
  },
  Qi: {
    phase: 'Qi',
    number: 2,
    subtitleEs: 'La fase de la elección',
    subtitleEn: 'The choice phase',
    purposeEs: 'Ampliar tus opciones con responsabilidad una vez que ya existe control.',
    purposeEn: 'Expand your options responsibly once control is established.',
    objectivesEs: ['Introducir nuevos alimentos', 'Aprender flexibilidad', 'Desarrollar criterio', 'Continuar progresando'],
    objectivesEn: ['Introduce new foods', 'Practice flexibility', 'Develop judgment', 'Keep progressing'],
    learningEs: ['Manejar más variedad', 'Tomar decisiones inteligentes', 'Evitar excesos'],
    learningEn: ['Handle more variety', 'Make informed choices', 'Avoid excess'],
    watchEs: 'Tener más opciones no significa volver a los hábitos anteriores. La libertad sigue acompañada de responsabilidad.',
    watchEn: 'Having more options does not mean returning to old habits. Freedom still comes with responsibility.',
  },
  Xue: {
    phase: 'Xue',
    number: 3,
    subtitleEs: 'La fase de la adaptación',
    subtitleEn: 'The adaptation phase',
    purposeEs: 'Adaptar lo aprendido a vacaciones, celebraciones, restaurantes, viajes y otras situaciones de la vida real.',
    purposeEn: 'Apply what you have learned to vacations, celebrations, restaurants, travel, and other real-life situations.',
    objectivesEs: ['Adaptarte al mundo real', 'Mantener resultados', 'Aprender moderación', 'Desarrollar confianza'],
    objectivesEn: ['Adapt to real life', 'Maintain results', 'Practice moderation', 'Build confidence'],
    learningEs: ['Comer fuera de casa', 'Disfrutar eventos especiales', 'Recuperarte rápidamente después de una desviación'],
    learningEn: ['Eat away from home', 'Enjoy special events', 'Recover quickly after a setback'],
    watchEs: 'No buscamos perfección; buscamos consistencia. La libertad sigue acompañada de responsabilidad.',
    watchEn: 'We are not seeking perfection; we are seeking consistency. Freedom still comes with responsibility.',
  },
  'Yang Sheng': {
    phase: 'Yang Sheng',
    number: 4,
    subtitleEs: 'Nutrir la vida',
    subtitleEn: 'Nourishing life',
    purposeEs: 'Convertir lo aprendido en una forma sostenible de administrar tu salud.',
    purposeEn: 'Turn what you have learned into a sustainable way to manage your health.',
    objectivesEs: ['Mantener la salud metabólica', 'Mantener resultados', 'Consolidar hábitos', 'Desarrollar autonomía'],
    objectivesEn: ['Maintain metabolic health', 'Maintain results', 'Consolidate habits', 'Develop independence'],
    learningEs: ['Monitorear tu peso inteligentemente', 'Utilizar AQ Weight Guard', 'Activar AQ Rescue cuando sea necesario', 'Mantener resultados durante años'],
    learningEn: ['Monitor your weight wisely', 'Use AQ Weight Guard', 'Activate AQ Rescue when needed', 'Maintain results over time'],
    watchEs: 'El objetivo no es avanzar rápido, sino dominar cada etapa y sostener tus resultados.',
    watchEn: 'The goal is not to move quickly, but to master each stage and sustain your results.',
  },
}

export function getPhaseGuide(value: string | null | undefined): PhaseGuide | null {
  const phase = toCanonicalPhaseName(value ?? null)
  return phase && phase in PHASE_GUIDES ? PHASE_GUIDES[phase as AQSLIMPhase] : null
}

// Original patient handout selected from Rom's supplied Drive folder.
// Linking preserves the source file and its existing sharing permissions.
export function phaseGuideDocument(value: string | null | undefined): PortalMaterial | null {
  if (toCanonicalPhaseName(value ?? null) !== 'Jing') return null
  return {
    id: 'phase-document-jing',
    url: 'https://drive.google.com/file/d/1pr47HsDbGHufCs3HJRiMEm4phmhPwAWR/view',
    filename: 'KenkoPath Fase1 JING Claro.pdf',
    type: 'application/pdf',
    kind: 'guide',
    titleEs: 'Guía completa de Jing · PDF',
    titleEn: 'Full Jing guide · PDF (Spanish)',
    typeEs: 'Fase 1 · Documento original',
    typeEn: 'Phase 1 · Original document',
    detailEs: 'Guía original en español con las listas de alimentos de Jing. Su contenido está pendiente de revisión clínica antes de entregarse a clientes.',
    detailEn: 'Original Spanish guide with Jing food lists. Its content is awaiting clinical review before client release.',
  }
}

export function phaseGuideMaterial(value: string | null | undefined): PortalMaterial | null {
  const guide = getPhaseGuide(value)
  if (!guide) return null

  return {
    id: `phase-guide-${guide.phase.toLowerCase().replace(/\s+/g, '-')}`,
    url: '/my-aqslim/materials/phase-guide',
    filename: `Guia_de_Fase_${guide.phase.replace(/\s+/g, '_')}.html`,
    type: 'text/html',
    kind: 'guide',
    titleEs: `Guía de fase ${guide.phase}`,
    titleEn: `${guide.phase} phase guide`,
    typeEs: `Fase ${guide.number}`,
    typeEn: `Phase ${guide.number}`,
    detailEs: `${guide.subtitleEs}. Se actualiza automáticamente cuando AQSLIM publica una nueva fase.`,
    detailEn: `${guide.subtitleEn}. It updates automatically when AQSLIM publishes a new phase.`,
  }
}
