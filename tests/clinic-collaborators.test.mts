import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { isClinicRuntimeOperatorIdentity, isClinicRuntimeFounderIdentity, CLINIC_RELEASE_BRANCH } from '../lib/clinic-runtime-policy.ts'

test('Clinic collaboration requires exact configured email, verified identity and an enabled runtime', () => {
  const saved = process.env.MYAQ_CLINIC_COLLABORATOR_EMAILS
  process.env.MYAQ_CLINIC_COLLABORATOR_EMAILS = 'editor@example.test, second@example.test'
  try {
    const environment = { VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: CLINIC_RELEASE_BRANCH, MYAQ_CLINIC_ENABLED: 'enabled' }
    const identity = { email: ' EDITOR@EXAMPLE.TEST ', emailVerified: true, environment }
    assert.equal(isClinicRuntimeOperatorIdentity(identity), true)
    assert.equal(isClinicRuntimeOperatorIdentity({ ...identity, emailVerified: false }), false)
    assert.equal(isClinicRuntimeOperatorIdentity({ ...identity, emailVerified: undefined }), false)
    assert.equal(isClinicRuntimeOperatorIdentity({ ...identity, email: 'other@example.test' }), false)
    assert.equal(isClinicRuntimeOperatorIdentity({ ...identity, email: 'editor@example.test.attacker.test' }), false)
    assert.equal(isClinicRuntimeOperatorIdentity({ ...identity, environment: { ...environment, MYAQ_CLINIC_ENABLED: '' } }), false)
    assert.equal(isClinicRuntimeFounderIdentity(identity), false)
    delete process.env.MYAQ_CLINIC_COLLABORATOR_EMAILS
    assert.equal(isClinicRuntimeOperatorIdentity(identity), false)
    assert.equal(isClinicRuntimeOperatorIdentity({ ...identity, email: 'rom@ituarteconsulting.com' }), true)
  } finally {
    if (saved === undefined) delete process.env.MYAQ_CLINIC_COLLABORATOR_EMAILS
    else process.env.MYAQ_CLINIC_COLLABORATOR_EMAILS = saved
  }
})

test('Clinic operators do not inherit founder-only executive or private guide import access', async () => {
  for (const path of ['app/api/preview/clinic-arios/route.ts', 'app/api/preview/clinic-private-guide/route.ts']) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
    assert.match(source, /isClinicRuntimeFounderIdentity/)
    assert.doesNotMatch(source, /isClinicRuntimeOperatorIdentity/)
  }
  const auth = await readFile(new URL('../lib/auth.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(auth, /isClinicCollaboratorEmail/)
  assert.match(auth, /address\.verification\?\.status === 'verified'/)
})
