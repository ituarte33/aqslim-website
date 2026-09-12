'use client'

import { useEffect, useState } from 'react'

type ProbeSnapshot = {
  portionPercent?: number
  reanalysisRemaining?: number
}

type ProbeResult = {
  status: 'idle' | 'running' | 'pass' | 'fail'
  httpStatus?: number
  error?: string
  used?: number
  limit?: number
  remaining?: number
}

export function ReanalysisLimitProbe({ mealLogId }: { mealLogId: string }) {
  const [snapshot, setSnapshot] = useState<ProbeSnapshot | null>(null)
  const [result, setResult] = useState<ProbeResult>({ status: 'idle' })

  useEffect(() => {
    fetch(`/api/food-scan/saved/${mealLogId}`, { cache: 'no-store' })
      .then(async response => response.ok ? response.json() : null)
      .then(data => setSnapshot(data))
      .catch(() => setSnapshot(null))
  }, [mealLogId])

  if (!snapshot || snapshot.reanalysisRemaining !== 0) return null

  async function runProbe() {
    if (result.status === 'running') return
    setResult({ status: 'running' })

    try {
      const response = await fetch(`/api/food-scan/saved/${mealLogId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correction: 'Mantén exactamente los mismos ingredientes y cantidades.',
          portionPercent: snapshot?.portionPercent ?? 100,
          language: 'es',
        }),
      })
      const data = await response.json().catch(() => ({}))
      const passed = response.status === 429 && data.error === 'reanalysis_limit_reached'

      setResult({
        status: passed ? 'pass' : 'fail',
        httpStatus: response.status,
        error: data.error,
        used: data.reanalysisUsed,
        limit: data.reanalysisLimit,
        remaining: data.reanalysisRemaining,
      })
    } catch {
      setResult({ status: 'fail' })
    }
  }

  return (
    <section style={{ background: '#151515', border: '1px solid #3f3a2b', padding: 22, marginTop: 18 }}>
      <h2 style={{ marginTop: 0 }}>Prueba D10 · tercera corrección</h2>
      <p style={{ color: '#aaa', lineHeight: 1.6 }}>
        Esta prueba salta únicamente el botón deshabilitado de la interfaz y llama al mismo endpoint de corrección con tu sesión autenticada. El resultado esperado es HTTP 429 antes de cualquier reanálisis adicional.
      </p>
      <button
        type="button"
        onClick={() => void runProbe()}
        disabled={result.status === 'running' || result.status === 'pass'}
        style={{ padding: '13px 18px', background: '#d5b34c', color: '#111', border: 0, fontWeight: 700, cursor: result.status === 'running' ? 'wait' : 'pointer' }}
      >
        {result.status === 'running' ? 'Probando…' : result.status === 'pass' ? 'Bloqueo confirmado' : 'Probar bloqueo de tercera corrección'}
      </button>

      {result.status === 'pass' ? (
        <div style={{ marginTop: 16, color: '#d5b34c', lineHeight: 1.6 }}>
          <strong>PASS</strong><br />
          HTTP {result.httpStatus} · {result.error}<br />
          Usadas: {result.used} de {result.limit} · Restantes: {result.remaining}
        </div>
      ) : null}

      {result.status === 'fail' ? (
        <div style={{ marginTop: 16, color: '#e6b7b7', lineHeight: 1.6 }}>
          <strong>REVIEW REQUIRED</strong><br />
          {result.httpStatus ? `HTTP ${result.httpStatus}` : 'No se pudo completar la prueba.'}
          {result.error ? ` · ${result.error}` : ''}
        </div>
      ) : null}
    </section>
  )
}
