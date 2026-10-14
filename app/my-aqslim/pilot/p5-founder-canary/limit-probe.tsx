'use client'

import { useState } from 'react'

type ProbeResult = {
  status: number
  body: unknown
} | null

export default function LimitProbe() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ProbeResult>(null)

  async function runProbe() {
    setRunning(true)
    setResult(null)
    try {
      const response = await fetch('/api/food-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      let body: unknown = null
      try {
        body = await response.json()
      } catch {
        body = null
      }
      setResult({ status: response.status, body })
    } finally {
      setRunning(false)
    }
  }

  const passed = result?.status === 429
    && typeof result.body === 'object'
    && result.body !== null
    && (result.body as Record<string, unknown>).error === 'limit_reached'
    && (result.body as Record<string, unknown>).period === 'day'

  return (
    <section style={{ border: '1px solid #444', padding: 20, marginTop: 18, background: '#151515' }}>
      <h2>Live backend daily-limit probe</h2>
      <p>
        This bypasses only the disabled scanner button and calls the real <code>POST /api/food-scan</code>
        with your authenticated session. The expected result is HTTP 429 before any food payload or AI provider call.
      </p>
      <button
        type="button"
        onClick={runProbe}
        disabled={running}
        style={{ padding: '12px 18px', cursor: running ? 'wait' : 'pointer' }}
      >
        {running ? 'Running…' : 'Run backend limit probe'}
      </button>
      {result && (
        <div style={{ marginTop: 14 }}>
          <p>Status: <strong>{passed ? 'PASS' : 'REVIEW REQUIRED'}</strong></p>
          <p>HTTP: <strong>{result.status}</strong></p>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(result.body, null, 2)}</pre>
        </div>
      )}
    </section>
  )
}
