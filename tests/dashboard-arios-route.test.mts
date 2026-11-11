import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

test('ARIOS authorizes before provider access, keeps responses private, and contains provider failures', async () => {
  const source = await readFile(new URL('../app/api/preview/clinic-arios/route.ts', import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  let actor: { email: string } | null = null
  let enabled = true, calls = 0, failure = false
  const env: Record<string, string> = { OPENAI_API_KEY: 'synthetic-key', OPENAI_AQ_BUDDY_MODEL: 'synthetic-model' }
  const exports: any = {}
  const mocks: Record<string, unknown> = {
    'next/server': { NextResponse: { json: (body: unknown, options?: ResponseInit) => Response.json(body, options) } },
    '@/lib/auth': { getActor: async () => actor },
    '@/lib/clinic-runtime-policy': { isClinicRuntimeEnvironment: () => enabled, isClinicRuntimeFounderIdentity: ({ email }: { email: string }) => email === 'founder@example.test' },
  }
  vm.runInNewContext(code, { exports, require: (name: string) => { if (!(name in mocks)) throw new Error(name); return mocks[name] }, process: { env }, AbortSignal, console: { error() {} }, fetch: async (_: string, options: RequestInit) => {
    calls++; assert.equal(options.cache, 'no-store')
    const body = JSON.parse(String(options.body)); assert.equal(body.model, 'synthetic-model'); assert.equal(body.input, 'How do I publish a plan?')
    if (failure) throw new Error('synthetic network error')
    return Response.json({ output: [{ content: [{ text: 'Review the plan and confirm publication.' }] }] })
  } })
  const req = (origin = 'https://example.test') => ({ nextUrl: new URL('https://example.test/api'), headers: new Headers({ origin }), json: async () => ({ message: 'How do I publish a plan?' }) })
  assert.equal((await exports.GET()).status, 401)
  actor = { email: 'collaborator@example.test' }; assert.equal((await exports.POST(req())).status, 403); assert.equal(calls, 0)
  actor = { email: 'founder@example.test' }; assert.equal((await exports.POST(req('https://other.test'))).status, 403); assert.equal(calls, 0)
  const metadata = await exports.GET(); assert.deepEqual(await metadata.json(), { ok: true, configured: true }); assert.equal(calls, 0)
  const response = await exports.POST(req()); assert.equal(response.status, 200); assert.match(response.headers.get('Cache-Control')!, /private.*no-store/)
  assert.equal((await response.json()).text, 'Review the plan and confirm publication.')
  failure = true; assert.equal((await exports.POST(req())).status, 503)
  delete env.OPENAI_API_KEY; assert.equal((await exports.POST(req())).status, 503)
  enabled = false; assert.equal((await exports.GET()).status, 404)
})
