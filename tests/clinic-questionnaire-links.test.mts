import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

async function reader(records: Record<string, unknown>) {
  const source = await readFile(new URL('../lib/airtable.ts', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const calls: string[] = []
  const exports: Record<string, any> = {}
  vm.runInNewContext(code, { exports, process: { env: { AIRTABLE_BASE_ID: 'synthetic', AIRTABLE_PAT: 'synthetic' } },
    require: () => ({}), console, crypto,
    fetch: async (url: string, options: { method?: string }) => {
      assert.equal(options.method ?? 'GET', 'GET')
      calls.push(url)
      const id = url.split('/').at(-1)!
      if (!(id in records)) throw new Error('Unexpected provider read')
      return { ok: true, json: async () => records[id] }
    },
  })
  return { read: exports.getCuestionariosForPatient, calls }
}

test('merged questionnaires are read by canonical links despite original names, once and without unrelated records', async () => {
  const id = 'recABCDEFGHIJKLMN'
  const record = { id, createdTime: '2026-09-14T12:00:00Z', fields: { 'Nombre Cliente': 'Original duplicate name', 'TOTAL GENERAL': 12 } }
  const { read, calls } = await reader({ [id]: record })
  const result = await read({ id: 'rec12345678901234', fields: { 'Nombre Completo': 'Canonical name', 'Cuestionario Sintomas': [id, id] } })
  assert.equal(result.length, 1)
  assert.equal(result[0], record)
  assert.equal(calls.length, 1)
  assert.match(calls[0], /tblRn6LRSb8XhKOl7\/recABCDEFGHIJKLMN$/)
})

test('missing links never select another person by name; malformed links and provider ID mismatches fail closed', async () => {
  const { read, calls } = await reader({ recABCDEFGHIJKLMN: { id: 'recZYXWVUTSRQPONM', fields: {} } })
  assert.equal((await read({ id: 'rec12345678901234', fields: { 'Nombre Completo': 'Shared name' } })).length, 0)
  await assert.rejects(read({ id: 'rec12345678901234', fields: { 'Cuestionario Sintomas': ['bad'] } }), /Invalid questionnaire links/)
  assert.equal(calls.length, 0)
  await assert.rejects(read({ id: 'rec12345678901234', fields: { 'Cuestionario Sintomas': ['recABCDEFGHIJKLMN'] } }), /Invalid questionnaire record/)
})
