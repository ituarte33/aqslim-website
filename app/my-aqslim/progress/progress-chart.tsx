import type { PortalMeasurement } from '@/lib/patient-portal'
import styles from '../portal.module.css'

type Props = {
  measurements: PortalMeasurement[]
  language: 'es' | 'en'
  unit: 'lb' | 'kg'
}

function formatShortDate(value: string, language: 'es' | 'en') {
  return new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

export function ProgressChart({ measurements, language, unit }: Props) {
  const visible = measurements.slice(-8)
  if (visible.length < 2) {
    return (
      <div className={styles.emptyChart}>
        {language === 'es'
          ? 'La tendencia aparecerá después de registrar al menos dos mediciones.'
          : 'Your trend will appear after at least two measurements are recorded.'}
      </div>
    )
  }

  const weights = visible.map(item => item.weight)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = Math.max(max - min, 2)
  const paddedMin = min - range * 0.22
  const paddedMax = max + range * 0.22
  const left = 38
  const right = 562
  const top = 22
  const bottom = 190

  const points = visible.map((item, index) => {
    const x = left + (index / (visible.length - 1)) * (right - left)
    const y = top + ((paddedMax - item.weight) / (paddedMax - paddedMin)) * (bottom - top)
    return { ...item, x, y }
  })
  const polyline = points.map(point => `${point.x},${point.y}`).join(' ')
  const area = `${left},${bottom} ${polyline} ${right},${bottom}`
  const last = points.at(-1)!

  return (
    <div className={styles.chartWrap}>
      <svg viewBox="0 0 600 240" role="img" aria-label={language === 'es' ? 'Tendencia de peso' : 'Weight trend'}>
        <defs>
          <linearGradient id="progressArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d9a928" stopOpacity=".28" />
            <stop offset="1" stopColor="#d9a928" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map(index => {
          const y = top + (index / 3) * (bottom - top)
          const value = paddedMax - (index / 3) * (paddedMax - paddedMin)
          return (
            <g key={index}>
              <line x1={left} y1={y} x2={right} y2={y} className={styles.chartGrid} />
              <text x="0" y={y + 5} className={styles.chartLabel}>{Math.round(value)}</text>
            </g>
          )
        })}
        <polygon points={area} fill="url(#progressArea)" />
        <polyline points={polyline} className={styles.chartLine} />
        {points.map(point => (
          <g key={point.id}>
            <circle cx={point.x} cy={point.y} r="5.5" className={styles.chartPoint} />
            <text x={point.x} y="218" textAnchor="middle" className={styles.chartLabel}>
              {formatShortDate(point.date, language)}
            </text>
          </g>
        ))}
        <g transform={`translate(${Math.min(last.x - 32, 505)} ${Math.max(last.y - 48, 4)})`}>
          <rect width="72" height="34" rx="9" className={styles.chartTag} />
          <text x="36" y="22" textAnchor="middle" className={styles.chartTagText}>
            {Math.round(last.weight * 10) / 10} {unit}
          </text>
        </g>
      </svg>
    </div>
  )
}
