import 'server-only'

import {
  DEFAULT_AQ_BUDDY_OPENAI_MODEL,
  parseOpenAIResponseSSEBlock,
} from './aq-buddy-provider-policy'

export type AQBuddyOpenAIMessage = {
  role: 'user' | 'assistant'
  content: string
}

export function configuredAQBuddyOpenAIModel(): string {
  return process.env.OPENAI_AQ_BUDDY_MODEL?.trim() || DEFAULT_AQ_BUDDY_OPENAI_MODEL
}

export function hasOpenAIAQBuddyKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

export async function* streamOpenAIAQBuddyText({
  instructions,
  messages,
  maxOutputTokens = 2048,
}: {
  instructions: string
  messages: readonly AQBuddyOpenAIMessage[]
  maxOutputTokens?: number
}): AsyncGenerator<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

  const model = configuredAQBuddyOpenAIModel()
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions,
      input: messages,
      max_output_tokens: maxOutputTokens,
      stream: true,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const requestId = response.headers.get('x-request-id')
    throw new Error(`OpenAI request failed with status ${response.status}${requestId ? ` (${requestId})` : ''}`)
  }
  if (!response.body) throw new Error('OpenAI response body unavailable')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let separatorIndex = buffer.search(/\r?\n\r?\n/)
    while (separatorIndex >= 0) {
      const block = buffer.slice(0, separatorIndex)
      const separatorMatch = buffer.slice(separatorIndex).match(/^\r?\n\r?\n/)
      buffer = buffer.slice(separatorIndex + (separatorMatch?.[0].length ?? 2))

      const parsed = parseOpenAIResponseSSEBlock(block)
      if (parsed.errorMessage) throw new Error(parsed.errorMessage)
      for (const delta of parsed.deltas) yield delta

      separatorIndex = buffer.search(/\r?\n\r?\n/)
    }
  }

  buffer += decoder.decode()
  if (buffer.trim()) {
    const parsed = parseOpenAIResponseSSEBlock(buffer)
    if (parsed.errorMessage) throw new Error(parsed.errorMessage)
    for (const delta of parsed.deltas) yield delta
  }
}
