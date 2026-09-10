import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_AQ_BUDDY_OPENAI_MODEL,
  parseOpenAIResponseSSEBlock,
  resolveAQBuddyProvider,
} from '../lib/aq-buddy-openai.ts'

test('OpenAI is selected when a key is available and Anthropic was not forced', () => {
  assert.deepEqual(resolveAQBuddyProvider({ hasOpenAIKey: true }), {
    provider: 'openai',
    reason: 'openai_selected',
  })
})

test('Anthropic remains a safe Preview fallback when the OpenAI key is absent', () => {
  assert.deepEqual(resolveAQBuddyProvider({ hasOpenAIKey: false }), {
    provider: 'anthropic',
    reason: 'openai_key_missing',
  })
})

test('Anthropic can be explicitly forced during Preview rollback', () => {
  assert.deepEqual(resolveAQBuddyProvider({ requestedProvider: 'anthropic', hasOpenAIKey: true }), {
    provider: 'anthropic',
    reason: 'anthropic_forced',
  })
})

test('the default Preview OpenAI model is the cost-sensitive Luna tier', () => {
  assert.equal(DEFAULT_AQ_BUDDY_OPENAI_MODEL, 'gpt-5.6-luna')
})

test('Responses API text delta events are extracted without changing text', () => {
  const parsed = parseOpenAIResponseSSEBlock(
    'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"Hola Rom"}',
  )
  assert.deepEqual(parsed, { deltas: ['Hola Rom'], errorMessage: null })
})

test('non-text Responses API events are ignored', () => {
  assert.deepEqual(
    parseOpenAIResponseSSEBlock('event: response.created\ndata: {"type":"response.created"}'),
    { deltas: [], errorMessage: null },
  )
})

test('Responses API stream errors are surfaced to the provider layer', () => {
  const parsed = parseOpenAIResponseSSEBlock(
    'event: error\ndata: {"type":"error","error":{"message":"provider problem"}}',
  )
  assert.deepEqual(parsed, { deltas: [], errorMessage: 'provider problem' })
})
