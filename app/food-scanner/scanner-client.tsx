'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { FoodLogWidget, type LogEntry } from '../food-log-widget'
import type { FoodScanPlan } from '@/lib/food-scan-policy'

type Plan = FoodScanPlan

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
  monthlyUsed: number
  monthlyLimit: number
  monthlyRemaining: number
}

const DISCLOSURE_KEY = 'aqslim-food-scan-disclosure-v1'
const MAX_IMAGE_EDGE = 1600

async function dataUrlFromBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function optimizeImage(file: File): Promise<{ dataUrl: string; mimeType: 'image/jpeg' }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas unavailable')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(value => value ? resolve(value) : reject(new Error('Image conversion failed')), 'image/jpeg', 0.82)
  })
  return { dataUrl: await dataUrlFromBlob(blob), mimeType: 'image/jpeg' }
}

function getLang(): 'es' | 'en' {
  if (typeof document === 'undefined') return 'es'
  return document.body.classList.contains('lang-en') ? 'en' : 'es'
}

const COPY = {
  es: {
    sub:        'Escáner de AQ Buddy',
    dashboard:  '← Panel',
    home:       '← Inicio',
    usage:      (name: string) => `${name ? name + ' · ' : ''}Escaneos de hoy`,
    monthlyUsage: (used: number, limit: number) => `${used} de ${limit} este mes`,
    remaining:  (n: number) => `${n} restante${n !== 1 ? 's' : ''}`,
    limitReached: 'Límite alcanzado',
    uploadTitle: 'Sube una foto de tu comida',
    dropText:   'Suelta aquí o haz clic para buscar',
    dropHint:   'JPG, PNG, WEBP · máx. 5 MB',
    mealTypes:  { Breakfast: 'Desayuno', Lunch: 'Almuerzo', Dinner: 'Cena', Snack: 'Bocadillo', Other: 'Otro' } as Record<string, string>,
    clear:      'Borrar',
    analyze:    'Analizar con AQ Buddy',
    analyzing:  'Analizando…',
    nutritionTitle: 'Estimación Nutricional',
    carbs:      'Carbos',
    fats:       'Grasas',
    protein:    'Proteína',
    kcal:       'kcal',
    placeholder: 'Los resultados aparecerán aquí tras el análisis',
    wantMore:   '¿Quieres más escaneos?',
    upgradeText: 'Con Kenkho Start, Plus o Elite puedes registrar más comidas cada día.',
    viewPlans:  'Ver Planes',
    plans:      { free: 'Edición Gratuita', start: 'Kenkho Start', plus: 'Kenkho Plus', elite: 'Kenkho Elite', pilot: 'Soft Start' } as Record<Plan, string>,
    limitError: (limit: number, plan: string, period: 'day' | 'month') =>
      `Límite ${period === 'month' ? 'mensual' : 'diario'} alcanzado (${limit} escaneo${limit !== 1 ? 's' : ''} para ${plan}).`,
    estimateNotice: 'Valores aproximados para fines informativos. Confirma las porciones e ingredientes para mejorar la estimación.',
    disclosureTitle: 'Antes de tu primer análisis',
    disclosureBody: 'AQ Buddy utiliza análisis automatizado de imágenes para estimar calorías, carbohidratos, grasas y proteínas. Los resultados pueden contener errores y variar según las porciones, los ingredientes y la preparación.',
    disclosureDetail: 'Esta referencia no sustituye una etiqueta nutricional ni la orientación de un profesional de salud.',
    disclosureAccept: 'Entiendo · Continuar',
    failError:    'El análisis falló. Inténtalo de nuevo.',
    networkError: 'Error de red. Inténtalo de nuevo.',
    imageError:   'Por favor sube un archivo de imagen.',
    sizeError:    'La imagen debe ser menor a 5 MB.',
  },
  en: {
    sub:        'AQ Buddy Scanner',
    dashboard:  '← Dashboard',
    home:       '← Home',
    usage:      (name: string) => `${name ? name + ' · ' : ''}Today's scans`,
    monthlyUsage: (used: number, limit: number) => `${used} of ${limit} this month`,
    remaining:  (n: number) => `${n} remaining`,
    limitReached: 'Limit reached',
    uploadTitle: 'Upload a meal photo',
    dropText:   'Drop photo here or click to browse',
    dropHint:   'JPG, PNG, WEBP · max 5 MB',
    mealTypes:  { Breakfast: 'Breakfast', Lunch: 'Lunch', Dinner: 'Dinner', Snack: 'Snack', Other: 'Other' } as Record<string, string>,
    clear:      'Clear',
    analyze:    'Analyze with AQ Buddy',
    analyzing:  'Analyzing…',
    nutritionTitle: 'Nutrition Estimate',
    carbs:      'Carbs',
    fats:       'Fats',
    protein:    'Protein',
    kcal:       'kcal',
    placeholder: 'Results will appear here after analysis',
    wantMore:   'Want more scans?',
    upgradeText: 'Kenkho Start, Plus, or Elite lets you log more meals each day.',
    viewPlans:  'View Plans',
    plans:      { free: 'Free Edition', start: 'Kenkho Start', plus: 'Kenkho Plus', elite: 'Kenkho Elite', pilot: 'Soft Start' } as Record<Plan, string>,
    limitError: (limit: number, plan: string, period: 'day' | 'month') =>
      `${period === 'month' ? 'Monthly' : 'Daily'} limit reached (${limit} scan${limit !== 1 ? 's' : ''} for ${plan}).`,
    estimateNotice: 'Approximate values for informational use. Confirm portions and ingredients to improve the estimate.',
    disclosureTitle: 'Before your first analysis',
    disclosureBody: 'AQ Buddy uses automated image analysis to estimate calories, carbohydrates, fats, and protein. Results may contain errors and vary with portions, ingredients, and preparation.',
    disclosureDetail: 'This reference does not replace a nutrition label or guidance from a healthcare professional.',
    disclosureAccept: 'I understand · Continue',
    failError:    'Analysis failed. Please try again.',
    networkError: 'Network error. Please try again.',
    imageError:   'Please upload an image file.',
    sizeError:    'Image must be under 5 MB.',
  },
}

