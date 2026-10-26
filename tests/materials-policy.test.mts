import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  isPlanMaterialVisible,
  normalizeKenkhoTier,
  visiblePlanMaterials,
  reviewClinicMaterials,
  type PlanMaterialAttachment,
} from '../lib/materials-policy.ts'
import { getPhaseGuide, phaseGuideMaterial, phaseGuideDocument } from '../lib/phase-materials.ts'
import { isClinicPreviewEnvironment } from '../lib/clinic-preview-policy.ts'

test('Clinic candidate distinguishes summaries and unverified attachment dates without changing Production', () => {
  const original = [phaseGuideMaterial('Jing')!, ...visiblePlanMaterials({
    attachments: [attachment('Romulo_hipocaloric_plan_Aug17.pdf')], kenkhoTier: null, weekInPhase: 3,
  })]
  const production = reviewClinicMaterials(original, isClinicPreviewEnvironment({ VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'myaq-clinic-functional-v1' }))
  assert.strictEqual(production, original)
  const preview = reviewClinicMaterials(original, isClinicPreviewEnvironment({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'myaq-clinic-functional-v1' }))
  assert.match(preview[0].titleEs, /Resumen/)
  assert.match(preview[1].detailEs, /Revisa sus fechas/)
  assert.equal(preview[1].url, original[1].url)
  assert.match(original[0].titleEs, /Guía/)
  assert.equal(isClinicPreviewEnvironment({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'main' }), false)
})

test('each published phase selects its own complete PDF and matching summary', () => {
  const files = [
    ['Jing', '1LKnUKnQy-7D7j5apKtnhtQfYJ0jmDkDS'],
    ['Qi', '1VREBJrvan2fZp9IpdNeyojnlX-emR8ij'],
    ['Xue', '1g0w3Ev1Ef3NSxzkrTnzX8XRCnSsRszLj'],
    ['Yang Sheng', '1Et8W7aM6llJO3TE3D2bAusrfpjoU4L3n'],
  ] as const
  const documentIds = new Set<string>()
  for (const [phase, fileId] of files) {
    const document = phaseGuideDocument(phase)!
    assert.equal(document.url, `/my-aqslim/materials/phase-document?phase=${phase.toLowerCase().replace(/\s+/g, '-')}`)
    assert.match(document.titleEs, new RegExp(phase))
    assert.ok(!documentIds.has(document.id))
    documentIds.add(document.id)
    const summary = phaseGuideMaterial(phase)!
    assert.equal(summary.id.replace('phase-guide-', 'phase-document-'), document.id)
    const reviewed = reviewClinicMaterials([summary, document], true)
    assert.match(reviewed[0].detailEs, /por separado/)
    assert.doesNotMatch(reviewed[0].detailEs, /no está vinculada/)
    assert.match(reviewed[1].detailEs, /revisión clínica/)
  }
})

test('an absent or unknown phase never falls back to another phase PDF', () => {
  for (const phase of [null, undefined, '', 'Sin fase', 'Tao', 'not-a-phase']) {
    assert.equal(phaseGuideDocument(phase), null)
  }
  assert.equal(phaseGuideDocument('Qi-Xue (Keto)')?.id, phaseGuideDocument('Jing')?.id)
})

const attachment = (filename: string): PlanMaterialAttachment => ({
  id: `att-${filename}`,
  filename,
  url: `https://example.test/${filename}`,
  type: 'application/pdf',
})

test('uses only the approved Kenkho Path tier names', () => {
  assert.equal(normalizeKenkhoTier('Start'), 'Start')
  assert.equal(normalizeKenkhoTier('Plus'), 'Plus')
  assert.equal(normalizeKenkhoTier('Elite'), 'Elite')
  assert.equal(normalizeKenkhoTier('Semirremoto'), null)
  assert.equal(normalizeKenkhoTier(''), null)
})

test('in-clinic participants do not receive remote Kenkho materials', () => {
  assert.equal(isPlanMaterialVisible({ filename: 'Quick-Start_ES.pdf', kenkhoTier: null, weekInPhase: 3 }), false)
  assert.equal(isPlanMaterialVisible({ filename: 'Cartografia_Semana_2.pdf', kenkhoTier: null, weekInPhase: 3 }), false)
  assert.equal(isPlanMaterialVisible({ filename: 'Romulo_hipocaloric_plan.pdf', kenkhoTier: null, weekInPhase: 3 }), true)
  assert.equal(isPlanMaterialVisible({ filename: 'Manual_del_Participante.pdf', kenkhoTier: null, weekInPhase: 3 }), true)
})

test('Kenkho cartographies are released only when their governed week is reached', () => {
  assert.equal(isPlanMaterialVisible({ filename: 'Cartografia_Semana_4.pdf', kenkhoTier: 'Plus', weekInPhase: 3 }), false)
  assert.equal(isPlanMaterialVisible({ filename: 'Cartografia_Semana_4.pdf', kenkhoTier: 'Plus', weekInPhase: 4 }), true)
  assert.equal(isPlanMaterialVisible({ filename: 'Cartografia_Semana_12.pdf', kenkhoTier: 'Elite', weekInPhase: 8 }), false)
})

test('assigned hypocaloric PDF is presented as the current nutrition plan', () => {
  const materials = visiblePlanMaterials({
    attachments: [attachment('Romulo_hipocaloric_plan.pdf')],
    kenkhoTier: null,
    weekInPhase: 3,
  })
  assert.equal(materials.length, 1)
  assert.equal(materials[0].kind, 'nutrition-plan')
  assert.equal(materials[0].titleEs, 'Plan hipocalórico')
})

test('the patient UI renders governed material links', async () => {
  const view = await readFile(new URL('../app/my-aqslim/materials/materials-view.tsx', import.meta.url), 'utf8')
  assert.match(view, /materials\.map/)
  assert.match(view, /href=\{item\.url\}/)
  assert.doesNotMatch(view, /Cartografía Semana \$\{week/)
})

test('the published phase produces the matching governed phase guide', () => {
  assert.equal(getPhaseGuide('Jing')?.number, 1)
  assert.equal(getPhaseGuide('Qi')?.number, 2)
  assert.equal(getPhaseGuide('Xue')?.number, 3)
  assert.equal(getPhaseGuide('Yang Sheng')?.number, 4)
  assert.equal(getPhaseGuide('Sin fase'), null)
  assert.equal(phaseGuideMaterial('Jing')?.url, '/my-aqslim/materials/phase-guide')
  assert.match(phaseGuideMaterial('Jing')?.titleEs ?? '', /Jing/)
})

test('Previous nutrition is marked only in Preview and preserves the file', () => {
 const materials = visiblePlanMaterials({attachments:[attachment('old_hipocaloric.pdf')],kenkhoTier:null,weekInPhase:1})
 assert.strictEqual(reviewClinicMaterials(materials,false,true),materials)
 const previous = reviewClinicMaterials(materials,true,true)[0]
 assert.equal(previous.previous,true)
 assert.equal(previous.url,materials[0].url)
 assert.match(previous.typeEs,/No vigente/)
 assert.equal(reviewClinicMaterials(materials,true)[0].previous,undefined)
})
