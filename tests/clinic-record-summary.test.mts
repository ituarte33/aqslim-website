import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Clinic Preview opens a read-only clinical summary with the complete patient context', async () => {
  const page = await readFile(new URL('../app/clinic-preview/page.tsx', import.meta.url), 'utf8')
  const preview = await readFile(new URL('../app/clinic-preview/clinic-preview-client.tsx', import.meta.url), 'utf8')

  for (const field of [
    "patient.fields['Edad']",
    "patient.fields['Fecha Nacimiento']",
    "patient.fields['Estatura (cm)']",
    "patient.fields['Peso Meta']",
    "patient.fields['Condiciones Especiales / Alergias']",
  ]) assert.match(page, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

  assert.match(preview, /const tabs = \['Resumen'/)
  assert.match(preview, /useState<Tab>\('Resumen'\)/)
  assert.match(preview, /function choosePatient\(id: string\)[\s\S]*?setActiveTab\('Resumen'\)/)
  assert.match(preview, /Resumen clínico/)
  assert.match(preview, /Condiciones especiales \/ alergias/)
  assert.match(preview, /Estado clínico actual/)
  assert.match(preview, /Sólo lectura/)
})

test('Clinic clinical summary is responsive on tablet and mobile', async () => {
  const styles = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8')
  assert.match(styles, /@media \(max-width: 860px\)[\s\S]*?\.clinic-preview-summary-grid \{ grid-template-columns: minmax\(0, 1fr\) !important; \}/)
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?\.clinic-preview-summary-fields \{ grid-template-columns: minmax\(0, 1fr\) !important; \}/)
})