export function ScannerClient({ plan, userName }: { plan: string; userName: string }) {
  const typedPlan = (plan as Plan) in COPY.en.plans ? (plan as Plan) : 'free'

  const [lang, setLang]          = useState<'es' | 'en'>('es')
  const [image, setImage]        = useState<string | null>(null)
  const [mimeType, setMimeType]  = useState<'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'>('image/jpeg')
  const [mealType, setMealType]  = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Other'>('Other')
  const [scanning, setScanning]  = useState(false)
  const [result, setResult]      = useState<ScanResult | null>(null)
  const [error, setError]        = useState<string | null>(null)
  const [used, setUsed]          = useState(0)
  const [limit, setLimit]        = useState(1)
  const [monthlyUsed, setMonthlyUsed] = useState(0)
  const [monthlyLimit, setMonthlyLimit] = useState(30)
  const [logs, setLogs]          = useState<LogEntry[]>([])
  const [logToday, setLogToday]  = useState('')
  const [logWeekStart, setLogWeekStart]   = useState('')
  const [logMonthStart, setLogMonthStart] = useState('')
  const [dragging, setDragging]  = useState(false)
  const [disclosureAccepted, setDisclosureAccepted] = useState<boolean | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Sync language with body class
  useEffect(() => {
    function sync() { setLang(getLang()) }
    sync()
    window.addEventListener('aqslim-lang', sync)
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => { window.removeEventListener('aqslim-lang', sync); observer.disconnect() }
  }, [])

  // Load today's usage + monthly log history on mount
  useEffect(() => {
    setDisclosureAccepted(localStorage.getItem(DISCLOSURE_KEY) === 'accepted')
  }, [])

  useEffect(() => {
    fetch('/api/food-scan')
      .then(r => r.json())
      .then(d => {
        setUsed(d.used ?? 0)
        setLimit(d.limit ?? 1)
        setMonthlyUsed(d.monthlyUsed ?? 0)
        setMonthlyLimit(d.monthlyLimit ?? 30)
        setLogs(d.logs ?? [])
        setLogToday(d.today ?? '')
        setLogWeekStart(d.weekStart ?? '')
        setLogMonthStart(d.monthStart ?? '')
      })
      .catch(() => {})
  }, [])

  const t = COPY[lang]

  async function loadFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError(t.imageError)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t.sizeError)
      return
    }
    setError(null)
    setResult(null)
    try {
      const optimized = await optimizeImage(file)
      setMimeType(optimized.mimeType)
      setImage(optimized.dataUrl)
    } catch {
      setError(t.imageError)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) void loadFile(file)
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
          const period = data.period === 'month' ? 'month' : 'day'
          const periodLimit = period === 'month' ? data.monthlyLimit : data.limit
          setError(t.limitError(periodLimit, t.plans[typedPlan], period))
          setUsed(data.used ?? data.limit)   // disable button immediately
          setLimit(data.limit ?? limit)
          setMonthlyUsed(data.monthlyUsed ?? monthlyUsed)
          setMonthlyLimit(data.monthlyLimit ?? monthlyLimit)
        } else {
          setError(t.failError)
        }
        return
      }

      setResult(data)
      setUsed(data.used)
      setMonthlyUsed(data.monthlyUsed)
      setMonthlyLimit(data.monthlyLimit)
      setLogs(prev => [{
        id:          Date.now().toString(),
        createdTime: new Date().toISOString(),
        fields: {
          'Food Description': data.food,
          'Calories':         data.calories,
          'Carbs (g)':        data.carbs,
          'Fats (g)':         data.fats,
          'Proteins (g)':     data.proteins,
          'Date':             logToday || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date()),
          'Timestamp':        new Date().toISOString(),
          'Meal Type':        mealType,
        },
      }, ...prev])
    } catch {
      setError(t.networkError)
    } finally {
      setScanning(false)
    }
  }

  const remaining = Math.min(limit - used, monthlyLimit - monthlyUsed)
  const pct = (val: number, total: number) => total > 0 ? Math.min(100, Math.round((val / total) * 100)) : 0

  return (
    <div className="fs-page">
      {/* Header */}
      <header className="fs-header">
        <div className="fs-header-inner">
          <div>
            <div className="fs-logo">AQ<span>SLIM</span></div>
            <div className="fs-header-sub">{t.sub}</div>
          </div>
          <div className="fs-header-right">
            <Link href="/dashboard" className="fs-nav-link">{t.dashboard}</Link>
            <Link href="/" className="fs-nav-link">{t.home}</Link>
            <div className="fs-plan-badge">{t.plans[typedPlan]}</div>
          </div>
        </div>
      </header>

      {disclosureAccepted === false && (
        <div className="fs-disclosure-backdrop" role="presentation">
          <section className="fs-disclosure" role="dialog" aria-modal="true" aria-labelledby="food-scan-disclosure-title">
            <div className="fs-disclosure-mark" aria-hidden="true">AQ</div>
            <h1 id="food-scan-disclosure-title">{t.disclosureTitle}</h1>
            <p>{t.disclosureBody}</p>
            <p className="fs-disclosure-detail">{t.disclosureDetail}</p>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem(DISCLOSURE_KEY, 'accepted')
                setDisclosureAccepted(true)
              }}
            >
              {t.disclosureAccept}
            </button>
          </section>
        </div>
      )}

      <main className="fs-main">
        {/* Usage bar */}
        <div className="fs-usage-bar">
          <span className="fs-usage-label">{t.usage(userName)}</span>
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
            {remaining > 0 ? t.remaining(remaining) : t.limitReached}
          </span>
        </div>
        <div className="fs-monthly-usage">{t.monthlyUsage(monthlyUsed, monthlyLimit)}</div>

        <div className="fs-grid">
          {/* Upload panel */}
          <div className="fs-card">
            <div className="fs-card-title">{t.uploadTitle}</div>

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
                  <div className="fs-drop-text">{t.dropText}</div>
                  <div className="fs-drop-hint">{t.dropHint}</div>
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) void loadFile(f) }}
            />

            <div className="fs-meal-type-row">
              {(['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Other'] as const).map(mt => (
                <button
                  key={mt}
                  className={`fs-meal-type-btn ${mealType === mt ? 'active' : ''}`}
                  onClick={() => setMealType(mt)}
                  type="button"
                >
                  {t.mealTypes[mt]}
                </button>
              ))}
            </div>

            <div className="fs-btn-row">
              {image && (
                <button
                  className="fs-btn-secondary"
                  onClick={() => { setImage(null); setResult(null); setError(null) }}
                >
                  {t.clear}
                </button>
              )}
              <button
                className="fs-btn-primary"
                onClick={analyze}
                disabled={!image || scanning || remaining <= 0}
              >
                {scanning ? t.analyzing : t.analyze}
              </button>
            </div>

            {error && <div className="fs-error">{error}</div>}
          </div>

          {/* Results panel */}
          {result ? (
            <div className="fs-card fs-result-card">
              <div className="fs-card-title">{t.nutritionTitle}</div>
              <div className="fs-food-name">{result.food}</div>

              <div className="fs-calories-row">
                <div className="fs-calories-num">{result.calories}</div>
                <div className="fs-calories-label">{t.kcal}</div>
              </div>

              <div className="fs-macros">
                <MacroBar label={t.carbs}   value={result.carbs}    color="#C9A84C" max={Math.max(result.carbs, result.fats, result.proteins)} />
                <MacroBar label={t.fats}    value={result.fats}     color="#9A9590" max={Math.max(result.carbs, result.fats, result.proteins)} />
                <MacroBar label={t.protein} value={result.proteins} color="#E2C87A" max={Math.max(result.carbs, result.fats, result.proteins)} />
              </div>

              <div className="fs-macro-totals">
                <MacroChip label="C" value={result.carbs}    color="#C9A84C" />
                <MacroChip label="F" value={result.fats}     color="#9A9590" />
                <MacroChip label="P" value={result.proteins} color="#E2C87A" />
              </div>

              {result.notes && (
                <div className="fs-notes">{result.notes}</div>
              )}
              <div className="fs-estimate-notice">{t.estimateNotice}</div>

              <div className="fs-ratio-row">
                {[
                  { label: t.carbs,   pct: pct(result.carbs,    result.carbs + result.fats + result.proteins), color: '#C9A84C' },
                  { label: t.fats,    pct: pct(result.fats,     result.carbs + result.fats + result.proteins), color: '#9A9590' },
                  { label: t.protein, pct: pct(result.proteins, result.carbs + result.fats + result.proteins), color: '#E2C87A' },
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
              <div className="fs-placeholder-text">{t.placeholder}</div>
            </div>
          )}
        </div>

        {/* Meal log with period tabs */}
        {logToday && (
          <div className="fs-log-section">
            <FoodLogWidget
              logs={logs}
              today={logToday}
              weekStart={logWeekStart}
              monthStart={logMonthStart}
              lang={lang}
            />
          </div>
        )}

        {/* Upgrade prompt for free users */}
        {typedPlan === 'free' && (
          <div className="fs-upgrade-banner">
            <div className="fs-upgrade-text">
              <strong>{t.wantMore}</strong> {t.upgradeText}
            </div>
            <a href="/#food-scanner" className="fs-upgrade-btn">{t.viewPlans}</a>
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
