import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const source = await readFile(
  new URL('../app/api/webhooks/booking/route.ts', import.meta.url),
  'utf8',
)

test('booking webhook does not initialize Resend while Next.js collects route data', () => {
  const postStart = source.indexOf('export async function POST')
  const resendInitialization = source.indexOf('new Resend(')

  assert.ok(postStart >= 0)
  assert.ok(resendInitialization > postStart)
})

test('booking webhook fails closed when either Resend secret is unavailable', () => {
  assert.match(source, /if \(!webhookSecret\)/)
  assert.match(source, /if \(!resendApiKey\)/)
  assert.match(source, /status: 503/)
})
