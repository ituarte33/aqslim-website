import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import { businessDateTimeToUtc } from '../lib/business-time.ts'

test('a next-appointment failure reports the saved visit rather than offering a duplicate retry', async () => {
  const source = await readFile(new URL('../app/dashboard/consulta-subsecuente/actions.ts', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  let creates = 0
  let failCreate = false
  let denied = false
  const exports: any = {}
  const mocks: Record<string, unknown> = {
    '@/lib/airtable': {
      createConsulta: async () => { if (failCreate) throw new Error('write failed'); creates++; return { id: 'recSavedVisit' } },
      updateCliente: async () => { throw new Error('appointment update failed') },
      CLIENTES_FIELDS: { PROXIMA_CITA: 'next' },
      getClienteById: async () => ({ id: 'recPatient', fields: {} }),
    },
    '@/lib/business-time': { businessDateTimeToUtc },
    '@/lib/auth': { requireCapability: async () => { if (denied) throw new Error('FORBIDDEN'); return { email: 'operator@example.test' } } },
    '@/lib/clinic-runtime-policy': { clinicWritesPaused: () => false },
    '@/lib/clinic-access-after-consultation': { updateAccessAfterCompletedConsultation: async () => ({ action: 'unchanged' }) },
    '@/lib/clinic-patient-administration-policy': { patientIsUnavailable: () => false },
  }
  vm.runInNewContext(code, { exports, require: (name: string) => { if (!(name in mocks)) throw new Error(name); return mocks[name] }, console: { info() {}, error() {} }, Date })
  const form = new FormData()
  form.set('clienteRecordId', 'recPatient'); form.set('fechaConsulta', '2026-11-10'); form.set('proximaCita', '2026-11-17T19:00:00Z')
  const result = await exports.saveConsultaSubsecuente(form)
  assert.equal(result.id, 'recSavedVisit')
  assert.equal(creates, 1)
  assert.equal(result.warnings.length, 1)
  assert.match(result.warnings[0], /no vuelvas a guardar/)
  failCreate = true
  await assert.rejects(exports.saveConsultaSubsecuente(form), /write failed/)
  assert.equal(creates, 1)
  denied = true
  await assert.rejects(exports.saveConsultaSubsecuente(form), /FORBIDDEN/)
  assert.equal(creates, 1)
})
