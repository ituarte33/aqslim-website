export const DEFAULT_AQ_BUDDY_OPENAI_MODEL = 'gpt-5.6-luna'

export type AQBuddyProvider = 'openai' | 'anthropic'

export type AQBuddyProviderDecision = {
  provider: AQBuddyProvider
  reason: 'openai_selected' | 'openai_key_missing' | 'anthropic_forced'
}

export function resolveAQBuddyProvider({
  requestedProvider,
  hasOpenAIKey,
}: {
  requestedProvider?: string
  hasOpenAIKey: boolean
}): AQBuddyProviderDecision {
  if (requestedProvider?.trim().toLowerCase() === 'anthropic') {
    return { provider: 'anthropic', reason: 'anthropic_forced' }
  }
  if (!hasOpenAIKey) {
    return { provider: 'anthropic', reason: 'openai_key_missing' }
  }
  return { provider: 'openai', reason: 'openai_selected' }
}

type OpenAIStreamEvent = {
  type?: string
  delta?: string
  message?: string
  error?: { message?: string }
}

export function parseOpenAIResponseSSEBlock(block: string): {
  deltas: string[]
  errorMessage: string | null
} {
  const data = block
    .split(/\r?\n/)
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trimStart())
    .join('\n')
    .trim()

  if (!data || data === '[DONE]') return { deltas: [], errorMessage: null }

  let event: OpenAIStreamEvent
  try {
    event = JSON.parse(data) as OpenAIStreamEvent
  } catch {
    return { deltas: [], errorMessage: null }
  }

  if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') {
    return { deltas: [event.delta], errorMessage: null }
  }

  if (event.type === 'error') {
    return {
      deltas: [],
      errorMessage: event.error?.message || event.message || 'OpenAI stream error',
    }
  }

  return { deltas: [], errorMessage: null }
}
