'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type Plan = 'free' | 'mid' | 'top'

interface ScanResult {
  food: string
  calories: number
  carbs: number
  fats: number
  proteins: number
  notes: string
  used: number
  limit: number
  remaining: number
}

interface LogEntry {
  id: string
  createdTime: string
  fields: {
    'Food Description'?: string
    'Calories'?: number
    'Carbs (g)'?: number
    'Fats (g)'?: number
    'Proteins (g)'?: number
    'Date'?: string
    'Timestamp'?: string
    'Meal Type'?: string
  }
}

const PLAN_LABELS: Record<Plan, string> = {
  free: 'Free Edition',
  mid:  'Mid Tier',
  top:  'Top Tier',
}

export function ScannerClient({ plan, userName }: { plan: string; userName: string }) {
  const typedPlan = (plan as Plan) in PLAN_LABELS ? (plan as Plan) : 'free'

  const [image, setImage]       = useState<string | null>(null)
  const [mimeType, setMimeType] = useState<'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'>('image/jpeg')
  const [mealType, setMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Other'>('Other')
  const [scanning, setScanning] = useState(false)
  const [result, setResult]     = useState<ScanResult | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [used, setUsed]         = useState(0)
  const [limit, setLimit]       = useState(1)
  const [logs, setLogs]         = useState<LogEntry[]>([])
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Load today's usage + history on mount
  useEffect(() => {
    fetch('/api/food-scan')
      .then(r => r.json())
      .then(d => {
        setUsed(d.used ?? 0)
        setLimit(d.limit ?? 1)
        setLogs(d.logs ?? [])
      })
      .catch(() => {})
  }, [])

  function loadFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.')
      return
    }
    setError(null)
    setResult(null)
    setMimeType(file.type as typeof mimeType)
    const reader = new FileReader()
    reader.onload = e => setImage(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function analyze() {
    if (!image || scanning) return
    setScanning(true)
    setError(null)

    const base64 = image.split(',')[1]

    try {
      const res = await fetch('/api/food-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType, mealType }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'limit_reached') {
          setError(`Daily limit reached (${data.limit} scan${data.limit > 1 ? 's' : ''} for ${PLAN_LABELS[typedPlan]}). Upgrade for more.`)
        } else {
          setError('Analysis failed. Please try again.')
        }
        return
      }

      setResult(data)
      setUsed(data.used)
      // Prepend to log list
      setLogs(prev => [{
        id:          Date.now().toString(),
        createdTime: new Date().toISOString(),
        fields: {
          'Food Description': data.food,
          'Calories':         data.calories,
          'Carbs (g)':        data.carbs,
          'Fats (g)':         data.fats,
          'Proteins (g)':     data.proteins,
          'Date':             new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date()),
          'Timestamp':        new Date().toISOString(),
          'Meal Type':        mealType,
        },
      }, ...prev])
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  const remaining = limit - used
  const pct = (val: number, total: number) => total > 0 ? Math.min(100, Math.round((val / total) * 100)) : 0

  return (
    <div className="fs-page">
      {/* Header */}
      <header className="fs-header">
        <div className="fs-header-inner">
          <div>
            <div className="fs-logo">AQ<span>SLIM</span></div>
            <div className="fs-header-sub">Food Scanner</div>
          </div>
          <div className="fs-plan-badge">{PLAN_LABELS[typedPlan]}</div>
        </div>
      </header>

      <main className="fs-main">
        {/* Usage bar */}
        <div className="fs-usage-bar">
          <span className="fs-usage-label">
            {userName ? `${userName} · ` : ''}Today&apos;s scans
          </span>
          <div className="fs-usage-pips">
            {limit <= 10 ? (
              Array.from({ length: limit }).map((_, i) => (
                <div key={i} className={`fs-pip ${i < used ? 'used' : ''}`} />
              ))
            ) : (
              <>
                <div className="fs-usage-bar-track">
                  <div className="fs-usage-bar-fill" style={{ width: `${Math.min(100, Math.round((used / limit) * 100))}%` }} />
                </div>
                <span className="fs-usage-count">{used} / {limit}</span>
              </>
            )}
          </div>
          <span className="fs-usage-remain">
            {remaining > 0 ? `${remaining} remaining` : 'Limit reached'}
          </span>
        </div>

        <div className="fs-grid">
          {/* Upload panel */}
          <div className="fs-card">
            <div className="fs-card-title">Upload a meal photo</div>

            <div
              className={`fs-drop-zone ${dragging ? 'dragging' : ''} ${image ? 'has-image' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="Food preview" className="fs-preview-img" />
              ) : (
                <div className="fs-drop-placeholder">
                  <div className="fs-drop-icon">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <path d="M6 22l7-9 5 6 3-4 5 7H6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      <circle cx="21" cy="11" r="3" stroke="currentColor" strokeWidth="1.5"/>
                      <rect x="3" y="5" width="26" height="22" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div className="fs-drop-text">Drop photo here or click to browse</div>
                  <div className="fs-drop-hint">JPG, PNG, WEBP · max 5 MB</div>
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f) }}
            />

            <div className="fs-meal-type-row">
              {(['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Other'] as const).map(t => (
                <button
                  key={t}
                  className={`fs-meal-type-btn ${mealType === t ? 'active' : ''}`}
                  onClick={() => setMealType(t)}
                  type="button"
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="fs-btn-row">
              {image && (
                <button
                  className="fs-btn-secondary"
                  onClick={() => { setImage(null); setResult(null); setError(null) }}
                >
                  Clear
                </button>
              )}
              <button
                className="fs-btn-primary"
                onClick={analyze}
                disabled={!image || scanning || remaining <= 0}
              >
                {scanning ? 'Analyzing…' : 'Analyze Meal'}
              </button>
            </div>

            {error && <div className="fs-error">{error}</div>}
          </div>

          {/* Results panel */}
          {result ? (
            <div className="fs-card fs-result-card">
              <div className="fs-card-title">Nutrition Breakdown</div>
              <div className="fs-food-name">{result.food}</div>

              <div className="fs-calories-row">
                <div className="fs-calories-num">{result.calories}</div>
                <div className="fs-calories-label">kcal</div>
              </div>

              <div className="fs-macros">
                <MacroBar label="Carbs" value={result.carbs} color="#C9A84C" max={Math.max(result.carbs, result.fats, result.proteins)} />
                <MacroBar label="Fats"  value={result.fats}  color="#9A9590" max={Math.max(result.carbs, result.fats, result.proteins)} />
                <MacroBar label="Protein" value={result.proteins} color="#E2C87A" max={Math.max(result.carbs, result.fats, result.proteins)} />
              </div>

              <div className="fs-macro-totals">
                <MacroChip label="C" value={result.carbs} color="#C9A84C" />
                <MacroChip label="F" value={result.fats}  color="#9A9590" />
                <MacroChip label="P" value={result.proteins} color="#E2C87A" />
              </div>

              {result.notes && (
                <div className="fs-notes">{result.notes}</div>
              )}

              {/* Macro ratio ring */}
              <div className="fs-ratio-row">
                {[
                  { label: 'Carbs', pct: pct(result.carbs, result.carbs + result.fats + result.proteins), color: '#C9A84C' },
                  { label: 'Fats',  pct: pct(result.fats,  result.carbs + result.fats + result.proteins), color: '#9A9590' },
                  { label: 'Protein', pct: pct(result.proteins, result.carbs + result.fats + result.proteins), color: '#E2C87A' },
                ].map(m => (
                  <div key={m.label} className="fs-ratio-chip" style={{ borderColor: m.color }}>
                    <div className="fs-ratio-pct" style={{ color: m.color }}>{m.pct}%</div>
                    <div className="fs-ratio-label">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="fs-card fs-result-placeholder">
              <div className="fs-placeholder-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.5" opacity=".3"/>
                  <path d="M16 24h16M24 16v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".5"/>
                </svg>
              </div>
              <div className="fs-placeholder-text">Results will appear here after analysis</div>
            </div>
          )}
        </div>

        {/* Meal log */}
        {logs.length > 0 && (
          <div className="fs-log-section">
            <div className="fs-log-title">Meal Log</div>
            <div className="fs-log-list">
              {logs.map(log => (
                <div key={log.id} className="fs-log-row">
                  <div className="fs-log-food">
                    {log.fields['Meal Type'] && (
                      <span className="fs-log-type">{log.fields['Meal Type']}</span>
                    )}
                    {log.fields['Food Description'] ?? '—'}
                  </div>
                  <div className="fs-log-macros">
                    <span className="fs-log-cal">{log.fields['Calories'] ?? 0} kcal</span>
                    <span className="fs-log-m" style={{ color: '#C9A84C' }}>C {log.fields['Carbs (g)'] ?? 0}g</span>
                    <span className="fs-log-m" style={{ color: '#9A9590' }}>F {log.fields['Fats (g)'] ?? 0}g</span>
                    <span className="fs-log-m" style={{ color: '#E2C87A' }}>P {log.fields['Proteins (g)'] ?? 0}g</span>
                  </div>
                  <div className="fs-log-date">
                    {log.fields['Timestamp']
                      ? new Date(log.fields['Timestamp']).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                      : log.fields['Date'] ?? ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upgrade prompt for free users */}
        {typedPlan === 'free' && (
          <div className="fs-upgrade-banner">
            <div className="fs-upgrade-text">
              <strong>Want more scans?</strong> Upgrade your plan to scan 3× or unlimited meals per day.
            </div>
            <a href="/#services" className="fs-upgrade-btn">View Plans</a>
          </div>
        )}
      </main>
    </div>
  )
}

function MacroBar({ label, value, color, max }: { label: string; value: number; color: string; max: number }) {
  const width = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="fs-macro-bar-row">
      <div className="fs-macro-bar-label">{label}</div>
      <div className="fs-macro-bar-track">
        <div className="fs-macro-bar-fill" style={{ width: `${width}%`, background: color }} />
      </div>
      <div className="fs-macro-bar-val">{value}g</div>
    </div>
  )
}

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="fs-macro-chip">
      <div className="fs-macro-chip-label" style={{ color }}>{label}</div>
      <div className="fs-macro-chip-val">{value}g</div>
    </div>
  )
}
