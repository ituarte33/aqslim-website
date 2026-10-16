import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Clinic functional V1 stays bound to its isolated Preview branch and Rom', async () => {
  const policy = await readFile(new URL('../lib/clinic-preview-policy.ts', import.meta.url), 'utf8')

  assert.match(policy, /CLINIC_PREVIEW_BRANCH = 'myaq-clinic-functional-v1'/)
  assert.match(policy, /CLINIC_FOUNDER_EMAIL = 'rom@ituarteconsulting\.com'/)
  assert.match(policy, /environment\.VERCEL_ENV === 'preview'/)
})

test('Clinic functional V1 provides a guided, refreshable patient workflow', async () => {
  const client = await readFile(new URL('../app/clinic-preview/clinic-preview-client.tsx', import.meta.url), 'utf8')

  assert.match(client, /FUNCIONAL V1 · PREVIEW SEGURO · Sólo Rom/)
  assert.match(client, /Flujo funcional V1/)
  assert.match(client, /1\. Revisar expediente/)
  assert.match(client, /2\. Registrar consulta/)
  assert.match(client, /3\. Preparar y publicar plan/)
  assert.match(client, /4\. Verificar acceso My AQSLIM/)
  assert.match(client, /function refreshPatient\(\)/)
  assert.match(client, /↻ Actualizar expediente/)
})

test('Clinic functional V1 shows one patient screen at a time on mobile', async () => {
  const [client, styles] = await Promise.all([
    readFile(new URL('../app/clinic-preview/clinic-preview-client.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/globals.css', import.meta.url), 'utf8'),
  ])

  assert.match(client, /showPatientPicker/)
  assert.match(client, /Cambiar paciente/)
  assert.match(client, /clinic-preview-sidebar\$\{showPatientPicker \? ' is-open' : ''\}/)
  assert.match(styles, /\.clinic-preview-sidebar \{[\s\S]*?display: none;/)
  assert.match(styles, /\.clinic-preview-sidebar\.is-open \{ display: block; \}/)
})
