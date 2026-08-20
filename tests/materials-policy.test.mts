import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  isPlanMaterialVisible,
  normalizeKenkhoTier,
  visiblePlanMaterials,
  type PlanMaterialAttachment,
} from '../lib/materials-policy.ts'

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

test('the patient UI renders real assigned links instead of invented phase cards', async () => {
  const view = await readFile(new URL('../app/my-aqslim/materials/materials-view.tsx', import.meta.url), 'utf8')
  assert.match(view, /materials\.map/)
  assert.match(view, /href=\{item\.url\}/)
  assert.doesNotMatch(view, /Cartografía Semana \$\{week/)
  assert.doesNotMatch(view, /Guía \$\{phase/)
})
