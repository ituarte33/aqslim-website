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
import { getPhaseGuide, phaseGuideMaterial } from '../lib/phase-materials.ts'
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
